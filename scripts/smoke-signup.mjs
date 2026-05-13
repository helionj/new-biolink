#!/usr/bin/env node
/**
 * Smoke test — Story 1.4 Task 6.
 *
 * Validates the PUBLIC signup path end-to-end:
 *   1. Anonymous client calls `supabase.auth.signUp({ email, password, options.data.username })`
 *   2. Trigger `auth_user_created` fires AFTER INSERT on auth.users
 *   3. Service-role client verifies exactly 1 profiles row was created
 *   4. Service-role client cleans up the test user (cascade drops profile)
 *
 * Differences vs `tests/integration/rls/profiles.test.ts` AC5(h):
 *   - AC5(h) uses `auth.admin.createUser` (admin API, bypasses normal flow)
 *   - This smoke uses `auth.signUp` (public anon endpoint — what real users hit)
 *
 * Usage (LOCAL dev only):
 *   $ node scripts/smoke-signup.mjs
 *
 * Pre-requisites:
 *   - .env.local populated with NEXT_PUBLIC_SUPABASE_URL,
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 0002_profiles.sql applied to the linked Supabase project
 *
 * Output: human-readable report. Exit 0 on success, 1 on any failure.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars. Populate .env.local first.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Test fixture (smoke prefix — distinct from cifx- integration fixtures)
// ---------------------------------------------------------------------------
const timestamp = Date.now();
const username = `smoke-${timestamp}`;
// Supabase Auth rejeita @example.com/org/net (RFC reserved test domains).
// @biolink.dev é real-looking TLD, sem entrega real configurada — sem spam.
const email = `${username}@biolink.dev`;
const password = 'smoke-signup-test-pw-32-chars-min'; // gitleaks:allow — smoke test fixture, no real secret

console.log(`\n🌬️  Smoke signup — Story 1.4 Task 6`);
console.log(`   timestamp: ${new Date().toISOString()}`);
console.log(`   username:  ${username}`);
console.log(`   email:     ${email}\n`);

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let createdUserId = null;
let exitCode = 0;

try {
  // -------------------------------------------------------------------------
  // 1. Call public signUp
  // -------------------------------------------------------------------------
  console.log('1️⃣  Calling anon.auth.signUp()...');
  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) throw new Error(`signUp failed: ${error.message} (code=${error.code ?? 'n/a'})`);
  if (!data?.user) throw new Error('signUp returned no user');

  createdUserId = data.user.id;
  console.log(`   ✅ user created — id=${createdUserId}\n`);

  // -------------------------------------------------------------------------
  // 2. Verify profile was created by the trigger (1 row, correct shape)
  // -------------------------------------------------------------------------
  console.log('2️⃣  Verifying trigger bootstrapped profile...');
  const { data: profile, error: queryErr } = await admin
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .eq('id', createdUserId)
    .single();

  if (queryErr) throw new Error(`profile query failed: ${queryErr.message}`);
  if (!profile) throw new Error('profile not found');
  if (profile.id !== createdUserId) throw new Error(`profile.id mismatch: ${profile.id}`);
  if (profile.username !== username) {
    throw new Error(`profile.username mismatch: expected=${username} got=${profile.username}`);
  }
  if (profile.display_name !== null) {
    throw new Error(`profile.display_name should be NULL on bootstrap, got=${profile.display_name}`);
  }
  if (profile.bio !== null) {
    throw new Error(`profile.bio should be NULL on bootstrap, got=${profile.bio}`);
  }
  if (profile.avatar_url !== null) {
    throw new Error(`profile.avatar_url should be NULL on bootstrap`);
  }

  console.log(`   ✅ profile created via trigger`);
  console.log(`      username:     ${profile.username}`);
  console.log(`      display_name: ${profile.display_name}`);
  console.log(`      bio:          ${profile.bio}`);
  console.log(`      created_at:   ${profile.created_at}\n`);

  // -------------------------------------------------------------------------
  // 3. Cascade verification — delete user, profile should disappear
  // -------------------------------------------------------------------------
  console.log('3️⃣  Cleanup: admin.auth.admin.deleteUser()...');
  const { error: delErr } = await admin.auth.admin.deleteUser(createdUserId);
  if (delErr) throw new Error(`deleteUser failed: ${delErr.message}`);

  const { data: orphaned } = await admin
    .from('profiles')
    .select('id')
    .eq('id', createdUserId)
    .maybeSingle();

  if (orphaned) {
    throw new Error(`CASCADE failed — profile orphaned after auth.users delete: ${orphaned.id}`);
  }

  console.log(`   ✅ user deleted, profile cascade-deleted\n`);
  console.log('🎉 Smoke signup PASS — public signup path operational end-to-end.\n');
} catch (err) {
  console.error(`\n❌ FAIL: ${err.message}\n`);
  exitCode = 1;
} finally {
  // Defensive cleanup if something failed mid-flight
  if (createdUserId && exitCode !== 0) {
    console.log('🧹 Defensive cleanup...');
    await admin.auth.admin.deleteUser(createdUserId).catch(() => {});
  }
}

process.exit(exitCode);
