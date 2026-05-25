/**
 * Integration tests — Story 3.4 AC2: Supabase Storage RLS for `avatars` bucket.
 *
 * 5 scenarios (Task 1.5 a-e):
 *   a) anon CAN SELECT any object in `avatars`           (avatars_select_public)
 *   b) owner CAN INSERT into own folder `{uid}/*`        (avatars_insert_own)
 *   c) owner CANNOT INSERT into another user's folder   (RLS denial)
 *   d) owner CAN UPDATE own object (upsert overwrite)    (avatars_update_own)
 *   e) owner CAN DELETE own; CANNOT DELETE another's    (avatars_delete_own)
 *
 * Substrate: `biolink-dev` (ref ibpliihqaceafdykgwiu); reuses `test-users.ts`
 * unchanged (TEST_USERS.alice/bob — already provisioned by setupTestUsers).
 *
 * Cleanup strategy: each test wipes its own uploads in `finally` via `admin`
 * (service-role bypasses RLS). `beforeAll`/`afterAll` are defensive sweeps of
 * the test folders for any leftovers from a crashed prior run.
 *
 * File content: tiny 1×1 transparent PNG (67 bytes) — valid `image/png` MIME
 * so the bucket's `allowed_mime_types` check passes; size << 1 MB limit.
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

// 1×1 transparent PNG, 67 bytes — minimal valid image to satisfy the bucket's
// MIME guard. Base64 decoded to a Uint8Array; wrapped in a Blob with the
// correct content-type so the Storage API attaches the right MIME header.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function makeTinyPng(): Blob {
  const binary = atob(TINY_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

describe('RLS: storage.objects / avatars bucket (Story 3.4 AC2)', () => {
  let sessions: { alice: TestSession; bob: TestSession };

  beforeAll(async () => {
    sessions = await setupTestUsers();

    // Defensive sweep: any leftover objects in our test folders.
    await admin.storage
      .from('avatars')
      .remove([
        `${TEST_USERS.alice.id}/avatar.png`,
        `${TEST_USERS.alice.id}/anon-readable.png`,
        `${TEST_USERS.bob.id}/avatar.png`,
      ]);
  }, 60_000);

  afterAll(async () => {
    // Wipe any test objects regardless of test outcome.
    await admin.storage
      .from('avatars')
      .remove([
        `${TEST_USERS.alice.id}/avatar.png`,
        `${TEST_USERS.alice.id}/anon-readable.png`,
        `${TEST_USERS.bob.id}/avatar.png`,
      ]);
    await cleanupTestUsers();
  }, 60_000);

  // -------------------------------------------------------------------------
  // AC2(a) — anon CAN SELECT any object in `avatars` (avatars_select_public)
  // -------------------------------------------------------------------------
  it('AC2(a): anon downloads a public avatar object (avatars_select_public)', async () => {
    const path = `${TEST_USERS.alice.id}/anon-readable.png`;
    try {
      // Seed via admin (bypasses RLS) so the object exists for anon to fetch.
      const upload = await admin.storage
        .from('avatars')
        .upload(path, makeTinyPng(), { contentType: 'image/png', upsert: true });
      expect(upload.error).toBeNull();

      // Anon download — RLS `avatars_select_public` (USING bucket_id='avatars')
      // authorizes the SELECT on storage.objects. The download() helper hits
      // the public object URL via Storage REST.
      const { data, error } = await anon.storage.from('avatars').download(path);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.size).toBeGreaterThan(0);
    } finally {
      await admin.storage.from('avatars').remove([path]);
    }
  });

  // -------------------------------------------------------------------------
  // AC2(b) — owner CAN INSERT into own folder (avatars_insert_own)
  // -------------------------------------------------------------------------
  it('AC2(b): owner uploads into own folder (avatars_insert_own)', async () => {
    const path = `${TEST_USERS.alice.id}/avatar.png`;
    try {
      const { data, error } = await sessions.alice.client.storage
        .from('avatars')
        .upload(path, makeTinyPng(), { contentType: 'image/png', upsert: false });

      expect(error).toBeNull();
      expect(data?.path).toBe(path);

      // Verify via admin that the object materialized in storage.objects.
      const list = await admin.storage.from('avatars').list(TEST_USERS.alice.id);
      expect(list.error).toBeNull();
      expect(list.data?.some((o) => o.name === 'avatar.png')).toBe(true);
    } finally {
      await admin.storage.from('avatars').remove([path]);
    }
  });

  // -------------------------------------------------------------------------
  // AC2(c) — owner CANNOT INSERT into another user's folder (RLS denial)
  // -------------------------------------------------------------------------
  it("AC2(c): owner cannot upload into another user's folder (RLS WITH CHECK)", async () => {
    // alice tries to put an object under bob's folder. WITH CHECK on
    // avatars_insert_own (foldername[1] = auth.uid()) does NOT match — RLS
    // rejects with status 403 / Unauthorized.
    const intrudedPath = `${TEST_USERS.bob.id}/avatar.png`;
    try {
      const { data, error } = await sessions.alice.client.storage
        .from('avatars')
        .upload(intrudedPath, makeTinyPng(), { contentType: 'image/png' });

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      // Supabase Storage surfaces RLS denials as 403/4xx; check the message
      // pattern instead of an exact code (Storage REST does not echo 42501).
      expect(error?.message ?? '').toMatch(/unauthorized|denied|policy|rls/i);

      // Admin verification: nothing was created under bob's folder by alice.
      const list = await admin.storage.from('avatars').list(TEST_USERS.bob.id);
      expect(list.error).toBeNull();
      expect(list.data?.some((o) => o.name === 'avatar.png')).toBe(false);
    } finally {
      await admin.storage.from('avatars').remove([intrudedPath]);
    }
  });

  // -------------------------------------------------------------------------
  // AC2(d) — owner CAN UPDATE (overwrite via upsert) own object
  // -------------------------------------------------------------------------
  it('AC2(d): owner overwrites own object via upsert (avatars_update_own)', async () => {
    const path = `${TEST_USERS.alice.id}/avatar.png`;
    try {
      // Initial INSERT (insert_own).
      const first = await sessions.alice.client.storage
        .from('avatars')
        .upload(path, makeTinyPng(), { contentType: 'image/png', upsert: false });
      expect(first.error).toBeNull();

      // Second upload with upsert:true → triggers UPDATE on storage.objects.
      // avatars_update_own USING (foldername[1] = auth.uid()) matches.
      const second = await sessions.alice.client.storage
        .from('avatars')
        .upload(path, makeTinyPng(), { contentType: 'image/png', upsert: true });

      expect(second.error).toBeNull();
      expect(second.data?.path).toBe(path);
    } finally {
      await admin.storage.from('avatars').remove([path]);
    }
  });

  // -------------------------------------------------------------------------
  // AC2(e) — owner CAN DELETE own; CANNOT DELETE another's (avatars_delete_own)
  // -------------------------------------------------------------------------
  it("AC2(e): owner deletes own object; cannot delete another user's", async () => {
    const aliceObj = `${TEST_USERS.alice.id}/avatar.png`;
    const bobObj = `${TEST_USERS.bob.id}/avatar.png`;
    try {
      // Seed both objects via admin (bypasses RLS).
      const seedAlice = await admin.storage
        .from('avatars')
        .upload(aliceObj, makeTinyPng(), { contentType: 'image/png', upsert: true });
      expect(seedAlice.error).toBeNull();

      const seedBob = await admin.storage
        .from('avatars')
        .upload(bobObj, makeTinyPng(), { contentType: 'image/png', upsert: true });
      expect(seedBob.error).toBeNull();

      // alice deletes her OWN object — avatars_delete_own matches.
      const del = await sessions.alice.client.storage.from('avatars').remove([aliceObj]);
      expect(del.error).toBeNull();
      // remove() returns the array of objects that were removed (RLS-filtered).
      expect(del.data?.map((o) => o.name)).toContain(aliceObj);

      // alice tries to delete bob's object — RLS USING clause filters it out;
      // Storage `.remove()` does NOT error on no-match (mirrors PostgREST RLS
      // semantics for DELETE), but returns an empty array of removed objects.
      const cross = await sessions.alice.client.storage.from('avatars').remove([bobObj]);
      // Either an error OR an empty result is acceptable proof of RLS denial.
      const denied =
        cross.error !== null ||
        (Array.isArray(cross.data) && cross.data.every((o) => o.name !== bobObj));
      expect(denied).toBe(true);

      // Admin verification: bob's object is STILL present.
      const verifyBob = await admin.storage.from('avatars').list(TEST_USERS.bob.id);
      expect(verifyBob.error).toBeNull();
      expect(verifyBob.data?.some((o) => o.name === 'avatar.png')).toBe(true);
    } finally {
      await admin.storage.from('avatars').remove([aliceObj, bobObj]);
    }
  });
});
