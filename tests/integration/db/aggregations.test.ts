/**
 * Integration tests — Story 4.3 AC1, AC3, AC4: aggregation semantics of the
 * 4 views (link_clicks_7d/30d + page_views_7d/30d) + 2 helper functions
 * (get_link_clicks_series + get_page_views_series).
 *
 * 9 scenarios (Task 5.4-5.12):
 *   a) link_clicks_7d   — aggregation correct (alice, 2 days populated)
 *   b) link_clicks_30d  — aggregation correct (alice, 3 days populated)
 *   c) page_views_7d    — aggregation correct (alice)
 *   d) page_views_30d   — aggregation correct (alice)
 *   e) get_page_views_series(p_page_id, 7)  — equivalence to view 7d
 *   f) get_link_clicks_series(p_link_id, 30) — equivalence to view 30d (ASC order)
 *   g) get_page_views_series default p_days — DEV-4 default 7 verification
 *   h) sparse series — dia sem evento NÃO aparece (DEV-5)
 *   i) boundary >= cutoff — event exatamente no limite entra; +1h antes sai (DEV-9)
 *
 * Substrate: `biolink-dev` (single project shared dev/CI/prod).
 * Tests run via alice authenticated client (security_invoker + RLS apply) to
 * confirm the canonical user-facing path. RLS-isolation cenários ficam em
 * `tests/integration/rls/aggregations.test.ts` (Task 6).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  admin,
  cleanupTestUsers,
  setupTestUsers,
  TEST_USERS,
  type TestSession,
} from '../helpers/test-users';

// 32 bytes binário (mesmo padrão das outras suites RLS — não relevante para
// agregação, mas satisfaz chk_*_hash_size das tabelas).
const HASH_32_A = '\\x' + 'a'.repeat(64);
const HASH_32_B = '\\x' + 'b'.repeat(64);

/** Helper — retorna ISO string para "N dias atrás" (N pode ser fracionário). */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400 * 1000).toISOString();
}

