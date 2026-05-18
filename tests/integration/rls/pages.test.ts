/**
 * Integration tests — Story 2.2 AC5: RLS policies on `pages` table.
 *
 * 10 scenarios (AC5 a-j):
 *   a) owner read (bootstrap defaults: theme='light', is_published=true)
 *   b) owner update (theme/is_published + updated_at refresh)
 *   c) non-owner read of PUBLISHED page (pages_select_public USING is_published)
 *   d) non-owner read of UNPUBLISHED page BLOCKED (0 rows)
 *   e) non-owner update BLOCKED (RLS — 0 rows / 42501)
 *   f) anonymous read of PUBLISHED page
 *   g) anonymous read of UNPUBLISHED page BLOCKED (0 rows)
 *   h) anonymous update BLOCKED
 *   i) authenticated direct INSERT BLOCKED (no INSERT policy — trigger only)
 *   j) trigger `auth_user_created` bootstraps a page on auth.admin.createUser
 *
 * Substrate: `biolink-dev` (ref ibpliihqaceafdykgwiu); fixtures isolated by
 * `cifx-` prefix + UUIDs `0…00001…`. Helper `test-users.ts` is REUSED unchanged
 * (the extended trigger already bootstraps a `pages` row for alice/bob during
 * setupTestUsers). Cleanup in beforeAll AND afterAll (cascade drops the page).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  TEST_USERS,
  TEST_USER_PASSWORD,
  admin,
  anon,
  setupTestUsers,
  cleanupTestUsers,
  type TestSession,
} from '../helpers/test-users';

describe('RLS: pages table (Story 2.2 AC5)', () => {
  let sessions: { alice: TestSession; bob: TestSession };

  beforeAll(async () => {
    sessions = await setupTestUsers();
  }, 60_000); // Account for round-trip to Supabase cloud + auth flow

  afterAll(async () => {
    await cleanupTestUsers();
  }, 60_000);

  // -------------------------------------------------------------------------
  // AC5(a) — Owner reads own page (bootstrap defaults)
  // -------------------------------------------------------------------------
  it('AC5(a): owner reads own page with bootstrap defaults', async () => {
    const { data, error } = await sessions.alice.client
      .from('pages')
      .select('id, profile_id, theme, is_published, created_at, updated_at')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.profile_id).toBe(TEST_USERS.alice.id);
    // Trigger bootstrap defaults: theme='light', is_published=true
    expect(data?.theme).toBe('light');
    expect(data?.is_published).toBe(true);
  });

  // -------------------------------------------------------------------------
  // AC5(b) — Owner updates own page, updated_at refreshes
  // -------------------------------------------------------------------------
  it('AC5(b): owner updates theme/is_published, updated_at refreshes', async () => {
    const before = await sessions.alice.client
      .from('pages')
      .select('updated_at')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();

    expect(before.error).toBeNull();
    const beforeUpdatedAt = before.data?.updated_at;
    expect(beforeUpdatedAt).toBeTruthy();

    // Force a measurable delta — same 5ms pattern as profiles.test.ts AC5(b).
    await new Promise((resolve) => setTimeout(resolve, 5));

    const { data, error } = await sessions.alice.client
      .from('pages')
      .update({ theme: 'dark', is_published: false })
      .eq('profile_id', TEST_USERS.alice.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.theme).toBe('dark');
    expect(data?.is_published).toBe(false);
    expect(data?.updated_at).toBeTruthy();
    expect(new Date(data!.updated_at).getTime()).toBeGreaterThan(
      new Date(beforeUpdatedAt!).getTime(),
    );

    // Restore is_published=true so public-read scenarios (c, f) see it.
    const restore = await sessions.alice.client
      .from('pages')
      .update({ is_published: true })
      .eq('profile_id', TEST_USERS.alice.id)
      .select()
      .single();

    expect(restore.error).toBeNull();
    expect(restore.data?.is_published).toBe(true);
  });

  // -------------------------------------------------------------------------
  // AC5(c) — Non-owner reads other's PUBLISHED page (select_public)
  // -------------------------------------------------------------------------
  it('AC5(c): non-owner reads published page (pages_select_public)', async () => {
    const { data, error } = await sessions.bob.client
      .from('pages')
      .select('id, profile_id, is_published')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();

    expect(error).toBeNull();
    expect(data?.profile_id).toBe(TEST_USERS.alice.id);
    expect(data?.is_published).toBe(true);
  });

  // -------------------------------------------------------------------------
  // AC5(d) — Non-owner read of UNPUBLISHED page blocked (0 rows)
  // -------------------------------------------------------------------------
  it('AC5(d): non-owner cannot read unpublished page', async () => {
    try {
      const hide = await admin
        .from('pages')
        .update({ is_published: false })
        .eq('profile_id', TEST_USERS.alice.id)
        .select()
        .single();
      expect(hide.error).toBeNull();
      expect(hide.data?.is_published).toBe(false);

      // Bob: pages_select_public filtered (is_published=false);
      // pages_select_own does not match (profile_id != bob.id) → 0 rows.
      const { data, error } = await sessions.bob.client
        .from('pages')
        .select('id')
        .eq('profile_id', TEST_USERS.alice.id);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    } finally {
      await admin
        .from('pages')
        .update({ is_published: true })
        .eq('profile_id', TEST_USERS.alice.id);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(e) — Non-owner UPDATE blocked
  // -------------------------------------------------------------------------
  it('AC5(e): non-owner UPDATE blocked by RLS', async () => {
    // Bob attempts to mutate Alice's page. RLS USING clause filters the row
    // out of Bob's UPDATE scope → zero rows affected (RLS is "row not
    // visible", not "permission denied" — see profiles.test.ts AC5(d)).
    const malicious = 'brand' as const;

    const updateRes = await sessions.bob.client
      .from('pages')
      .update({ theme: malicious })
      .eq('profile_id', TEST_USERS.alice.id)
      .select();

    expect(
      updateRes.error === null ||
        /42501|RLS|row/i.test(updateRes.error?.code ?? updateRes.error?.message ?? ''),
    ).toBe(true);
    expect(updateRes.data ?? []).toHaveLength(0);

    // Read back via admin (bypasses RLS) — Alice's page must NOT be mutated.
    const verify = await admin
      .from('pages')
      .select('theme')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();

    expect(verify.error).toBeNull();
    expect(verify.data?.theme).not.toBe(malicious);
  });

  // -------------------------------------------------------------------------
  // AC5(f) — Anonymous reads PUBLISHED page
  // -------------------------------------------------------------------------
  it('AC5(f): anonymous client reads published page (pages_select_public)', async () => {
    const { data, error } = await anon
      .from('pages')
      .select('id, profile_id, is_published')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();

    expect(error).toBeNull();
    expect(data?.profile_id).toBe(TEST_USERS.alice.id);
    expect(data?.is_published).toBe(true);
  });

  // -------------------------------------------------------------------------
  // AC5(g) — Anonymous read of UNPUBLISHED page blocked (0 rows)
  // -------------------------------------------------------------------------
  it('AC5(g): anonymous cannot read unpublished page', async () => {
    try {
      const hide = await admin
        .from('pages')
        .update({ is_published: false })
        .eq('profile_id', TEST_USERS.alice.id)
        .select()
        .single();
      expect(hide.error).toBeNull();
      expect(hide.data?.is_published).toBe(false);

      const { data, error } = await anon
        .from('pages')
        .select('id')
        .eq('profile_id', TEST_USERS.alice.id);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    } finally {
      await admin
        .from('pages')
        .update({ is_published: true })
        .eq('profile_id', TEST_USERS.alice.id);
    }
  });

  // -------------------------------------------------------------------------
  // AC5(h) — Anonymous UPDATE blocked
  // -------------------------------------------------------------------------
  it('AC5(h): anonymous UPDATE blocked by RLS', async () => {
    const updateRes = await anon
      .from('pages')
      .update({ theme: 'brand' })
      .eq('profile_id', TEST_USERS.alice.id)
      .select();

    expect(updateRes.data ?? []).toHaveLength(0);

    const verify = await admin
      .from('pages')
      .select('theme')
      .eq('profile_id', TEST_USERS.alice.id)
      .single();

    expect(verify.error).toBeNull();
    expect(verify.data?.theme).not.toBe('brand');
  });

  // -------------------------------------------------------------------------
  // AC5(i) — Authenticated direct INSERT blocked (no INSERT policy)
  // -------------------------------------------------------------------------
  it('AC5(i): authenticated direct INSERT into pages is blocked', async () => {
    // Alice tries to insert a page directly. No INSERT policy exists — only
    // the SECURITY DEFINER trigger inserts. Result: RLS denies.
    const { error } = await sessions.alice.client.from('pages').insert({
      profile_id: '00000000-0000-0000-0000-000000009999',
    });

    expect(error).not.toBeNull();
    expect(error?.code ?? error?.message ?? '').toMatch(/42501|RLS|row.level/i);
  });

  // -------------------------------------------------------------------------
  // AC5(j) — Trigger bootstrap creates a page on auth.users INSERT
  // -------------------------------------------------------------------------
  it('AC5(j): auth_user_created trigger bootstraps a pages row', async () => {
    const username = 'cifx-smoke-bootstrap';
    const email = 'cifx-smoke@example.com';
    const id = '00000000-0000-0000-0000-000000001099';

    try {
      // Pre-cleanup (in case prior run leaked)
      await admin.auth.admin.deleteUser(id).catch(() => {});

      // Create user via admin — trigger fires AFTER INSERT on auth.users and
      // bootstraps profile + page (1:1).
      const { error: createErr } = await admin.auth.admin.createUser({
        id,
        email,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
        user_metadata: { username },
      });

      expect(createErr).toBeNull();

      // Exactly 1 pages row exists for the new user, with default theme/published.
      const { data, error } = await admin
        .from('pages')
        .select('id, profile_id, theme, is_published')
        .eq('profile_id', id)
        .single();

      expect(error).toBeNull();
      expect(data?.profile_id).toBe(id);
      expect(data?.theme).toBe('light');
      expect(data?.is_published).toBe(true);
    } finally {
      // Cascade: deleteUser → profile → page all removed.
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  });
});
