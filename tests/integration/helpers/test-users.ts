/**
 * Integration test fixtures for Story 1.4 (RLS profiles).
 *
 * Strategy: reuse `biolink-dev` project for CI (CI-001 alt B revisado).
 * Isolation by convention:
 *   - usernames prefixed with `cifx-` to never collide with manual signups
 *     or seed demos (alice/bob/carol from supabase/seed.sql)
 *   - UUIDs in the 0…00001nnn range, separate from seed (0…0000nnn)
 *
 * Cleanup runs in beforeAll AND afterAll — defensive against leftovers from
 * a prior crashed run.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Env validation (fail-fast with actionable message)
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. ` +
        `Local: populate .env.local (see docs/dev-setup.md §2). ` +
        `CI: set in GH Actions secrets (see ci.yml env: block).`,
    );
  }
  return value;
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

// ---------------------------------------------------------------------------
// Fixtures — never modify these UUIDs/usernames without updating cleanup logic
// ---------------------------------------------------------------------------
export const TEST_USER_PASSWORD = 'integration-test-pw-32-chars-min'; // gitleaks:allow — fixture, no real secret

export const TEST_USERS = {
  alice: {
    id: '00000000-0000-0000-0000-000000001001',
    email: 'cifx-alice@example.com',
    username: 'cifx-alice',
  },
  bob: {
    id: '00000000-0000-0000-0000-000000001002',
    email: 'cifx-bob@example.com',
    username: 'cifx-bob',
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

export interface TestSession {
  /** Supabase JS client authenticated as this test user (RLS applies). */
  client: SupabaseClient<Database>;
  user: (typeof TEST_USERS)[TestUserKey];
}

// ---------------------------------------------------------------------------
// Shared clients (admin = service-role bypasses RLS; anon = anonymous)
// ---------------------------------------------------------------------------
export const admin: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const anon: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// ---------------------------------------------------------------------------
// setupTestUsers — create alice + bob with authenticated clients each
// ---------------------------------------------------------------------------
export async function setupTestUsers(): Promise<Record<TestUserKey, TestSession>> {
  // Defensive cleanup first (covers leftovers from crashed prior runs)
  await cleanupTestUsers();

  const sessions = {} as Record<TestUserKey, TestSession>;

  for (const key of Object.keys(TEST_USERS) as TestUserKey[]) {
    const user = TEST_USERS[key];

    // Create user via service-role admin API. Trigger auth_user_created
    // bootstraps the profile row from raw_user_meta_data.username.
    const { error: createErr } = await admin.auth.admin.createUser({
      id: user.id, // Deterministic UUID — matches across test runs
      email: user.email,
      password: TEST_USER_PASSWORD,
      email_confirm: true, // Skip confirmation flow
      user_metadata: { username: user.username },
    });

    if (createErr) {
      throw new Error(`Failed to create test user ${user.username}: ${createErr.message}`);
    }

    // Create authenticated client for this user via signInWithPassword.
    // Each user gets its own client (own JWT, own auth.uid()).
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: signInErr } = await client.auth.signInWithPassword({
      email: user.email,
      password: TEST_USER_PASSWORD,
    });

    if (signInErr) {
      throw new Error(`Failed to sign in as ${user.username}: ${signInErr.message}`);
    }

    sessions[key] = { client, user };
  }

  return sessions;
}

// ---------------------------------------------------------------------------
// cleanupTestUsers — delete by known UUID + defensive prefix sweep
// ---------------------------------------------------------------------------
export async function cleanupTestUsers(): Promise<void> {
  // 1. Delete by known UUIDs (matches fixtures even if username was mutated)
  for (const user of Object.values(TEST_USERS)) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error && !isNotFoundError(error)) {
      // Swallow "User not found" (404) — first run after fresh DB or after
      // previous successful cleanup.
      // Rethrow only on unexpected errors.
      throw new Error(`Cleanup deleteUser(${user.id}) failed: ${error.message}`);
    }
  }

  // 2. Defensive sweep: any leftover cifx-* users with non-fixed UUIDs
  //    (e.g., AC5(h) trigger bootstrap test creates an ad-hoc user with
  //    UUID ...1099; covered by its own try/finally, but sweep is insurance
  //    against process crashes). Use Supabase SDK default perPage (50) —
  //    larger values triggered "Database error finding users" 5xx in tests
  //    post-`db reset` (likely internal Supabase admin API limit). Page
  //    through until empty.
  //
  //    Best-effort: sweep errors are LOGGED but DO NOT FAIL setup. The
  //    primary cleanup (step 1, by fixed UUID) is the contractual guarantee;
  //    the sweep is opportunistic.
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page });
    if (error) {
      // Log but don't fail — UUID-based cleanup above is sufficient

      console.warn(`[test-users] sweep listUsers(page=${page}) failed: ${error.message}`);
      break;
    }
    if (!data.users.length) break;

    const testLeftovers = data.users.filter((u) => {
      const meta = u.user_metadata as { username?: string } | null;
      return meta?.username?.startsWith('cifx-') ?? false;
    });

    for (const leftover of testLeftovers) {
      const { error: delErr } = await admin.auth.admin.deleteUser(leftover.id);
      if (delErr && !isNotFoundError(delErr)) {
        console.warn(`[test-users] sweep delete ${leftover.id} failed: ${delErr.message}`);
      }
    }

    // SDK default perPage is 50; if we got fewer, we're on the last page
    if (data.users.length < 50) break;
    page += 1;
    if (page > 100) break; // Hard safety — 5000 users is way beyond any test scenario
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isNotFoundError(err: { status?: number; message?: string } | null): boolean {
  if (!err) return false;
  if (err.status === 404) return true;
  return /not\s*found/i.test(err.message ?? '');
}
