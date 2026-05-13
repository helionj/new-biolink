/**
 * Integration tests — Story 1.4 AC5: RLS policies on `profiles` table.
 *
 * 8 scenarios (AC5 a-h):
 *   a) owner read
 *   b) owner update (display_name/bio/avatar_url + updated_at refresh)
 *   c) non-owner read (permissive — `profiles_select_public USING (true)`)
 *   d) non-owner update BLOCKED (RLS 42501)
 *   e) anonymous read
 *   f) anonymous update BLOCKED
 *   g) authenticated direct INSERT BLOCKED (no INSERT policy)
 *   h) trigger `auth_user_created` bootstraps profile on auth.admin.createUser
 *
 * Substrate: `biolink-dev` (ref ibpliihqaceafdykgwiu); fixtures isolated by
 * `cifx-` prefix + UUIDs `0…00001…`. Cleanup in beforeAll AND afterAll.
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

describe('RLS: profiles table (Story 1.4 AC5)', () => {
  let sessions: { alice: TestSession; bob: TestSession };

  beforeAll(async () => {
    sessions = await setupTestUsers();
  }, 60_000); // Account for round-trip to Supabase cloud + auth flow

  afterAll(async () => {
    await cleanupTestUsers();
  }, 60_000);

  // -------------------------------------------------------------------------
  // AC5(a) — Owner reads own profile
  // -------------------------------------------------------------------------
  it('AC5(a): owner reads own profile', async () => {
    const { data, error } = await sessions.alice.client
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
      .eq('id', TEST_USERS.alice.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(TEST_USERS.alice.id);
    expect(data?.username).toBe(TEST_USERS.alice.username);
    // Bootstrap state: display_name + bio + avatar_url all NULL
    expect(data?.display_name).toBeNull();
    expect(data?.bio).toBeNull();
    expect(data?.avatar_url).toBeNull();
  });

  // -------------------------------------------------------------------------
  // AC5(b) — Owner updates own profile, updated_at refreshes
  // -------------------------------------------------------------------------
  it('AC5(b): owner updates display_name/bio/avatar_url, updated_at refreshes', async () => {
    // Capture pre-update timestamp
    const before = await sessions.alice.client
      .from('profiles')
      .select('updated_at')
      .eq('id', TEST_USERS.alice.id)
      .single();

    expect(before.error).toBeNull();
    const beforeUpdatedAt = before.data?.updated_at;
    expect(beforeUpdatedAt).toBeTruthy();

    // Force a measurable delta — Postgres `now()` has microsecond resolution
    // but we want a clean inequality assertion. 5ms gap is plenty.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const { data, error } = await sessions.alice.client
      .from('profiles')
      .update({
        display_name: 'Test Alice',
        bio: 'Owner update scenario AC5(b).',
        avatar_url: 'https://example.com/avatars/alice.png',
      })
      .eq('id', TEST_USERS.alice.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.display_name).toBe('Test Alice');
    expect(data?.bio).toBe('Owner update scenario AC5(b).');
    expect(data?.avatar_url).toBe('https://example.com/avatars/alice.png');
    expect(data?.updated_at).toBeTruthy();
    // updated_at must be strictly later than pre-update value
    expect(new Date(data!.updated_at).getTime()).toBeGreaterThan(
      new Date(beforeUpdatedAt!).getTime(),
    );
  });

  // -------------------------------------------------------------------------
  // AC5(c) — Non-owner reads other profile (permissive policy)
  // -------------------------------------------------------------------------
  it('AC5(c): non-owner reads other profile (select_public USING true)', async () => {
    const { data, error } = await sessions.bob.client
      .from('profiles')
      .select('id, username')
      .eq('id', TEST_USERS.alice.id)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(TEST_USERS.alice.id);
    expect(data?.username).toBe(TEST_USERS.alice.username);
  });

  // -------------------------------------------------------------------------
  // AC5(d) — Non-owner UPDATE blocked
  // -------------------------------------------------------------------------
  it('AC5(d): non-owner UPDATE blocked by RLS', async () => {
    // Bob attempts to mutate Alice's profile. RLS USING clause filters
    // the row out of Bob's UPDATE scope, so the UPDATE returns zero rows
    // affected. Supabase returns empty data (not an error code) for filtered
    // UPDATEs — this is by design (RLS is "row not visible", not "permission
    // denied"). We assert by re-reading: Alice's display_name must NOT have
    // changed to Bob's attempted value.
    const malicious = 'BOB-PWNED-ALICE';

    const updateRes = await sessions.bob.client
      .from('profiles')
      .update({ display_name: malicious })
      .eq('id', TEST_USERS.alice.id)
      .select();

    // Either error OR zero rows returned — both are acceptable RLS outcomes
    expect(
      updateRes.error === null ||
        /42501|RLS|row/i.test(updateRes.error?.code ?? updateRes.error?.message ?? ''),
    ).toBe(true);
    expect(updateRes.data ?? []).toHaveLength(0);

    // Read back via admin (bypasses RLS) — confirms Alice's row was NOT mutated
    const verify = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', TEST_USERS.alice.id)
      .single();

    expect(verify.error).toBeNull();
    expect(verify.data?.display_name).not.toBe(malicious);
  });

  // -------------------------------------------------------------------------
  // AC5(e) — Anonymous read
  // -------------------------------------------------------------------------
  it('AC5(e): anonymous client reads profiles (select_public)', async () => {
    const { data, error } = await anon
      .from('profiles')
      .select('id, username')
      .eq('id', TEST_USERS.alice.id)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(TEST_USERS.alice.id);
  });

  // -------------------------------------------------------------------------
  // AC5(f) — Anonymous UPDATE blocked
  // -------------------------------------------------------------------------
  it('AC5(f): anonymous UPDATE blocked by RLS', async () => {
    const malicious = 'ANON-PWNED';

    const updateRes = await anon
      .from('profiles')
      .update({ display_name: malicious })
      .eq('id', TEST_USERS.alice.id)
      .select();

    expect(updateRes.data ?? []).toHaveLength(0);

    const verify = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', TEST_USERS.alice.id)
      .single();

    expect(verify.error).toBeNull();
    expect(verify.data?.display_name).not.toBe(malicious);
  });

  // -------------------------------------------------------------------------
  // AC5(g) — Authenticated direct INSERT blocked
  // -------------------------------------------------------------------------
  it('AC5(g): authenticated direct INSERT into profiles is blocked', async () => {
    // Alice tries to insert a row for herself directly. No INSERT policy
    // exists — only the SECURITY DEFINER trigger inserts. Result: RLS denies.
    const { error } = await sessions.alice.client.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000009999',
      username: 'cifx-hax',
    });

    expect(error).not.toBeNull();
    expect(error?.code ?? error?.message ?? '').toMatch(/42501|RLS|row.level/i);
  });

  // -------------------------------------------------------------------------
  // AC5(h) — Trigger bootstrap creates profile row on auth.users INSERT
  // -------------------------------------------------------------------------
  it('AC5(h): auth_user_created trigger bootstraps profiles row', async () => {
    const username = 'cifx-smoke-bootstrap';
    const email = 'cifx-smoke@example.com';
    const id = '00000000-0000-0000-0000-000000001099';

    try {
      // Pre-cleanup (in case prior run leaked)
      await admin.auth.admin.deleteUser(id).catch(() => {});

      // Create user via admin — trigger fires AFTER INSERT on auth.users
      const { error: createErr } = await admin.auth.admin.createUser({
        id,
        email,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
        user_metadata: { username },
      });

      expect(createErr).toBeNull();

      // Verify exactly 1 profiles row exists with matching id + username
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .eq('id', id)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(id);
      expect(data?.username).toBe(username);
      // Trigger inserts only (id, username) — others remain NULL/default
      expect(data?.display_name).toBeNull();
      expect(data?.bio).toBeNull();
      expect(data?.avatar_url).toBeNull();
    } finally {
      // Always cleanup, even on assertion failure
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  });
});
