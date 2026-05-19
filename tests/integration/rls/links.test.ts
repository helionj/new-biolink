/**
 * Integration tests — Story 2.3 AC5: RLS policies on `links` table.
 *
 * 11 scenarios (Task 4.3 a-k):
 *   a) owner INSERT into own page (links_insert_own WITH CHECK)
 *   b) owner reads BOTH visible + invisible links (links_select_own)
 *   c) owner UPDATE (title/is_visible/position + updated_at refresh)
 *   d) owner DELETE — row gone; gap left in `position` is sanctioned (AC4 Q1)
 *   e) non-owner INSERT BLOCKED (EXPLICIT AC5 case — bob → alice's page)
 *   f) non-owner reads PUBLIC+VISIBLE link (links_select_public)
 *   g) non-owner CANNOT read invisible link of published page (0 rows)
 *   h) non-owner CANNOT read links of UNPUBLISHED page (0 rows)
 *   i) non-owner UPDATE + DELETE BLOCKED (RLS — 0 rows / 42501)
 *   j) anonymous: reads public+visible; blocked on invisible/unpublished/writes
 *   k) AC2 — position UNIQUE per page_id (23505 on collision; cross-page OK)
 *
 * Substrate: `biolink-dev` (ref ibpliihqaceafdykgwiu); fixtures isolated by
 * `cifx-` prefix + UUIDs `0…00001…`. Helper `test-users.ts` is REUSED unchanged.
 * `links` is NOT bootstrapped by the trigger (≠ pages) — each test creates its
 * own links and wipes them in `finally` via `admin` (bypasses RLS). The test
 * pages (alice/bob) carry zero non-test links, so a page-scoped delete fully
 * isolates scenarios. Cleanup of users runs in beforeAll AND afterAll (cascade
 * auth.users → profile → page → links removes everything).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  TEST_USERS,
  admin,
  anon,
  setupTestUsers,
  cleanupTestUsers,
  type TestSession,
} from '../helpers/test-users';

describe('RLS: links table (Story 2.3 AC5)', () => {
  let sessions: { alice: TestSession; bob: TestSession };
  let alicePageId: string;
  let bobPageId: string;

  beforeAll(async () => {
    sessions = await setupTestUsers();

    // links is NOT bootstrapped — but the page is (trigger, Story 2.2).
    // Resolve the bootstrapped page id for each user via admin (bypasses RLS).
    const aliceP = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();
    const bobP = await admin
      .from('pages')
      .select('id')
      .eq('profile_id', TEST_USERS.bob.id)
      .single();

    expect(aliceP.error).toBeNull();
    expect(bobP.error).toBeNull();
    alicePageId = aliceP.data!.id;
    bobPageId = bobP.data!.id;
  }, 60_000); // Account for round-trip to Supabase cloud + auth flow

  afterAll(async () => {
    // Defensive: wipe any test links before users (cascade would handle it too).
    await admin.from('links').delete().eq('page_id', alicePageId);
    await admin.from('links').delete().eq('page_id', bobPageId);
    await cleanupTestUsers();
  }, 60_000);

  // -------------------------------------------------------------------------
  // AC5(a) — Owner inserts a link into their own page
  // -------------------------------------------------------------------------
  it('AC5(a): owner inserts a link into own page (links_insert_own)', async () => {
    try {
      const { data, error } = await sessions.alice.client
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'Alice site',
          url: 'https://alice.example.com',
          position: 10,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.page_id).toBe(alicePageId);
      expect(data?.is_visible).toBe(true); // column default

      // Verify the row really exists via admin (bypasses RLS).
      const verify = await admin
        .from('links')
        .select('id, title')
        .eq('page_id', alicePageId)
        .eq('position', 10)
        .single();
      expect(verify.error).toBeNull();
      expect(verify.data?.title).toBe('Alice site');
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(b) — Owner reads BOTH visible and invisible links
  // -------------------------------------------------------------------------
  it('AC5(b): owner reads own visible AND invisible links', async () => {
    try {
      const ins = await admin.from('links').insert([
        {
          page_id: alicePageId,
          title: 'Visible',
          url: 'https://v.example.com',
          position: 20,
          is_visible: true,
        },
        {
          page_id: alicePageId,
          title: 'Hidden',
          url: 'https://h.example.com',
          position: 21,
          is_visible: false,
        },
      ]);
      expect(ins.error).toBeNull();

      const { data, error } = await sessions.alice.client
        .from('links')
        .select('title, is_visible, position')
        .eq('page_id', alicePageId)
        .order('position', { ascending: true });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      // links_select_own is ownership-only — visibility does NOT filter the owner.
      expect(data?.map((l) => l.title).sort()).toEqual(['Hidden', 'Visible']);
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(c) — Owner updates own link, updated_at refreshes
  // -------------------------------------------------------------------------
  it('AC5(c): owner updates own link, updated_at refreshes', async () => {
    try {
      const seed = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'Before',
          url: 'https://b.example.com',
          position: 30,
        })
        .select('id, updated_at')
        .single();
      expect(seed.error).toBeNull();
      const linkId = seed.data!.id;
      const beforeUpdatedAt = seed.data!.updated_at;

      // Force a measurable delta — same 5ms pattern as pages.test.ts AC5(b).
      await new Promise((resolve) => setTimeout(resolve, 5));

      const { data, error } = await sessions.alice.client
        .from('links')
        .update({ title: 'After', is_visible: false, position: 31 })
        .eq('id', linkId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('After');
      expect(data?.is_visible).toBe(false);
      expect(data?.position).toBe(31);
      expect(new Date(data!.updated_at).getTime()).toBeGreaterThan(
        new Date(beforeUpdatedAt).getTime(),
      );
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(d) — Owner deletes own link; gap left in `position` is sanctioned
  // -------------------------------------------------------------------------
  it('AC5(d): owner deletes own link (gap-on-delete is the sanctioned design)', async () => {
    try {
      const seed = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'Doomed',
          url: 'https://d.example.com',
          position: 40,
        })
        .select('id')
        .single();
      expect(seed.error).toBeNull();
      const linkId = seed.data!.id;

      const del = await sessions.alice.client.from('links').delete().eq('id', linkId).select();
      expect(del.error).toBeNull();
      expect(del.data ?? []).toHaveLength(1);

      // Row is gone. AC4 (Q1 RESOLVED): NO compaction trigger reindexes
      // `position` — the gap is the sanctioned behaviour.
      const verify = await admin.from('links').select('id').eq('id', linkId);
      expect(verify.error).toBeNull();
      expect(verify.data ?? []).toHaveLength(0);
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(e) — Non-owner INSERT blocked (EXPLICIT AC5 case)
  // -------------------------------------------------------------------------
  it("AC5(e): non-owner cannot INSERT a link into another user's page", async () => {
    try {
      // Bob attempts to insert into Alice's page. links_insert_own WITH CHECK
      // does not match (bob is not the owner of alice's page) → RLS denies.
      const { error } = await sessions.bob.client.from('links').insert({
        page_id: alicePageId,
        title: 'Hijack',
        url: 'https://evil.example.com',
        position: 50,
      });

      expect(error).not.toBeNull();
      expect(error?.code ?? error?.message ?? '').toMatch(/42501|RLS|row.level/i);

      // Admin verification: NO row was created on alice's page by bob.
      const verify = await admin
        .from('links')
        .select('id')
        .eq('page_id', alicePageId)
        .eq('position', 50);
      expect(verify.error).toBeNull();
      expect(verify.data ?? []).toHaveLength(0);
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(f) — Non-owner reads PUBLIC + VISIBLE link (links_select_public)
  // -------------------------------------------------------------------------
  it('AC5(f): non-owner reads a public+visible link (links_select_public)', async () => {
    try {
      // alice's page is_published=true by default (bootstrap). Visible link.
      const seed = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'Public',
          url: 'https://p.example.com',
          position: 60,
          is_visible: true,
        })
        .select('id')
        .single();
      expect(seed.error).toBeNull();

      const { data, error } = await sessions.bob.client
        .from('links')
        .select('id, title')
        .eq('page_id', alicePageId)
        .eq('position', 60)
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Public');
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(g) — Non-owner CANNOT read an invisible link of a published page
  // -------------------------------------------------------------------------
  it('AC5(g): non-owner cannot read an invisible link of a published page', async () => {
    try {
      const seed = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'Hidden',
          url: 'https://h2.example.com',
          position: 70,
          is_visible: false,
        })
        .select('id')
        .single();
      expect(seed.error).toBeNull();

      // links_select_public requires is_visible=true (fails);
      // links_select_own does not match (bob is not owner) → 0 rows.
      const { data, error } = await sessions.bob.client
        .from('links')
        .select('id')
        .eq('page_id', alicePageId)
        .eq('position', 70);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(h) — Non-owner CANNOT read links of an UNPUBLISHED page
  // -------------------------------------------------------------------------
  it('AC5(h): non-owner cannot read links of an unpublished page', async () => {
    try {
      const seed = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'OnHiddenPage',
          url: 'https://x.example.com',
          position: 80,
          is_visible: true,
        })
        .select('id')
        .single();
      expect(seed.error).toBeNull();

      const hide = await admin
        .from('pages')
        .update({ is_published: false })
        .eq('id', alicePageId)
        .select()
        .single();
      expect(hide.error).toBeNull();
      expect(hide.data?.is_published).toBe(false);

      // Even with is_visible=true, links_select_public needs page.is_published
      // =true → fails; links_select_own does not match bob → 0 rows.
      const { data, error } = await sessions.bob.client
        .from('links')
        .select('id')
        .eq('page_id', alicePageId)
        .eq('position', 80);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    } finally {
      await admin.from('pages').update({ is_published: true }).eq('id', alicePageId);
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(i) — Non-owner UPDATE + DELETE blocked
  // -------------------------------------------------------------------------
  it('AC5(i): non-owner UPDATE and DELETE are blocked by RLS', async () => {
    try {
      const seed = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'Untouchable',
          url: 'https://u.example.com',
          position: 90,
        })
        .select('id')
        .single();
      expect(seed.error).toBeNull();
      const linkId = seed.data!.id;

      // RLS is "row not visible", not necessarily "permission denied" — accept
      // error OR 0 rows (see profiles.test.ts / pages.test.ts AC5(e)).
      const upd = await sessions.bob.client
        .from('links')
        .update({ title: 'Hacked' })
        .eq('id', linkId)
        .select();
      expect(
        upd.error === null || /42501|RLS|row/i.test(upd.error?.code ?? upd.error?.message ?? ''),
      ).toBe(true);
      expect(upd.data ?? []).toHaveLength(0);

      const del = await sessions.bob.client.from('links').delete().eq('id', linkId).select();
      expect(
        del.error === null || /42501|RLS|row/i.test(del.error?.code ?? del.error?.message ?? ''),
      ).toBe(true);
      expect(del.data ?? []).toHaveLength(0);

      // Admin verification — link neither mutated nor removed.
      const verify = await admin.from('links').select('title').eq('id', linkId).single();
      expect(verify.error).toBeNull();
      expect(verify.data?.title).toBe('Untouchable');
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(j) — Anonymous: read public+visible; blocked on the rest
  // -------------------------------------------------------------------------
  it('AC5(j): anonymous reads public+visible only; writes/blocked reads denied', async () => {
    try {
      const pub = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'AnonOK',
          url: 'https://anon.example.com',
          position: 100,
          is_visible: true,
        })
        .select('id')
        .single();
      expect(pub.error).toBeNull();
      const pubId = pub.data!.id;

      const hidden = await admin
        .from('links')
        .insert({
          page_id: alicePageId,
          title: 'AnonNo',
          url: 'https://anon2.example.com',
          position: 101,
          is_visible: false,
        })
        .select('id')
        .single();
      expect(hidden.error).toBeNull();

      // anon reads the public+visible link (links_select_public).
      const readPub = await anon.from('links').select('id, title').eq('id', pubId).single();
      expect(readPub.error).toBeNull();
      expect(readPub.data?.title).toBe('AnonOK');

      // anon CANNOT read the invisible one.
      const readHidden = await anon
        .from('links')
        .select('id')
        .eq('page_id', alicePageId)
        .eq('position', 101);
      expect(readHidden.error).toBeNull();
      expect(readHidden.data ?? []).toHaveLength(0);

      // anon INSERT/UPDATE/DELETE blocked.
      const insRes = await anon.from('links').insert({
        page_id: alicePageId,
        title: 'AnonHack',
        url: 'https://anonhack.example.com',
        position: 102,
      });
      expect(insRes.error).not.toBeNull();

      const updRes = await anon
        .from('links')
        .update({ title: 'AnonHacked' })
        .eq('id', pubId)
        .select();
      expect(updRes.data ?? []).toHaveLength(0);

      const delRes = await anon.from('links').delete().eq('id', pubId).select();
      expect(delRes.data ?? []).toHaveLength(0);

      // Admin verification — public link untouched.
      const verify = await admin.from('links').select('title').eq('id', pubId).single();
      expect(verify.error).toBeNull();
      expect(verify.data?.title).toBe('AnonOK');
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
    }
  });

  // -------------------------------------------------------------------------
  // AC2 — position UNIQUE per page_id (collision 23505; cross-page coexists)
  // -------------------------------------------------------------------------
  it('AC2(k): position is UNIQUE per page_id (23505 on collision; per-page scoped)', async () => {
    try {
      // Same (page_id, position) twice on alice's page → 2nd violates UNIQUE.
      const first = await sessions.alice.client.from('links').insert({
        page_id: alicePageId,
        title: 'First',
        url: 'https://first.example.com',
        position: 5,
      });
      expect(first.error).toBeNull();

      const dup = await sessions.alice.client.from('links').insert({
        page_id: alicePageId,
        title: 'Dup',
        url: 'https://dup.example.com',
        position: 5,
      });
      expect(dup.error).not.toBeNull();
      expect(dup.error?.code ?? dup.error?.message ?? '').toMatch(/23505|unique/i);

      // position=0 on alice's page AND bob's page coexist — UNIQUE is per
      // page_id, not global. Each owner inserts into their OWN page (RLS).
      const aliceZero = await sessions.alice.client.from('links').insert({
        page_id: alicePageId,
        title: 'AliceZero',
        url: 'https://az.example.com',
        position: 0,
      });
      expect(aliceZero.error).toBeNull();

      const bobZero = await sessions.bob.client.from('links').insert({
        page_id: bobPageId,
        title: 'BobZero',
        url: 'https://bz.example.com',
        position: 0,
      });
      expect(bobZero.error).toBeNull();
    } finally {
      await admin.from('links').delete().eq('page_id', alicePageId);
      await admin.from('links').delete().eq('page_id', bobPageId);
    }
  });
});
