/**
 * Integration tests — Story 4.2 AC4: RLS policies on `page_views` table.
 *
 * 10 scenarios (Task 6.3 a-j):
 *   a) owner SELECT (alice via JOIN page → profile, 1-hop)
 *   b) non-owner SELECT BLOCKED (bob cannot see alice's views)
 *   c) anonymous SELECT BLOCKED (anon → 0 rows)
 *   d) owner INSERT BLOCKED (AC4 — sem policy permissiva; central validation)
 *   e) non-owner INSERT BLOCKED
 *   f) anonymous INSERT BLOCKED (defesa contra anon hitting PostgREST direto)
 *   g) owner UPDATE + DELETE BLOCKED (sem policies permissivas)
 *   h) service-role INSERT WORKS (caminho legítimo do Route Handler / insertPageView)
 *   i) CASCADE delete — deletar user via auth.admin → views somem (chain)
 *   j) check constraint chk_page_views_hash_size — bytea != 32 bytes rejeitado
 *
 * Substrate: `biolink-dev` (CI-001 RESOLVED, MEMORY: projeto único).
 * Helper `test-users.ts` REUSE sem modificar. `page_views` é append-only —
 * cada teste insere via `admin` (bypassa RLS) e remove no `finally`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  admin,
  anon,
  cleanupTestUsers,
  setupTestUsers,
  TEST_USER_PASSWORD,
  TEST_USERS,
  type TestSession,
} from '../helpers/test-users';

// 32 bytes binário canônico em formato bytea-text `\x<hex>` (mesmo formato
// usado pelo Route Handler real, Task 5).
const HASH_32_A = '\\x' + 'a'.repeat(64);
const HASH_32_B = '\\x' + 'b'.repeat(64);

describe('RLS: page_views table (Story 4.2 AC4)', () => {
  let sessions: { alice: TestSession; bob: TestSession };
  let alicePageId: string;
  let bobPageId: string;

  beforeAll(async () => {
    sessions = await setupTestUsers();

    const aliceP = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();
    expect(aliceP.error).toBeNull();
    alicePageId = aliceP.data!.id;

    const bobP = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.bob.id)
      .single();
    expect(bobP.error).toBeNull();
    bobPageId = bobP.data!.id;
  }, 60_000);

  afterAll(async () => {
    // CASCADE remove views; depois cleanup de users.
    await admin.from('page_views').delete().eq('page_id', alicePageId);
    await admin.from('page_views').delete().eq('page_id', bobPageId);
    await cleanupTestUsers();
  }, 60_000);

  // ---------------------------------------------------------------------------
  // (a) owner SELECT
  // ---------------------------------------------------------------------------
  it('(a) owner SELECT — alice vê seus próprios views via JOIN 1-hop', async () => {
    const ins = await admin
      .from('page_views')
      .insert([
        { page_id: alicePageId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B },
        { page_id: alicePageId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B },
        { page_id: alicePageId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B },
      ])
      .select('id');
    expect(ins.error).toBeNull();
    const insertedIds = ins.data!.map((r) => r.id);

    try {
      const { data, error } = await sessions.alice.client
        .from('page_views')
        .select('id, page_id')
        .eq('page_id', alicePageId);

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
    } finally {
      await admin.from('page_views').delete().in('id', insertedIds);
    }
  });

  // ---------------------------------------------------------------------------
  // (b) non-owner SELECT bloqueado
  // ---------------------------------------------------------------------------
  it('(b) non-owner SELECT — bob recebe 0 rows ao tentar ler views da alice', async () => {
    const ins = await admin
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: HASH_32_A })
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    const insertedId = ins.data!.id;

    try {
      const { data, error } = await sessions.bob.client
        .from('page_views')
        .select('id, page_id')
        .eq('page_id', alicePageId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await admin.from('page_views').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // (c) anonymous SELECT bloqueado
  // ---------------------------------------------------------------------------
  it('(c) anonymous SELECT — anon recebe 0 rows (auth.uid() IS NULL → JOIN falha)', async () => {
    const ins = await admin
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: HASH_32_A })
      .select('id')
      .single();
    const insertedId = ins.data!.id;

    try {
      const { data, error } = await anon.from('page_views').select('id').eq('page_id', alicePageId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    } finally {
      await admin.from('page_views').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // (d) owner INSERT bloqueado — CENTRAL AC4 VALIDATION
  // ---------------------------------------------------------------------------
  it('(d) AC4 central — owner INSERT bloqueado (sem policy permissiva → service-only)', async () => {
    const before = await admin
      .from('page_views')
      .select('id', { count: 'exact' })
      .eq('page_id', alicePageId);
    const beforeCount = before.data?.length ?? 0;

    const { error } = await sessions.alice.client
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: HASH_32_A });

    const after = await admin.from('page_views').select('id').eq('page_id', alicePageId);
    expect(after.data?.length ?? 0).toBe(beforeCount);

    if (error) {
      expect(error.message).toMatch(/policy|permission|denied|42501|row-level/i);
    }
  });

  // ---------------------------------------------------------------------------
  // (e) non-owner INSERT bloqueado
  // ---------------------------------------------------------------------------
  it('(e) non-owner INSERT bloqueado (bob não pode inserir view em page da alice)', async () => {
    const before = await admin.from('page_views').select('id').eq('page_id', alicePageId);
    const beforeCount = before.data?.length ?? 0;

    await sessions.bob.client
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: HASH_32_A });

    const after = await admin.from('page_views').select('id').eq('page_id', alicePageId);
    expect(after.data?.length ?? 0).toBe(beforeCount);
  });

  // ---------------------------------------------------------------------------
  // (f) anonymous INSERT bloqueado — defesa contra anon spam direto no PostgREST
  // ---------------------------------------------------------------------------
  it('(f) anonymous INSERT bloqueado (defesa contra anon spam PostgREST direto)', async () => {
    const before = await admin.from('page_views').select('id').eq('page_id', alicePageId);
    const beforeCount = before.data?.length ?? 0;

    await anon.from('page_views').insert({ page_id: alicePageId, ip_hash: HASH_32_A });

    const after = await admin.from('page_views').select('id').eq('page_id', alicePageId);
    expect(after.data?.length ?? 0).toBe(beforeCount);
  });

  // ---------------------------------------------------------------------------
  // (g) owner UPDATE + DELETE bloqueados (sem policies → 0 rows mutadas)
  // ---------------------------------------------------------------------------
  it('(g) owner UPDATE + DELETE bloqueados (sem policy permissiva)', async () => {
    const ins = await admin
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: HASH_32_A })
      .select('id, ip_hash')
      .single();
    const insertedId = ins.data!.id;
    const originalIpHash = ins.data!.ip_hash;

    try {
      // UPDATE
      await sessions.alice.client.from('page_views').update({ ip_hash: null }).eq('id', insertedId);

      const afterUpd = await admin
        .from('page_views')
        .select('ip_hash')
        .eq('id', insertedId)
        .single();
      expect(afterUpd.data!.ip_hash).toBe(originalIpHash);

      // DELETE
      await sessions.alice.client.from('page_views').delete().eq('id', insertedId);

      const afterDel = await admin.from('page_views').select('id').eq('id', insertedId);
      expect(afterDel.data).toHaveLength(1);
    } finally {
      await admin.from('page_views').delete().eq('id', insertedId);
    }
  });

  // ---------------------------------------------------------------------------
  // (h) service-role INSERT funciona — caminho legítimo do Route Handler
  // ---------------------------------------------------------------------------
  it('(h) service-role INSERT funciona (caminho legítimo Route Handler / insertPageView)', async () => {
    const ins = await admin
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: HASH_32_A, user_agent_hash: HASH_32_B })
      .select('id, ip_hash, user_agent_hash')
      .single();

    expect(ins.error).toBeNull();
    expect(ins.data).toBeTruthy();
    expect(ins.data!.ip_hash).toBeTruthy();
    expect(ins.data!.user_agent_hash).toBeTruthy();

    await admin.from('page_views').delete().eq('id', ins.data!.id);
  });

  // ---------------------------------------------------------------------------
  // (i) CASCADE — deletar user → trigger cascade chain → page_views somem
  // ---------------------------------------------------------------------------
  it('(i) CASCADE — deletar user via auth.admin → page_views somem (cascade chain)', async () => {
    // Cria user temporário via admin API (trigger bootstrap cria profile + page)
    const tempUserId = '00000000-0000-0000-0000-000000001099';
    const tempEmail = 'cifx-cascade-test@example.com';
    const tempUsername = 'cifx-cascade-test';

    try {
      const { error: createErr } = await admin.auth.admin.createUser({
        id: tempUserId,
        email: tempEmail,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
        user_metadata: { username: tempUsername },
      });
      expect(createErr).toBeNull();

      // Trigger bootstrappa profile + page — fetch o page_id
      const { data: tempPage } = await admin
        .from('pages')
        .select('id')
        .eq('profile_id', tempUserId)
        .single();
      expect(tempPage).toBeTruthy();
      const tempPageId = tempPage!.id;

      // Inserir 2 views
      await admin.from('page_views').insert([
        { page_id: tempPageId, ip_hash: HASH_32_A },
        { page_id: tempPageId, ip_hash: HASH_32_A },
      ]);
      const before = await admin.from('page_views').select('id').eq('page_id', tempPageId);
      expect(before.data).toHaveLength(2);

      // Delete user — cascade chain auth.users → profiles → pages → page_views
      const { error: delErr } = await admin.auth.admin.deleteUser(tempUserId);
      expect(delErr).toBeNull();

      // page_views devem ter sumido
      const after = await admin.from('page_views').select('id').eq('page_id', tempPageId);
      expect(after.data).toHaveLength(0);
    } finally {
      // Defensive cleanup se algum step falhar
      await admin.auth.admin.deleteUser(tempUserId).catch(() => {});
    }
  }, 30_000);

  // ---------------------------------------------------------------------------
  // (j) check constraint chk_page_views_hash_size
  // ---------------------------------------------------------------------------
  it('(j) chk_page_views_hash_size — ip_hash de 16 bytes é rejeitado', async () => {
    const sixteen = '\\x' + 'c'.repeat(32); // 16 bytes em hex
    const { error } = await admin
      .from('page_views')
      .insert({ page_id: alicePageId, ip_hash: sixteen });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/chk_page_views_hash_size|check constraint/i);
  });
});
