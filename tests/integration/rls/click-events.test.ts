/**
 * Integration tests — Story 4.1 AC4: RLS policies on `click_events` table.
 *
 * 10 scenarios (Task 8.3 a-j):
 *   a) owner SELECT (alice via JOIN link → page → profile)
 *   b) non-owner SELECT BLOCKED (bob cannot see alice's events)
 *   c) anonymous SELECT BLOCKED (anon → 0 rows)
 *   d) owner INSERT BLOCKED (AC4 — even owner cannot insert; central validation)
 *   e) non-owner INSERT BLOCKED
 *   f) anonymous INSERT BLOCKED (defesa contra anon hitting PostgREST direto)
 *   g) owner UPDATE + DELETE BLOCKED (sem policies permissivas)
 *   h) service-role INSERT WORKS (caminho legítimo do Route Handler)
 *   i) CASCADE delete — deletar link apaga events vinculados (FK CASCADE)
 *   j) check constraint chk_click_events_hash_size — bytea != 32 bytes rejeitado
 *
 * Substrate: `biolink-dev` (CI-001 RESOLVED, MEMORY: projeto único).
 * Helper `test-users.ts` REUSE sem modificar. `click_events` é append-only —
 * cada teste insere via `admin` (bypassa RLS) e remove no `finally`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  admin,
  anon,
  cleanupTestUsers,
  setupTestUsers,
  TEST_USERS,
  type TestSession,
} from '../helpers/test-users';

// 32 bytes binário canônico em formato bytea-text `\x<hex>` (mesmo formato
// usado pelo Route Handler real, Task 6).
const HASH_32_A = '\\x' + 'a'.repeat(64);
const HASH_32_B = '\\x' + 'b'.repeat(64);

describe('RLS: click_events table (Story 4.1 AC4)', () => {
  let sessions: { alice: TestSession; bob: TestSession };
  let alicePageId: string;
  let aliceLinkId: string;

  beforeAll(async () => {
    sessions = await setupTestUsers();

    const aliceP = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();
    expect(aliceP.error).toBeNull();
    alicePageId = aliceP.data!.id;

    // Cria 1 link descartável da alice (links é user-created, não bootstrapado)
    const linkR = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'click-events-rls-test',
        url: 'https://example.com/rls',
        position: 998,
      })
      .select('id')
      .single();
    expect(linkR.error).toBeNull();
    aliceLinkId = linkR.data!.id;
  }, 60_000);

  afterAll(async () => {
    // CASCADE remove events; depois remove o link; depois cleanup de users.
    if (aliceLinkId) {
      await admin.from('links').delete().eq('id', aliceLinkId);
    }
    await cleanupTestUsers();
  }, 60_000);

  // ---------------------------------------------------------------------------
  // (a) owner SELECT
  // ---------------------------------------------------------------------------
  it('(a) owner SELECT — alice vê seus próprios events via JOIN 2-hop', async () => {
    // Insere 3 events via admin (simula Route Handler)
    const ins = await admin
      .from('click_events')
      .insert([
        { link_id: aliceLinkId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B },
        { link_id: aliceLinkId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B },
        { link_id: aliceLinkId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B },
      ])
      .select('id');
    expect(ins.error).toBeNull();
    const insertedIds = ins.data!.map((r) => r.id);

    try {
      const { data, error } = await sessions.alice.client
        .from('click_events')
        .select('id, link_id')
        .eq('link_id', aliceLinkId);

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
    } finally {
      await admin.from('click_events').delete().in('id', insertedIds);
    }
  });

  // ---------------------------------------------------------------------------
  // (b) non-owner SELECT bloqueado
  // ---------------------------------------------------------------------------
  it('(b) non-owner SELECT — bob recebe 0 rows ao tentar ler events da alice', async () => {
    const ins = await admin
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: HASH_32_A })
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    const insertedId = ins.data!.id;

    try {
      const { data, error } = await sessions.bob.client
        .from('click_events')
        .select('id, link_id')
        .eq('link_id', aliceLinkId);

      // RLS filtra silenciosamente — sem erro, 0 rows
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await admin.from('click_events').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // (c) anonymous SELECT bloqueado
  // ---------------------------------------------------------------------------
  it('(c) anonymous SELECT — anon recebe 0 rows (auth.uid() IS NULL → JOIN falha)', async () => {
    const ins = await admin
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: HASH_32_A })
      .select('id')
      .single();
    const insertedId = ins.data!.id;

    try {
      const { data, error } = await anon
        .from('click_events')
        .select('id')
        .eq('link_id', aliceLinkId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await admin.from('click_events').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // (d) owner INSERT bloqueado — CENTRAL AC4 VALIDATION
  // ---------------------------------------------------------------------------
  it('(d) AC4 central — owner INSERT bloqueado (sem policy permissiva → service-only)', async () => {
    const before = await admin
      .from('click_events')
      .select('id', { count: 'exact' })
      .eq('link_id', aliceLinkId);
    const beforeCount = before.data?.length ?? 0;

    const { error } = await sessions.alice.client
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: HASH_32_A });

    // Aceitar erro OU 0 rows (PostgREST 42501 ou silent filter)
    // — sempre validar via admin que nada foi criado.
    const after = await admin.from('click_events').select('id').eq('link_id', aliceLinkId);
    expect(after.data?.length ?? 0).toBe(beforeCount);

    if (error) {
      // O caminho mais comum é PostgREST retornar 42501 / RLS violation
      expect(error.message).toMatch(/policy|permission|denied|42501|row-level/i);
    }
  });

  // ---------------------------------------------------------------------------
  // (e) non-owner INSERT bloqueado
  // ---------------------------------------------------------------------------
  it('(e) non-owner INSERT bloqueado (bob não pode inserir event em link da alice)', async () => {
    const before = await admin.from('click_events').select('id').eq('link_id', aliceLinkId);
    const beforeCount = before.data?.length ?? 0;

    await sessions.bob.client
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: HASH_32_A });

    const after = await admin.from('click_events').select('id').eq('link_id', aliceLinkId);
    expect(after.data?.length ?? 0).toBe(beforeCount);
  });

  // ---------------------------------------------------------------------------
  // (f) anonymous INSERT bloqueado — defesa contra anon spam direto no PostgREST
  // ---------------------------------------------------------------------------
  it('(f) anonymous INSERT bloqueado (defesa contra anon spam PostgREST direto)', async () => {
    const before = await admin.from('click_events').select('id').eq('link_id', aliceLinkId);
    const beforeCount = before.data?.length ?? 0;

    await anon.from('click_events').insert({ link_id: aliceLinkId, ip_hash: HASH_32_A });

    const after = await admin.from('click_events').select('id').eq('link_id', aliceLinkId);
    expect(after.data?.length ?? 0).toBe(beforeCount);
  });

  // ---------------------------------------------------------------------------
  // (g) owner UPDATE + DELETE bloqueados (sem policies → 0 rows mutadas)
  // ---------------------------------------------------------------------------
  it('(g) owner UPDATE + DELETE bloqueados (sem policy permissiva)', async () => {
    const ins = await admin
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: HASH_32_A })
      .select('id, ip_hash')
      .single();
    const insertedId = ins.data!.id;
    const originalIpHash = ins.data!.ip_hash;

    try {
      // UPDATE
      await sessions.alice.client
        .from('click_events')
        .update({ ip_hash: null })
        .eq('id', insertedId);

      const afterUpd = await admin
        .from('click_events')
        .select('ip_hash')
        .eq('id', insertedId)
        .single();
      expect(afterUpd.data!.ip_hash).toBe(originalIpHash);

      // DELETE
      await sessions.alice.client.from('click_events').delete().eq('id', insertedId);

      const afterDel = await admin.from('click_events').select('id').eq('id', insertedId);
      expect(afterDel.data).toHaveLength(1);
    } finally {
      await admin.from('click_events').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // (h) service-role INSERT funciona — caminho legítimo do Route Handler
  // ---------------------------------------------------------------------------
  it('(h) service-role INSERT funciona (caminho legítimo Route Handler)', async () => {
    const ins = await admin
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B })
      .select('id, ip_hash, user_agent_hash')
      .single();

    expect(ins.error).toBeNull();
    expect(ins.data).toBeTruthy();
    expect(ins.data!.ip_hash).toBeTruthy();
    expect(ins.data!.user_agent_hash).toBeTruthy();

    // Cleanup
    await admin.from('click_events').delete().eq('id', ins.data!.id);
  });

  // ---------------------------------------------------------------------------
  // (i) CASCADE — deletar link apaga events
  // ---------------------------------------------------------------------------
  it('(i) CASCADE — deletar links apaga click_events vinculados (FK ON DELETE CASCADE)', async () => {
    // Cria link temporário + events
    const tempLink = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'cascade-test',
        url: 'https://example.com/cascade',
        position: 997,
      })
      .select('id')
      .single();
    const tempLinkId = tempLink.data!.id;

    await admin.from('click_events').insert([
      { link_id: tempLinkId, ip_hash: HASH_32_A },
      { link_id: tempLinkId, ip_hash: HASH_32_A },
    ]);

    const before = await admin.from('click_events').select('id').eq('link_id', tempLinkId);
    expect(before.data).toHaveLength(2);

    // Delete link — CASCADE deve remover os events
    await admin.from('links').delete().eq('id', tempLinkId);

    const after = await admin.from('click_events').select('id').eq('link_id', tempLinkId);
    expect(after.data).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // (j) check constraint chk_click_events_hash_size
  // ---------------------------------------------------------------------------
  it('(j) chk_click_events_hash_size — ip_hash de 16 bytes é rejeitado', async () => {
    const sixteen = '\\x' + 'c'.repeat(32); // 16 bytes em hex
    const { error } = await admin
      .from('click_events')
      .insert({ link_id: aliceLinkId, ip_hash: sixteen });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/chk_click_events_hash_size|check constraint/i);
  });
});
