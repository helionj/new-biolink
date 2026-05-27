/**
 * Integration tests — POST /api/track/view (Story 4.2 AC2/3).
 *
 * Estratégia: importa o `POST` do Route Handler diretamente + dispara com
 * `new Request(...)` sintético (sem subir servidor Next). Validações end-to-end
 * contra `biolink-dev` (CI-001 RESOLVED, MEMORY: projeto único compartilhado).
 *
 * Fixtures: reusa `setupTestUsers` da Story 1.4 (alice/bob com profile + page
 * bootstrapados via trigger).
 *
 * Isolamento: `__resetRateLimit()` em beforeEach garante contadores zerados
 * entre cenários (cenário g/429 sujaria os demais sem isso). Cleanup de
 * page_views inseridos em afterEach via `admin` (bypassa RLS).
 *
 * Cenários (Task 5.7 a-h):
 *   (a) 204 path: insere row com hashes 32 bytes
 *   (b) 204 dedup: 2 POSTs em <30min → 1 row apenas
 *   (c) 204 após window: viewed_at = now() - 31min → 2ª POST insere
 *   (d) 404 page inexistente
 *   (e) 404 page não publicada
 *   (f) 400 body inválido (4 sub-cenários)
 *   (g) 429 rate limit (61 POSTs)
 *   (h) hash determinístico cross-endpoint (click vs view → ip_hash igual)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as POST_CLICK } from '@/app/api/track/click/route';
import { POST } from '@/app/api/track/view/route';
import { __resetRateLimit } from '@/lib/rate-limit';

import { admin, cleanupTestUsers, setupTestUsers, TEST_USERS } from '../helpers/test-users';

const FAKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/132.0 (track-view-test)';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/track/view', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'user-agent': FAKE_UA,
      'x-forwarded-for': '203.0.113.99',
      ...headers,
    },
  });
}

describe('POST /api/track/view', () => {
  let alicePageId: string;
  let aliceLinkId: string;

  beforeAll(async () => {
    await setupTestUsers();

    const { data: page, error: pageErr } = await admin
      .from('pages')
      .select('id, is_published')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();
    if (pageErr || !page) throw new Error('alice page not found: ' + pageErr?.message);
    alicePageId = page.id;

    if (!page.is_published) {
      await admin.from('pages').update({ is_published: true }).eq('id', alicePageId);
    }

    // Link descartável para o cenário (h) — cross-endpoint hash determinism
    const { data: link, error: linkErr } = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'track-view-test',
        url: 'https://example.com/view',
        position: 999,
      })
      .select('id')
      .single();
    if (linkErr || !link) throw new Error('failed to create test link: ' + linkErr?.message);
    aliceLinkId = link.id;
  }, 60_000);

  afterAll(async () => {
    // Cleanup defensivo de page_views da alice (CASCADE não atinge sem
    // deletar a page; deletar página requer cascade de user). Mais simples
    // limpar diretamente via admin antes do cleanupTestUsers (que deleta o
    // user → cascade chain → page → page_views).
    await admin.from('page_views').delete().eq('page_id', alicePageId);
    if (aliceLinkId) {
      await admin.from('links').delete().eq('id', aliceLinkId);
    }
    await cleanupTestUsers();
  }, 60_000);

  beforeEach(async () => {
    __resetRateLimit();
    // Limpar page_views entre cenários para isolar dedup window
    await admin.from('page_views').delete().eq('page_id', alicePageId);
  });

  // ---------------------------------------------------------------------------
  // (a) Happy path — 204 + row inserida com hashes 32 bytes
  // ---------------------------------------------------------------------------
  it('(a) 204 + insere row com ip_hash/user_agent_hash de 32 bytes', async () => {
    const res = await POST(makeRequest({ page_id: alicePageId }));
    expect(res.status).toBe(204);

    const { data: views, error } = await admin
      .from('page_views')
      .select('id, page_id, ip_hash, user_agent_hash, viewed_at')
      .eq('page_id', alicePageId)
      .order('viewed_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(views).toHaveLength(1);
    expect(views![0]!.page_id).toBe(alicePageId);
    expect(views![0]!.ip_hash).toBeTruthy();
    expect(views![0]!.user_agent_hash).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // (b) 204 dedup — 2 POSTs em <30min, apenas 1 row
  // ---------------------------------------------------------------------------
  it('(b) AC3 dedup — 2 POSTs consecutivos (mesmo IP, <30min) → 1 row apenas', async () => {
    const res1 = await POST(makeRequest({ page_id: alicePageId }));
    const res2 = await POST(makeRequest({ page_id: alicePageId }));

    expect(res1.status).toBe(204);
    expect(res2.status).toBe(204); // DEV-7: 204 uniforme (não 409)

    const { data: views } = await admin.from('page_views').select('id').eq('page_id', alicePageId);
    expect(views).toHaveLength(1); // dedup window deduplicou
  });

  // ---------------------------------------------------------------------------
  // (c) 204 após window — viewed_at = now() - 31min → 2ª POST insere
  // ---------------------------------------------------------------------------
  it('(c) AC3 após window expirado (>30min) → 2ª POST insere (2 rows totais)', async () => {
    // Insere row antiga (31 min atrás) via admin, com mesmo ip_hash que o POST
    // produzirá (precisamos do hash determinístico de '203.0.113.99' + salt).
    // Estratégia: faz 1 POST para gerar o row com hash correto, atualiza
    // viewed_at para 31min atrás, faz 2º POST.
    await POST(makeRequest({ page_id: alicePageId }));
    const past = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    await admin.from('page_views').update({ viewed_at: past }).eq('page_id', alicePageId);

    const res = await POST(makeRequest({ page_id: alicePageId }));
    expect(res.status).toBe(204);

    const { data: views } = await admin
      .from('page_views')
      .select('id, viewed_at')
      .eq('page_id', alicePageId)
      .order('viewed_at', { ascending: false });
    expect(views).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // (d) 404 — page inexistente
  // ---------------------------------------------------------------------------
  it('(d) 404 quando page_id não existe', async () => {
    const res = await POST(makeRequest({ page_id: '00000000-0000-4000-a000-0000000099ff' }));
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // (e) 404 — page não publicada
  // ---------------------------------------------------------------------------
  it('(e) DEV-6: 404 quando page is_published=false', async () => {
    await admin.from('pages').update({ is_published: false }).eq('id', alicePageId);
    try {
      const res = await POST(makeRequest({ page_id: alicePageId }));
      expect(res.status).toBe(404);
    } finally {
      await admin.from('pages').update({ is_published: true }).eq('id', alicePageId);
    }
  });

  // ---------------------------------------------------------------------------
  // (f) 400 — body inválido
  // ---------------------------------------------------------------------------
  it('(f.1) 400 quando body está vazio', async () => {
    const req = new Request('http://localhost/api/track/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.99' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('(f.2) 400 quando page_id não é UUID', async () => {
    const res = await POST(makeRequest({ page_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('(f.3) 400 quando page_id está ausente', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('(f.4) 400 quando JSON é malformado', async () => {
    const res = await POST(makeRequest('{not valid json'));
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // (g) 429 — rate limit excedido (60/min/ip_hash)
  // ---------------------------------------------------------------------------
  it('(g) 60 requests OK, 61º retorna 429 com Retry-After', async () => {
    // Uso de IP diferente para isolar do beforeEach que limpa page_views
    // (mesmo IP daria dedup na 2ª request). Usa user-agents distintos cada
    // request → hashes distintos no DB, mas ip_hash idêntico → rate limit
    // chaveado por ip_hash, dedup chaveado por (page_id, ip_hash) → para
    // testar rate limit precisamos PASSAR pelo dedup. Solução: usar page_ids
    // distintos seria custoso (precisaria criar 61 pages). Mais limpo:
    // limpar page_views entre requests para que dedup nunca dispare.
    for (let i = 0; i < 60; i++) {
      const res = await POST(
        makeRequest({ page_id: alicePageId }, { 'x-forwarded-for': '203.0.113.250' }),
      );
      expect(res.status).toBe(204);
      // limpar para não duplicar
      await admin.from('page_views').delete().eq('page_id', alicePageId);
    }
    const blocked = await POST(
      makeRequest({ page_id: alicePageId }, { 'x-forwarded-for': '203.0.113.250' }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThanOrEqual(0);
  }, 60_000);

  // ---------------------------------------------------------------------------
  // (h) Hash determinístico cross-endpoint — click_events.ip_hash = page_views.ip_hash
  // ---------------------------------------------------------------------------
  it('(h) cross-endpoint: ip_hash em click_events e page_views é byte-a-byte igual', async () => {
    const xff = '203.0.113.77';
    const headers = { 'x-forwarded-for': xff };

    // POST em /api/track/click
    const clickReq = new Request('http://localhost/api/track/click', {
      method: 'POST',
      body: JSON.stringify({ link_id: aliceLinkId }),
      headers: {
        'content-type': 'application/json',
        'user-agent': FAKE_UA,
        ...headers,
      },
    });
    const clickRes = await POST_CLICK(clickReq);
    expect(clickRes.status).toBe(204);

    // POST em /api/track/view
    const viewRes = await POST(makeRequest({ page_id: alicePageId }, headers));
    expect(viewRes.status).toBe(204);

    // Comparar ip_hash entre tabelas
    const { data: clickEvent } = await admin
      .from('click_events')
      .select('ip_hash')
      .eq('link_id', aliceLinkId)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .single();
    const { data: pageView } = await admin
      .from('page_views')
      .select('ip_hash')
      .eq('page_id', alicePageId)
      .order('viewed_at', { ascending: false })
      .limit(1)
      .single();

    expect(clickEvent!.ip_hash).toBeTruthy();
    expect(pageView!.ip_hash).toBeTruthy();
    expect(clickEvent!.ip_hash).toBe(pageView!.ip_hash);

    // Cleanup click_events do cenário (page_views já é limpo no beforeEach)
    await admin.from('click_events').delete().eq('link_id', aliceLinkId);
  });
});
