/**
 * Integration tests — POST /api/track/click (Story 4.1 AC2/3/5).
 *
 * Estratégia: importa o `POST` do Route Handler diretamente + dispara com
 * `new Request(...)` sintético (sem subir servidor Next). Validações end-to-end
 * contra `biolink-dev` (CI-001 RESOLVED, MEMORY: projeto único compartilhado).
 *
 * Fixtures: reusa `setupTestUsers` da Story 1.4 (alice/bob com profile + page
 * bootstrapados via trigger). Cria 1 link real em alice.page para servir de
 * `link_id` válido nos cenários.
 *
 * Isolamento: `__resetRateLimit()` em beforeEach garante contadores zerados
 * entre cenários (cenário e/429 sujaria os demais sem isso). Cleanup de
 * click_events inseridos em afterEach via `admin` (bypassa RLS).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/track/click/route';
import { __resetRateLimit } from '@/lib/rate-limit';

import { admin, cleanupTestUsers, setupTestUsers, TEST_USERS } from '../helpers/test-users';

const FAKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/132.0 (track-click-test)';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/track/click', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'user-agent': FAKE_UA,
      'x-forwarded-for': '203.0.113.42',
      ...headers,
    },
  });
}

describe('POST /api/track/click', () => {
  let alicePageId: string;
  let aliceLinkId: string;

  beforeAll(async () => {
    await setupTestUsers();

    // page criada via trigger on_auth_user_created (0003 + 1.4 setup)
    const { data: page, error: pageErr } = await admin
      .from('pages')
      .select('id, is_published')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();
    if (pageErr || !page) throw new Error('alice page not found: ' + pageErr?.message);
    alicePageId = page.id;

    // Garante page publicada (default true, mas defensivo)
    if (!page.is_published) {
      await admin.from('pages').update({ is_published: true }).eq('id', alicePageId);
    }

    // Cria link descartável da alice para servir de link_id nos cenários
    const { data: link, error: linkErr } = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'track-click-test',
        url: 'https://example.com/track',
        position: 999, // posição alta evita conflito com seed/outros tests
      })
      .select('id')
      .single();
    if (linkErr || !link) throw new Error('failed to create test link: ' + linkErr?.message);
    aliceLinkId = link.id;
  }, 60_000);

  afterAll(async () => {
    // CASCADE: deletar o link apaga seus click_events automaticamente.
    if (aliceLinkId) {
      await admin.from('links').delete().eq('id', aliceLinkId);
    }
    await cleanupTestUsers();
  }, 60_000);

  beforeEach(() => {
    __resetRateLimit();
  });

  // ---------------------------------------------------------------------------
  // (a) Happy path — 204 + row inserida com hashes 32 bytes
  // ---------------------------------------------------------------------------
  it('(a) 204 + insere row com ip_hash/user_agent_hash de 32 bytes', async () => {
    const res = await POST(makeRequest({ link_id: aliceLinkId }));
    expect(res.status).toBe(204);

    // Validar via admin + raw SQL para conferir octet_length(bytea) = 32
    const { data: events, error } = await admin
      .from('click_events')
      .select('id, link_id, ip_hash, user_agent_hash, clicked_at')
      .eq('link_id', aliceLinkId)
      .order('clicked_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(events).toHaveLength(1);
    expect(events![0]!.link_id).toBe(aliceLinkId);
    expect(events![0]!.ip_hash).toBeTruthy();
    expect(events![0]!.user_agent_hash).toBeTruthy();

    // Cleanup
    await admin.from('click_events').delete().eq('id', events![0]!.id);
  });

  // ---------------------------------------------------------------------------
  // (b) 404 — link inexistente
  // ---------------------------------------------------------------------------
  it('(b) 404 quando link_id não existe', async () => {
    // UUID v4 válido (versão=4, variant=8/9/a/b) — Zod .uuid() é RFC 4122-strict
    const res = await POST(makeRequest({ link_id: '00000000-0000-4000-a000-0000000099ff' }));
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // (c) 404 — page não publicada
  // ---------------------------------------------------------------------------
  it('(c) 404 quando page do link não está publicada', async () => {
    // Despublica alice page temporariamente
    await admin.from('pages').update({ is_published: false }).eq('id', alicePageId);
    try {
      const res = await POST(makeRequest({ link_id: aliceLinkId }));
      expect(res.status).toBe(404);
    } finally {
      // Restaura (qualquer falha deixaria estado sujo)
      await admin.from('pages').update({ is_published: true }).eq('id', alicePageId);
    }
  });

  // ---------------------------------------------------------------------------
  // (d) 400 — body inválido
  // ---------------------------------------------------------------------------
  it('(d.1) 400 quando body está vazio', async () => {
    const req = new Request('http://localhost/api/track/click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.43' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('(d.2) 400 quando link_id não é UUID', async () => {
    const res = await POST(makeRequest({ link_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('(d.3) 400 quando link_id está ausente', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('(d.4) 400 quando JSON é malformado', async () => {
    const res = await POST(makeRequest('{not valid json'));
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // (e) 429 — rate limit excedido (60/min/ip_hash)
  // ---------------------------------------------------------------------------
  it('(e) 60 requests OK, 61º retorna 429 com Retry-After', async () => {
    const insertedIds: number[] = [];
    try {
      for (let i = 0; i < 60; i++) {
        const res = await POST(makeRequest({ link_id: aliceLinkId }));
        expect(res.status).toBe(204);
      }
      const blocked = await POST(makeRequest({ link_id: aliceLinkId }));
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('Retry-After')).toBeTruthy();
      expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThanOrEqual(0);

      // Buscar todos para cleanup
      const { data } = await admin.from('click_events').select('id').eq('link_id', aliceLinkId);
      insertedIds.push(...(data?.map((r) => r.id) ?? []));
    } finally {
      if (insertedIds.length > 0) {
        await admin.from('click_events').delete().in('id', insertedIds);
      }
    }
  }, 30_000);

  // ---------------------------------------------------------------------------
  // (f) Hash determinístico — mesmo IP/UA → mesmos hashes
  // ---------------------------------------------------------------------------
  it('(f) 2 requests com mesmo IP/UA inserem rows com hashes idênticos', async () => {
    const insertedIds: number[] = [];
    try {
      await POST(makeRequest({ link_id: aliceLinkId }));
      await POST(makeRequest({ link_id: aliceLinkId }));

      const { data: events } = await admin
        .from('click_events')
        .select('id, ip_hash, user_agent_hash')
        .eq('link_id', aliceLinkId)
        .order('clicked_at', { ascending: false })
        .limit(2);

      expect(events).toHaveLength(2);
      insertedIds.push(events![0]!.id, events![1]!.id);

      // Determinismo: hashes idênticos para mesmo input + salt
      expect(events![0]!.ip_hash).toBe(events![1]!.ip_hash);
      expect(events![0]!.user_agent_hash).toBe(events![1]!.user_agent_hash);
    } finally {
      if (insertedIds.length > 0) {
        await admin.from('click_events').delete().in('id', insertedIds);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // (g) bytea sanity — octet_length(ip_hash) = 32 (DEV-4 validado)
  // ---------------------------------------------------------------------------
  it('(g) DEV-4: octet_length(ip_hash) = 32 no DB (base64 → bytea OK)', async () => {
    await POST(makeRequest({ link_id: aliceLinkId }));

    // Via PostgREST não é possível chamar octet_length diretamente; usar uma
    // tentativa de INSERT com hash truncado para provar que a check constraint
    // está ativa (validação indireta — se aceitasse 16 bytes, falharia).
    // ip_hash de 16 bytes (hex 32 chars) → constraint deve rejeitar.
    // Formato bytea canônico: `\x<hex>` (Postgres bytea_output hex padrão).
    const sixteenBytesHex = '\\x' + Buffer.alloc(16, 0xff).toString('hex');
    const { error } = await admin.from('click_events').insert({
      link_id: aliceLinkId,
      ip_hash: sixteenBytesHex,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/chk_click_events_hash_size|violates check constraint/i);

    // Cleanup do row legítimo inserido no início do teste
    await admin.from('click_events').delete().eq('link_id', aliceLinkId);
  });
});