describe('DB aggregations: 4 views + 2 helpers (Story 4.3)', () => {
  let sessions: { alice: TestSession; bob: TestSession };
  let alicePageId: string;
  let bobPageId: string;
  // 2 links na alice — [0] recebe seed canônico, [1] usado em (h) sparse + (i) boundary
  let aliceLink0Id: string;
  let aliceLink1Id: string;
  let bobLink0Id: string;

  beforeAll(async () => {
    sessions = await setupTestUsers();

    // Fetch pages bootstrapped pelo trigger auth_user_created
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

    // Criar 2 links na alice + 1 na bob
    const aliceLinks = await admin
      .from('links')
      .insert([
        { page_id: alicePageId, title: 'agg-test L1', url: 'https://l1.com', position: 990 },
        { page_id: alicePageId, title: 'agg-test L2', url: 'https://l2.com', position: 991 },
      ])
      .select('id');
    expect(aliceLinks.error).toBeNull();
    expect(aliceLinks.data).toHaveLength(2);
    aliceLink0Id = aliceLinks.data![0]!.id;
    aliceLink1Id = aliceLinks.data![1]!.id;

    const bobLinks = await admin
      .from('links')
      .insert({ page_id: bobPageId, title: 'agg-test B1', url: 'https://b1.com', position: 990 })
      .select('id')
      .single();
    expect(bobLinks.error).toBeNull();
    bobLink0Id = bobLinks.data!.id;

    // -----------------------------------------------------------------------
    // Seed canônico (Task 5.3)
    // -----------------------------------------------------------------------
    // click_events em aliceLink0Id:
    //   3 events @ now()         → dia "today",      count=3
    //   2 events @ now() - 3 d   → dia "today - 3",  count=2
    //   1 event  @ now() - 10 d  → dia "today - 10", count=1 (fora 7d, dentro 30d)
    //   1 event  @ now() - 40 d  → fora 7d/30d
    const aliceClickSeed = [
      ...Array.from({ length: 3 }, () => ({
        link_id: aliceLink0Id,
        ip_hash: HASH_32_A,
        user_agent_hash: HASH_32_B,
        clicked_at: daysAgo(0),
      })),
      ...Array.from({ length: 2 }, () => ({
        link_id: aliceLink0Id,
        ip_hash: HASH_32_A,
        user_agent_hash: HASH_32_B,
        clicked_at: daysAgo(3),
      })),
      {
        link_id: aliceLink0Id,
        ip_hash: HASH_32_A,
        user_agent_hash: HASH_32_B,
        clicked_at: daysAgo(10),
      },
      {
        link_id: aliceLink0Id,
        ip_hash: HASH_32_A,
        user_agent_hash: HASH_32_B,
        clicked_at: daysAgo(40),
      },
    ];
    const aliceClicksIns = await admin.from('click_events').insert(aliceClickSeed);
    expect(aliceClicksIns.error).toBeNull();

    // page_views em alicePageId:
    //   4 views @ now()           → today,     count=4
    //   2 views @ now() - 5 d     → today-5,   count=2
    //   1 view  @ now() - 20 d    → today-20,  count=1 (fora 7d, dentro 30d)
    //   1 view  @ now() - 100 d   → fora ambas
    const alicePvSeed = [
      ...Array.from({ length: 4 }, () => ({
        page_id: alicePageId,
        ip_hash: HASH_32_A,
        viewed_at: daysAgo(0),
      })),
      ...Array.from({ length: 2 }, () => ({
        page_id: alicePageId,
        ip_hash: HASH_32_A,
        viewed_at: daysAgo(5),
      })),
      { page_id: alicePageId, ip_hash: HASH_32_A, viewed_at: daysAgo(20) },
      { page_id: alicePageId, ip_hash: HASH_32_A, viewed_at: daysAgo(100) },
    ];
    const alicePvIns = await admin.from('page_views').insert(alicePvSeed);
    expect(alicePvIns.error).toBeNull();

    // Bob — escala menor, apenas para garantir isolamento no Task 6 não-owner.
    // Esta suíte (db/aggregations) não testa RLS, mas o seed do bob ajuda
    // futuras inspeções e cobre o ambiente realista (>1 owner no DB).
    const bobClicksIns = await admin.from('click_events').insert([
      {
        link_id: bobLink0Id,
        ip_hash: HASH_32_A,
        clicked_at: daysAgo(0),
      },
      {
        link_id: bobLink0Id,
        ip_hash: HASH_32_A,
        clicked_at: daysAgo(2),
      },
    ]);
    expect(bobClicksIns.error).toBeNull();
    const bobPvIns = await admin.from('page_views').insert([
      { page_id: bobPageId, ip_hash: HASH_32_A, viewed_at: daysAgo(0) },
      { page_id: bobPageId, ip_hash: HASH_32_A, viewed_at: daysAgo(2) },
    ]);
    expect(bobPvIns.error).toBeNull();
  }, 60_000);

  afterAll(async () => {
    // CASCADE: deletar links derruba click_events; deletar pages derrubaria
    // page_views, mas cleanupTestUsers (cascade auth.users → profiles → pages)
    // faz isso. Para isolar artefatos desta suíte:
    await admin.from('click_events').delete().eq('link_id', aliceLink0Id);
    if (aliceLink1Id) {
      await admin.from('click_events').delete().eq('link_id', aliceLink1Id);
    }
    if (bobLink0Id) {
      await admin.from('click_events').delete().eq('link_id', bobLink0Id);
    }
    await admin.from('page_views').delete().eq('page_id', alicePageId);
    await admin.from('page_views').delete().eq('page_id', bobPageId);
    await admin.from('links').delete().in('id', [aliceLink0Id, aliceLink1Id, bobLink0Id]);
    await cleanupTestUsers();
  }, 60_000);

  // ---------------------------------------------------------------------------
  // (a) link_clicks_7d — agregação correta (alice)
  // ---------------------------------------------------------------------------
  it('(a) link_clicks_7d — alice vê 2 dias agregados (today + today-3), total 5', async () => {
    const { data, error } = await sessions.alice.client
      .from('link_clicks_7d')
      .select('*')
      .eq('link_id', aliceLink0Id);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    // 2 dias distintos dentro de 7d (today=3, today-3=2). Evento @ today-10 e
    // @ today-40 ficam fora.
    expect(data!.length).toBe(2);
    const counts = data!.map((r) => r.count).sort((a, b) => (b ?? 0) - (a ?? 0));
    expect(counts).toEqual([3, 2]);
    // Total agregado
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    expect(sum).toBe(5);
    // day deve ser string ISO (date type vira string no PostgREST)
    for (const row of data!) {
      expect(typeof row.day).toBe('string');
      expect(row.day).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  // ---------------------------------------------------------------------------
  // (b) link_clicks_30d — agregação correta (alice)
  // ---------------------------------------------------------------------------
  it('(b) link_clicks_30d — alice vê 3 dias agregados (today + today-3 + today-10), total 6', async () => {
    const { data, error } = await sessions.alice.client
      .from('link_clicks_30d')
      .select('*')
      .eq('link_id', aliceLink0Id);

    expect(error).toBeNull();
    expect(data!.length).toBe(3);
    const counts = data!.map((r) => r.count).sort((a, b) => (b ?? 0) - (a ?? 0));
    expect(counts).toEqual([3, 2, 1]);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    // 3 + 2 + 1 = 6 (evento @ today-40 excluído)
    expect(sum).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // (c) page_views_7d — agregação correta (alice)
  // ---------------------------------------------------------------------------
  it('(c) page_views_7d — alice vê 2 dias agregados (today + today-5), total 6', async () => {
    const { data, error } = await sessions.alice.client
      .from('page_views_7d')
      .select('*')
      .eq('page_id', alicePageId);

    expect(error).toBeNull();
    expect(data!.length).toBe(2);
    const counts = data!.map((r) => r.count).sort((a, b) => (b ?? 0) - (a ?? 0));
    expect(counts).toEqual([4, 2]);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    expect(sum).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // (d) page_views_30d — agregação correta (alice)
  // ---------------------------------------------------------------------------
  it('(d) page_views_30d — alice vê 3 dias agregados (today + today-5 + today-20), total 7', async () => {
    const { data, error } = await sessions.alice.client
      .from('page_views_30d')
      .select('*')
      .eq('page_id', alicePageId);

    expect(error).toBeNull();
    expect(data!.length).toBe(3);
    const counts = data!.map((r) => r.count).sort((a, b) => (b ?? 0) - (a ?? 0));
    expect(counts).toEqual([4, 2, 1]);
    const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
    // 4 + 2 + 1 = 7 (view @ today-100 excluída)
    expect(sum).toBe(7);
  });

  // ---------------------------------------------------------------------------
  // (e) get_page_views_series(p_page_id, 7) — equivalente à view 7d
  // ---------------------------------------------------------------------------
  it('(e) get_page_views_series(page, 7) — retorna série equivalente à view 7d', async () => {
    const { data, error } = await sessions.alice.client.rpc('get_page_views_series', {
      p_page_id: alicePageId,
      p_days: 7,
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBe(2);
    // Ordem ASC explícita pela função
    const days = data!.map((r) => r.day);
    const sortedAsc = [...days].sort();
    expect(days).toEqual(sortedAsc);
    // Counts agregados
    const sum = data!.reduce((acc, r) => acc + r.count, 0);
    expect(sum).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // (f) get_link_clicks_series(p_link_id, 30) — equivalente à view 30d, ASC
  // ---------------------------------------------------------------------------
  it('(f) get_link_clicks_series(link, 30) — retorna 3 dias ordenados ASC', async () => {
    const { data, error } = await sessions.alice.client.rpc('get_link_clicks_series', {
      p_link_id: aliceLink0Id,
      p_days: 30,
    });

    expect(error).toBeNull();
    expect(data!.length).toBe(3);
    const days = data!.map((r) => r.day);
    const sortedAsc = [...days].sort();
    expect(days).toEqual(sortedAsc);
    const sum = data!.reduce((acc, r) => acc + r.count, 0);
    expect(sum).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // (g) get_page_views_series default p_days = 7 (DEV-4 ratification)
  // ---------------------------------------------------------------------------
  it('(g) get_page_views_series(page) — default p_days=7 (mesmo resultado de (e))', async () => {
    // PostgREST aceita omitir args com DEFAULT no schema (Supabase JS Args
    // declara `p_days?: number`). Validação empírica — DEV-4 hedge.
    const { data, error } = await sessions.alice.client.rpc('get_page_views_series', {
      p_page_id: alicePageId,
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    // Mesmo conjunto de (e): 2 dias, total 6
    expect(data!.length).toBe(2);
    const sum = data!.reduce((acc, r) => acc + r.count, 0);
    expect(sum).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // (h) Sparse series — dias zerados omitidos (DEV-5)
  // ---------------------------------------------------------------------------
  it('(h) Sparse — link com 1 click hoje retorna 1 row, não 7 rows com zeros', async () => {
    // Inserir 1 click em aliceLink1Id (link sem seed anterior)
    const ins = await admin
      .from('click_events')
      .insert({
        link_id: aliceLink1Id,
        ip_hash: HASH_32_A,
        clicked_at: daysAgo(0),
      })
      .select('id')
      .single();
    expect(ins.error).toBeNull();

    try {
      const { data, error } = await sessions.alice.client.rpc('get_link_clicks_series', {
        p_link_id: aliceLink1Id,
        p_days: 7,
      });
      expect(error).toBeNull();
      // Sparse: 1 dia ativo → 1 row, NÃO 7 rows com 6 zeros
      expect(data!.length).toBe(1);
      expect(data![0]!.count).toBe(1);
    } finally {
      await admin.from('click_events').delete().eq('id', ins.data!.id);
    }
  });

  // ---------------------------------------------------------------------------
  // (i) Boundary >= cutoff (DEV-9)
  // ---------------------------------------------------------------------------
  it('(i) Boundary — event @ ~6.95d entra na view 7d; event @ ~7.05d NÃO entra', async () => {
    // Inserir em aliceLink1Id (limpo após teste (h))
    // Event "just inside" (~6 days 22.8 hours ago) e "just outside" (~7 days 1.2h)
    const insideISO = daysAgo(6.95);
    const outsideISO = daysAgo(7.05);

    const ins = await admin
      .from('click_events')
      .insert([
        { link_id: aliceLink1Id, ip_hash: HASH_32_A, clicked_at: insideISO },
        { link_id: aliceLink1Id, ip_hash: HASH_32_A, clicked_at: outsideISO },
      ])
      .select('id, clicked_at');
    expect(ins.error).toBeNull();
    const insertedIds = ins.data!.map((r) => r.id);

    try {
      const { data, error } = await sessions.alice.client
        .from('link_clicks_7d')
        .select('*')
        .eq('link_id', aliceLink1Id);

      expect(error).toBeNull();
      // Apenas o "inside" entra. Pode ser 1 ou 2 dias distintos dependendo do
      // boundary de date_trunc('day', ...) — o inside @ 6.95d cai em algum
      // dia entre today-7 e today; o "outside" não entra de jeito nenhum.
      // Validação: count total = 1 (1 event dentro da janela 7d).
      const sum = data!.reduce((acc, r) => acc + (r.count ?? 0), 0);
      expect(sum).toBe(1);
    } finally {
      await admin.from('click_events').delete().in('id', insertedIds);
    }
  });
});
