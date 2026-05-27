/**
 * Integration tests — Story 4.3 AC1, AC2: RLS via 4 aggregation views +
 * 2 helper functions (security_invoker=true + SECURITY INVOKER STABLE).
 *
 * 16 scenarios (Task 6.3 a-p):
 *   a) owner SELECT via link_clicks_7d — alice vê rows próprias (2-hop JOIN passa)
 *   b) non-owner SELECT via link_clicks_7d bloqueado — bob recebe 0 rows
 *   c) anonymous SELECT via link_clicks_7d bloqueado — anon recebe 0 rows
 *   d) owner SELECT via page_views_7d — alice vê rows (1-hop JOIN)
 *   e) non-owner SELECT via page_views_7d bloqueado
 *   f) anonymous SELECT via page_views_7d bloqueado
 *   j) sanity owner SELECT via link_clicks_30d
 *   k) sanity owner SELECT via page_views_30d
 *   l) owner RPC get_page_views_series — rows visíveis
 *   m) non-owner RPC get_page_views_series — 0 rows
 *   n) anonymous RPC get_page_views_series — 0 rows
 *   o) owner/non-owner/anon RPC get_link_clicks_series (3 sub-cenários compactos)
 *   p) CRÍTICO — security_invoker=true realmente aplicado (admin bypassa RLS,
 *      alice respeita RLS — conjuntos DEVEM diferir)
 *
 * Substrate: `biolink-dev`. Fixtures mínimas (3 click_events hoje em
 * aliceLink + 2 page_views hoje em alicePage + 2 events do bob para garantir
 * que admin "vê tudo" no cenário (p)).
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

const HASH_32_A = '\\x' + 'a'.repeat(64);

describe('RLS: 4 aggregation views + 2 helpers (Story 4.3 AC1/AC2)', () => {
  let sessions: { alice: TestSession; bob: TestSession };
  let alicePageId: string;
  let bobPageId: string;
  let aliceLinkId: string;
  let bobLinkId: string;

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

    // 1 link por usuário, position alta para não colidir com seed
    const aliceLink = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'rls-agg-test-alice',
        url: 'https://alice.com',
        position: 997,
      })
      .select('id')
      .single();
    expect(aliceLink.error).toBeNull();
    aliceLinkId = aliceLink.data!.id;

    const bobLink = await admin
      .from('links')
      .insert({
        page_id: bobPageId,
        title: 'rls-agg-test-bob',
        url: 'https://bob.com',
        position: 997,
      })
      .select('id')
      .single();
    expect(bobLink.error).toBeNull();
    bobLinkId = bobLink.data!.id;

    // Fixtures (Task 6.2): só "today" — RLS independe da janela.
    await admin.from('click_events').insert([
      { link_id: aliceLinkId, ip_hash: HASH_32_A },
      { link_id: aliceLinkId, ip_hash: HASH_32_A },
      { link_id: aliceLinkId, ip_hash: HASH_32_A },
      { link_id: bobLinkId, ip_hash: HASH_32_A },
      { link_id: bobLinkId, ip_hash: HASH_32_A },
    ]);
    await admin.from('page_views').insert([
      { page_id: alicePageId, ip_hash: HASH_32_A },
      { page_id: alicePageId, ip_hash: HASH_32_A },
      { page_id: bobPageId, ip_hash: HASH_32_A },
    ]);
  }, 60_000);

  afterAll(async () => {
    await admin.from('click_events').delete().eq('link_id', aliceLinkId);
    await admin.from('click_events').delete().eq('link_id', bobLinkId);
    await admin.from('page_views').delete().eq('page_id', alicePageId);
    await admin.from('page_views').delete().eq('page_id', bobPageId);
    await admin.from('links').delete().in('id', [aliceLinkId, bobLinkId]);
    await cleanupTestUsers();
  }, 60_000);

  // ---------------------------------------------------------------------------
  // (a) owner SELECT via link_clicks_7d
  // ---------------------------------------------------------------------------
  it('(a) owner SELECT link_clicks_7d — alice vê suas rows agregadas', async () => {
    const { data, error } = await sessions.alice.client
      .from('link_clicks_7d')
      .select('*')
      .eq('link_id', aliceLinkId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    expect(sum).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // (b) non-owner SELECT bloqueado — link_clicks_7d
  // ---------------------------------------------------------------------------
  it('(b) non-owner SELECT link_clicks_7d — bob recebe 0 rows agregando alice', async () => {
    const { data, error } = await sessions.bob.client
      .from('link_clicks_7d')
      .select('*')
      .eq('link_id', aliceLinkId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // (c) anonymous SELECT bloqueado — link_clicks_7d
  // ---------------------------------------------------------------------------
  it('(c) anonymous SELECT link_clicks_7d — anon recebe 0 rows', async () => {
    const { data, error } = await anon
      .from('link_clicks_7d')
      .select('*')
      .eq('link_id', aliceLinkId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // (d) owner SELECT via page_views_7d
  // ---------------------------------------------------------------------------
  it('(d) owner SELECT page_views_7d — alice vê suas rows agregadas (1-hop)', async () => {
    const { data, error } = await sessions.alice.client
      .from('page_views_7d')
      .select('*')
      .eq('page_id', alicePageId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    expect(sum).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // (e) non-owner SELECT bloqueado — page_views_7d
  // ---------------------------------------------------------------------------
  it('(e) non-owner SELECT page_views_7d — bob recebe 0 rows agregando alice', async () => {
    const { data, error } = await sessions.bob.client
      .from('page_views_7d')
      .select('*')
      .eq('page_id', alicePageId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // (f) anonymous SELECT bloqueado — page_views_7d
  // ---------------------------------------------------------------------------
  it('(f) anonymous SELECT page_views_7d — anon recebe 0 rows', async () => {
    const { data, error } = await anon.from('page_views_7d').select('*').eq('page_id', alicePageId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // (j) sanity — owner SELECT link_clicks_30d
  // ---------------------------------------------------------------------------
  it('(j) owner SELECT link_clicks_30d — sanity (security_invoker é por-view)', async () => {
    const { data, error } = await sessions.alice.client
      .from('link_clicks_30d')
      .select('*')
      .eq('link_id', aliceLinkId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    expect(sum).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // (k) sanity — owner SELECT page_views_30d
  // ---------------------------------------------------------------------------
  it('(k) owner SELECT page_views_30d — sanity', async () => {
    const { data, error } = await sessions.alice.client
      .from('page_views_30d')
      .select('*')
      .eq('page_id', alicePageId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    expect(sum).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // (l) owner RPC get_page_views_series
  // ---------------------------------------------------------------------------
  it('(l) owner RPC get_page_views_series — alice vê sua série temporal', async () => {
    const { data, error } = await sessions.alice.client.rpc('get_page_views_series', {
      p_page_id: alicePageId,
      p_days: 7,
    });

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    const sum = data!.reduce((acc, r) => acc + r.count, 0);
    expect(sum).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // (m) non-owner RPC bloqueado — get_page_views_series
  // ---------------------------------------------------------------------------
  it('(m) non-owner RPC get_page_views_series — bob recebe 0 rows', async () => {
    const { data, error } = await sessions.bob.client.rpc('get_page_views_series', {
      p_page_id: alicePageId,
      p_days: 7,
    });

    // PostgREST + SECURITY INVOKER + RLS: tipicamente 0 rows sem erro.
    // Aceitar tanto erro de policy quanto data vazio (DEV — Task 6.4 hedge).
    if (error) {
      expect(error.message).toMatch(/policy|permission|denied|42501|row-level/i);
    } else {
      expect(data).toHaveLength(0);
    }
  });

  // ---------------------------------------------------------------------------
  // (n) anonymous RPC bloqueado — get_page_views_series
  // ---------------------------------------------------------------------------
  it('(n) anonymous RPC get_page_views_series — anon recebe 0 rows', async () => {
    const { data, error } = await anon.rpc('get_page_views_series', {
      p_page_id: alicePageId,
      p_days: 7,
    });

    if (error) {
      expect(error.message).toMatch(/policy|permission|denied|42501|row-level/i);
    } else {
      expect(data).toHaveLength(0);
    }
  });

  // ---------------------------------------------------------------------------
  // (o) get_link_clicks_series — owner OK + non-owner/anon 0 rows
  // ---------------------------------------------------------------------------
  it('(o) RPC get_link_clicks_series — alice OK; bob e anon recebem 0 rows', async () => {
    // owner
    const ownerR = await sessions.alice.client.rpc('get_link_clicks_series', {
      p_link_id: aliceLinkId,
      p_days: 7,
    });
    expect(ownerR.error).toBeNull();
    expect(ownerR.data!.length).toBeGreaterThanOrEqual(1);
    const ownerSum = ownerR.data!.reduce((acc, r) => acc + r.count, 0);
    expect(ownerSum).toBe(3);

    // non-owner
    const nonOwnerR = await sessions.bob.client.rpc('get_link_clicks_series', {
      p_link_id: aliceLinkId,
      p_days: 7,
    });
    if (nonOwnerR.error) {
      expect(nonOwnerR.error.message).toMatch(/policy|permission|denied|42501|row-level/i);
    } else {
      expect(nonOwnerR.data).toHaveLength(0);
    }

    // anon
    const anonR = await anon.rpc('get_link_clicks_series', {
      p_link_id: aliceLinkId,
      p_days: 7,
    });
    if (anonR.error) {
      expect(anonR.error.message).toMatch(/policy|permission|denied|42501|row-level/i);
    } else {
      expect(anonR.data).toHaveLength(0);
    }
  });

  // ---------------------------------------------------------------------------
  // (p) CRÍTICO — security_invoker=true realmente aplicado
  // ---------------------------------------------------------------------------
  // Valida que sem security_invoker, alice receberia o mesmo conjunto que admin
  // (bypass RLS). Se admin e alice retornam o MESMO conjunto, security_invoker
  // está INCORRETO. Esperado: admin >= alice + bob; alice apenas alice.
  it('(p) CRÍTICO — admin vê rows da alice E bob; alice vê apenas suas (RLS via security_invoker)', async () => {
    // admin (service-role) — bypass RLS, vê todos os events nas views
    const adminLinkRows = await admin
      .from('link_clicks_7d')
      .select('*')
      .in('link_id', [aliceLinkId, bobLinkId]);
    expect(adminLinkRows.error).toBeNull();
    const adminLinkIdsSeen = new Set(adminLinkRows.data!.map((r) => r.link_id));
    expect(adminLinkIdsSeen.has(aliceLinkId)).toBe(true);
    expect(adminLinkIdsSeen.has(bobLinkId)).toBe(true);

    // alice — RLS aplica, vê apenas seus
    const aliceLinkRows = await sessions.alice.client
      .from('link_clicks_7d')
      .select('*')
      .in('link_id', [aliceLinkId, bobLinkId]);
    expect(aliceLinkRows.error).toBeNull();
    const aliceLinkIdsSeen = new Set(aliceLinkRows.data!.map((r) => r.link_id));
    expect(aliceLinkIdsSeen.has(aliceLinkId)).toBe(true);
    expect(aliceLinkIdsSeen.has(bobLinkId)).toBe(false);

    // CRÍTICO — conjuntos DEVEM ser diferentes (admin vê 2 link_ids; alice 1)
    expect(adminLinkIdsSeen.size).toBeGreaterThan(aliceLinkIdsSeen.size);

    // Mesmo princípio em page_views_7d
    const adminPvRows = await admin
      .from('page_views_7d')
      .select('*')
      .in('page_id', [alicePageId, bobPageId]);
    expect(adminPvRows.error).toBeNull();
    const adminPageIdsSeen = new Set(adminPvRows.data!.map((r) => r.page_id));
    expect(adminPageIdsSeen.has(alicePageId)).toBe(true);
    expect(adminPageIdsSeen.has(bobPageId)).toBe(true);

    const alicePvRows = await sessions.alice.client
      .from('page_views_7d')
      .select('*')
      .in('page_id', [alicePageId, bobPageId]);
    expect(alicePvRows.error).toBeNull();
    const alicePageIdsSeen = new Set(alicePvRows.data!.map((r) => r.page_id));
    expect(alicePageIdsSeen.has(alicePageId)).toBe(true);
    expect(alicePageIdsSeen.has(bobPageId)).toBe(false);

    expect(adminPageIdsSeen.size).toBeGreaterThan(alicePageIdsSeen.size);
  });
});
