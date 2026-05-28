/**
 * Integration tests — dashboard /analytics (Story 4.4, AC1/AC3/AC4).
 *
 * Cobre os 4 cenários:
 *   (a) Alice com seed (2 links + 5 page_views + 6 click_events distribuídos
 *       entre lifetime e 30d) → totals lifetime + 30d corretos via queries
 *       que page.tsx executa; tabela com 2 rows ordenadas desc por
 *       clicksTotal (link 1 → 4 totais, link 2 → 2 totais).
 *   (b) Bob (sem links, sem events) → queries retornam zero/vazio →
 *       isEmpty=true (page.tsx renderiza <EmptyAnalyticsState>).
 *   (c) range=30d → RPC get_page_views_series(p_days=30) retorna mesma
 *       série (que para alice cabe em 30d) — invocação dependente do
 *       parâmetro funciona.
 *   (d) RLS — alice autenticada NÃO consegue ler page_views/click_events
 *       de bob via JOIN (defense-in-depth; page.tsx resolve pageId via
 *       auth.uid → não há vetor de URL-param para bypass).
 *
 * Substrate: biolink-dev. Fixtures alice/bob de TEST_USERS (UUIDs 1001/1002).
 * `setupTestUsers` faz cleanup defensivo antes e depois.
 *
 * NOTA: não renderizamos o Server Component em si — o ambiente é node
 * (vitest project=integration). Render é coberto pelos component tests
 * (Task 8). O foco aqui é a contratos de dados que page.tsx consome via
 * RLS + views/RPC.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/lib/supabase/types';

import { TEST_USERS, admin, cleanupTestUsers, setupTestUsers } from './helpers/test-users';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let aliceClient: SupabaseClient<Database>;
let bobClient: SupabaseClient<Database>;
let alicePageId: string;
let bobPageId: string;
let aliceLink1Id: string;
let aliceLink2Id: string;

function nowMinusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('Dashboard /analytics queries (Story 4.4)', () => {
  beforeAll(async () => {
    const sessions = await setupTestUsers();
    aliceClient = sessions.alice.client;
    bobClient = sessions.bob.client;

    // page_id 1:1 garantido pelo trigger auth_user_created.
    const alicePage = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();
    expect(alicePage.error).toBeNull();
    alicePageId = alicePage.data!.id;

    const bobPage = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.bob.id)
      .single();
    expect(bobPage.error).toBeNull();
    bobPageId = bobPage.data!.id;

    // 2 links em alice
    const l1 = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'Alice link 1',
        url: 'https://a1.com',
        position: 0,
        is_visible: true,
      })
      .select('id')
      .single();
    expect(l1.error).toBeNull();
    aliceLink1Id = l1.data!.id;

    const l2 = await admin
      .from('links')
      .insert({
        page_id: alicePageId,
        title: 'Alice link 2',
        url: 'https://a2.com',
        position: 1,
        is_visible: true,
      })
      .select('id')
      .single();
    expect(l2.error).toBeNull();
    aliceLink2Id = l2.data!.id;

    // 5 page_views: 3 hoje (dentro 30d) + 2 há 15 dias (também 30d). Total
    // lifetime = 5; 30d = 5. (Para variar 30d ≠ lifetime, faria há 50d.)
    // Story Task 9.2 prescreve 3 hoje + 2 há 15d (todos dentro 30d, mas
    // simbolicamente "lifetime" cobre o cenário sem fluxo extra). Para tornar
    // o 30d sentido vs lifetime, adicionamos 1 page_view há 50d.
    await admin
      .from('page_views')
      .insert([
        { page_id: alicePageId, viewed_at: nowMinusDays(0) },
        { page_id: alicePageId, viewed_at: nowMinusDays(0) },
        { page_id: alicePageId, viewed_at: nowMinusDays(0) },
        { page_id: alicePageId, viewed_at: nowMinusDays(15) },
        { page_id: alicePageId, viewed_at: nowMinusDays(15) },
        { page_id: alicePageId, viewed_at: nowMinusDays(50) }, // out-of-30d
      ])
      .throwOnError();

    // click_events:
    //   link1: 3 hoje + 1 há 50d → lifetime=4, 30d=3
    //   link2: 2 hoje → lifetime=2, 30d=2
    //   alice total lifetime=6, 30d=5
    await admin
      .from('click_events')
      .insert([
        { link_id: aliceLink1Id, clicked_at: nowMinusDays(0) },
        { link_id: aliceLink1Id, clicked_at: nowMinusDays(0) },
        { link_id: aliceLink1Id, clicked_at: nowMinusDays(0) },
        { link_id: aliceLink1Id, clicked_at: nowMinusDays(50) }, // out-of-30d
        { link_id: aliceLink2Id, clicked_at: nowMinusDays(0) },
        { link_id: aliceLink2Id, clicked_at: nowMinusDays(0) },
      ])
      .throwOnError();
  }, 60_000);

  afterAll(async () => {
    if (alicePageId) {
      await admin.from('click_events').delete().eq('link_id', aliceLink1Id).throwOnError();
      await admin.from('click_events').delete().eq('link_id', aliceLink2Id).throwOnError();
      await admin.from('page_views').delete().eq('page_id', alicePageId).throwOnError();
      await admin.from('links').delete().eq('page_id', alicePageId).throwOnError();
    }
    await cleanupTestUsers();
  }, 60_000);

  // -------------------------------------------------------------------------
  // Scenario (a) — alice happy path
  // -------------------------------------------------------------------------
  it('(a) AC1 — totais lifetime + 30d corretos para alice', async () => {
    // Total Page Views lifetime
    const totalPV = await aliceClient
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', alicePageId);
    expect(totalPV.error).toBeNull();
    expect(totalPV.count).toBe(6); // 3 + 2 + 1

    // Total Clicks lifetime (linkIds round-trip — DEV-8)
    const linkIdsRes = await aliceClient.from('links').select('id').eq('page_id', alicePageId);
    expect(linkIdsRes.error).toBeNull();
    const linkIds = (linkIdsRes.data ?? []).map((l) => l.id);
    expect(linkIds).toHaveLength(2);

    const totalClicks = await aliceClient
      .from('click_events')
      .select('id', { count: 'exact', head: true })
      .in('link_id', linkIds);
    expect(totalClicks.error).toBeNull();
    expect(totalClicks.count).toBe(6); // 4 + 2

    // Page Views 30d (view)
    const pv30d = await aliceClient
      .from('page_views_30d')
      .select('count')
      .eq('page_id', alicePageId);
    expect(pv30d.error).toBeNull();
    const pv30dSum = (pv30d.data ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
    expect(pv30dSum).toBe(5); // 3 hoje + 2 há 15d (50d out)

    // Clicks 30d (view filtrada por linkIds)
    const clicks30d = await aliceClient
      .from('link_clicks_30d')
      .select('count')
      .in('link_id', linkIds);
    expect(clicks30d.error).toBeNull();
    const clicks30dSum = (clicks30d.data ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
    expect(clicks30dSum).toBe(5); // link1 3 + link2 2 (link1's 50d out)
  }, 30_000);

  it('(a) AC3 — per-link aggregations + ordering desc por clicksTotal', async () => {
    const linkIds = [aliceLink1Id, aliceLink2Id];

    const linkClicks7d = await aliceClient
      .from('link_clicks_7d')
      .select('link_id, count')
      .in('link_id', linkIds);
    expect(linkClicks7d.error).toBeNull();

    const linkClicks30d = await aliceClient
      .from('link_clicks_30d')
      .select('link_id, count')
      .in('link_id', linkIds);
    expect(linkClicks30d.error).toBeNull();

    const clickEvents = await aliceClient
      .from('click_events')
      .select('link_id')
      .in('link_id', linkIds);
    expect(clickEvents.error).toBeNull();

    const totalByLink = new Map<string, number>();
    for (const row of clickEvents.data ?? []) {
      if (row.link_id) {
        totalByLink.set(row.link_id, (totalByLink.get(row.link_id) ?? 0) + 1);
      }
    }
    expect(totalByLink.get(aliceLink1Id)).toBe(4);
    expect(totalByLink.get(aliceLink2Id)).toBe(2);

    // Sort desc por total (espelhando page.tsx Task 2.6)
    const sortedIds = [...totalByLink.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    expect(sortedIds[0]).toBe(aliceLink1Id);
    expect(sortedIds[1]).toBe(aliceLink2Id);
  }, 30_000);

  // -------------------------------------------------------------------------
  // Scenario (b) — bob empty state
  // -------------------------------------------------------------------------
  it('(b) AC4 — bob (sem links, sem events) → queries retornam vazio → isEmpty=true', async () => {
    const totalPV = await bobClient
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', bobPageId);
    expect(totalPV.error).toBeNull();
    expect(totalPV.count).toBe(0);

    const linksRes = await bobClient.from('links').select('id').eq('page_id', bobPageId);
    expect(linksRes.error).toBeNull();
    expect(linksRes.data).toEqual([]);

    // isEmpty branch da page.tsx: links.length === 0 → render <EmptyAnalyticsState>
  }, 30_000);

  // -------------------------------------------------------------------------
  // Scenario (c) — RPC com range=30d
  // -------------------------------------------------------------------------
  it('(c) AC2 — get_page_views_series funciona para p_days=7 e p_days=30', async () => {
    const r7 = await aliceClient.rpc('get_page_views_series', {
      p_page_id: alicePageId,
      p_days: 7,
    });
    expect(r7.error).toBeNull();
    // 7d: apenas hoje (3 page_views; já que -15d e -50d ficam de fora)
    const sum7 = (r7.data ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
    expect(sum7).toBe(3);

    const r30 = await aliceClient.rpc('get_page_views_series', {
      p_page_id: alicePageId,
      p_days: 30,
    });
    expect(r30.error).toBeNull();
    // 30d: hoje (3) + -15d (2) = 5
    const sum30 = (r30.data ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
    expect(sum30).toBe(5);

    // RPC retorna rows sparse — count > 0 apenas para dias com eventos.
    // Garantia: ASC por day.
    const days = (r30.data ?? []).map((r) => r.day);
    const sorted = [...days].sort();
    expect(days).toEqual(sorted);
  }, 30_000);

  // -------------------------------------------------------------------------
  // Scenario (d) — RLS defense
  // -------------------------------------------------------------------------
  it('(d) NFR1 — alice NÃO consegue ler page_views de bob (RLS bloqueia mesmo com page_id explícito)', async () => {
    const res = await aliceClient
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', bobPageId);
    // page_views RLS: select_own via JOIN profiles+pages.profile_id=auth.uid().
    // Alice autenticada filtrando por bob.page_id ⇒ 0 rows (não erro).
    expect(res.error).toBeNull();
    expect(res.count).toBe(0);
  }, 30_000);

  it('(d) NFR1 — anon (sem session) NÃO consegue ler click_events', async () => {
    const anon = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const res = await anon
      .from('click_events')
      .select('id', { count: 'exact', head: true })
      .in('link_id', [aliceLink1Id, aliceLink2Id]);
    expect(res.error).toBeNull();
    expect(res.count).toBe(0);
  }, 30_000);
});
