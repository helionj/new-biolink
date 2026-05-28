/**
 * Integration tests — Server Actions account (Story 4.5, AC2/AC3/AC4/AC5).
 *
 * Cenários cobertos:
 *   (a) exportAccountData retorna shape completo (profile/page/links/clicks/views + _meta.warning).
 *   (b) exportAccountData para user "minimal" (sem links/clicks/views além da
 *       page criada pelo trigger).
 *   (c) deleteAccount com confirmUsername errado → { ok:false, error:/não confere/i }
 *       e USER permanece no DB (auth.users + profiles ainda existem).
 *   (d) deleteAccount com confirmUsername correto → cascade limpa 5 tabelas
 *       (profiles, pages, links, click_events, page_views) + auth.users.
 *   (e) deleteAccount unauthenticated → { ok:false, error:/sessão expirada/i }.
 *   (f) Storage cleanup: upload em avatars/{user.id}/* → deleteAccount → list
 *       retorna vazio.
 *
 * Substrate: `biolink-dev` (CI-001 RESOLVED). Fixtures isolados por prefixo
 * `cifx-acct-` + UUID range `0…1051/1052` (distinto de auth `…1011..1022`,
 * profile `…1031/1032`, links `…1041/1042`).
 *
 * Setup: `beforeEach` recria alice/bob (cenário (d) destrói alice via
 * deleteAccount, então beforeAll não basta — DEV-14).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

import { admin, TEST_USER_PASSWORD } from '../helpers/test-users';

// ---------------------------------------------------------------------------
// Mocks (alinhados com profile.test.ts e links.test.ts)
// ---------------------------------------------------------------------------
type CookieEntry = { name: string; value: string; [k: string]: unknown };
let cookieStore: Map<string, CookieEntry> = new Map();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => Array.from(cookieStore.values()).map((c) => ({ name: c.name, value: c.value })),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieStore.set(name, { name, value, ...(options ?? {}) });
    },
    get: (name: string) => cookieStore.get(name),
    delete: (name: string) => cookieStore.delete(name),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT;${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;${url}`;
    throw err;
  },
}));

const { exportAccountData, deleteAccount } = await import('@/server/account/actions');
const { createClient } = await import('@/lib/supabase/server');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_A = {
  id: '00000000-0000-0000-0000-000000001051',
  email: 'cifx-acct-a@biolink.dev',
  username: 'cifx-acct-a',
  password: TEST_USER_PASSWORD,
};
const USER_B = {
  id: '00000000-0000-0000-0000-000000001052',
  email: 'cifx-acct-b@biolink.dev',
  username: 'cifx-acct-b',
  password: TEST_USER_PASSWORD,
};

let pageA: string;
let pageB: string;
let aliceLinkIds: string[] = [];

async function fullCleanup() {
  // delete user via admin cascateia 5 tabelas + Storage best-effort.
  // Storage cleanup é responsabilidade da Server Action; aqui o admin não
  // toca em storage.objects, mas a Server Action remove em (f) e o
  // setup/teardown também pode deixar resíduos — limpamos defensivamente.
  for (const id of [USER_A.id, USER_B.id]) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
    try {
      const { data } = await admin.storage.from('avatars').list(id);
      if (data && data.length > 0) {
        await admin.storage
          .from('avatars')
          .remove(data.map((f) => `${id}/${f.name}`))
          .catch(() => {});
      }
    } catch {
      // best-effort
    }
  }
}

async function createUser(u: typeof USER_A) {
  const { error } = await admin.auth.admin.createUser({
    id: u.id,
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { username: u.username },
  });
  expect(error).toBeNull();
}

async function resolvePage(userId: string): Promise<string> {
  const { data, error } = await admin.from('pages').select('id').eq('profile_id', userId).single();
  expect(error).toBeNull();
  return data!.id;
}

async function signInAs(u: typeof USER_A) {
  cookieStore = new Map();
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email: u.email, password: u.password });
  expect(error).toBeNull();
}

/** Seeda alice com 2 links + 3 click_events + 2 page_views (cenário a). */
async function seedAliceContent() {
  const linksPayload = [
    { page_id: pageA, title: 'Portfólio', url: 'https://portfolio.example', position: 0 },
    { page_id: pageA, title: 'GitHub', url: 'https://github.example', position: 1 },
  ];
  const links = await admin.from('links').insert(linksPayload).select('id');
  expect(links.error).toBeNull();
  aliceLinkIds = (links.data ?? []).map((l) => l.id);
  expect(aliceLinkIds).toHaveLength(2);

  // 3 click_events distribuídos nos 2 links.
  const clicksPayload = [
    { link_id: aliceLinkIds[0]! },
    { link_id: aliceLinkIds[0]! },
    { link_id: aliceLinkIds[1]! },
  ];
  const clicks = await admin.from('click_events').insert(clicksPayload).select('id');
  expect(clicks.error).toBeNull();

  // 2 page_views.
  const views = await admin
    .from('page_views')
    .insert([{ page_id: pageA }, { page_id: pageA }])
    .select('id');
  expect(views.error).toBeNull();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Account Server Actions (Story 4.5)', () => {
  beforeAll(async () => {
    await fullCleanup();
  }, 60_000);

  afterAll(async () => {
    await fullCleanup();
  }, 60_000);

  beforeEach(async () => {
    // DEV-14: cenário (d) destrói alice — recriamos por teste para garantir
    // isolamento (mesmo padrão de auth.test.ts que muta users).
    await fullCleanup();
    await createUser(USER_A);
    await createUser(USER_B);
    pageA = await resolvePage(USER_A.id);
    pageB = await resolvePage(USER_B.id);
    aliceLinkIds = [];
    cookieStore = new Map();
  }, 60_000);

  it('(a) exportAccountData retorna shape completo + _meta.warning (AC2)', async () => {
    await seedAliceContent();
    await signInAs(USER_A);

    const res = await exportAccountData();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.profile?.id).toBe(USER_A.id);
    expect(res.data.profile?.username).toBe(USER_A.username);
    expect(res.data.page?.id).toBe(pageA);
    expect(res.data.links).toHaveLength(2);
    expect(res.data.click_events).toHaveLength(3);
    expect(res.data.page_views).toHaveLength(2);

    // _meta — warning é string não-vazia, exported_at parseable.
    expect(typeof res.data._meta.warning).toBe('string');
    expect(res.data._meta.warning.length).toBeGreaterThan(0);
    expect(Number.isNaN(new Date(res.data._meta.exported_at).getTime())).toBe(false);
  }, 90_000);

  it('(b) exportAccountData minimal (sem seed) retorna page criada pelo trigger e arrays vazios', async () => {
    await signInAs(USER_B);

    const res = await exportAccountData();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.profile?.id).toBe(USER_B.id);
    expect(res.data.page?.id).toBe(pageB);
    expect(res.data.links).toEqual([]);
    expect(res.data.click_events).toEqual([]);
    expect(res.data.page_views).toEqual([]);
  }, 60_000);

  it('(c) deleteAccount com confirmUsername errado → { ok:false } e alice permanece (AC3)', async () => {
    await signInAs(USER_A);
    const res = await deleteAccount({ confirmUsername: 'errado-nope' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/não confere/i);
    }

    // alice ainda existe.
    const profile = await admin.from('profiles').select('id').eq('id', USER_A.id).maybeSingle();
    expect(profile.data?.id).toBe(USER_A.id);
  }, 60_000);

  it('(d) deleteAccount correto cascateia em 5 tabelas + auth.users (AC3+AC5)', async () => {
    await seedAliceContent();
    await signInAs(USER_A);

    const res = await deleteAccount({ confirmUsername: USER_A.username });
    expect(res.ok).toBe(true);

    // 5 tabelas + auth.users limpas via cascade (DEV-3 / 0002:53).
    const profile = await admin.from('profiles').select('id').eq('id', USER_A.id).maybeSingle();
    expect(profile.data).toBeNull();

    const page = await admin.from('pages').select('id').eq('id', pageA).maybeSingle();
    expect(page.data).toBeNull();

    const links = await admin.from('links').select('id').eq('page_id', pageA);
    expect(links.data ?? []).toHaveLength(0);

    const clicks = await admin.from('click_events').select('id').in('link_id', aliceLinkIds);
    expect(clicks.data ?? []).toHaveLength(0);

    const views = await admin.from('page_views').select('id').eq('page_id', pageA);
    expect(views.data ?? []).toHaveLength(0);

    // auth.users limpo.
    const { data: authUser } = await admin.auth.admin.getUserById(USER_A.id);
    expect(authUser.user).toBeNull();

    // alice case-insensitive: variar caso também deveria ter funcionado (DEV-5).
  }, 90_000);

  it('(d.2) deleteAccount aceita confirmUsername case-insensitive (DEV-5 mirror)', async () => {
    await signInAs(USER_A);

    const res = await deleteAccount({ confirmUsername: USER_A.username.toUpperCase() });
    expect(res.ok).toBe(true);

    const { data: authUser } = await admin.auth.admin.getUserById(USER_A.id);
    expect(authUser.user).toBeNull();
  }, 60_000);

  it('(e) deleteAccount sem session → { ok:false, error:/sessão expirada/i }', async () => {
    // cookieStore já vazio do beforeEach — sem signIn.
    const res = await deleteAccount({ confirmUsername: USER_A.username });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/sessão expirada/i);
    }

    // alice intacta — não foi tocada.
    const profile = await admin.from('profiles').select('id').eq('id', USER_A.id).maybeSingle();
    expect(profile.data?.id).toBe(USER_A.id);
  }, 60_000);

  it('(f) Storage cleanup remove avatares de avatars/{user.id}/ após delete (DEV-4)', async () => {
    // Upload manual via admin (bypassa RLS de Storage — força avatar órfão se
    // a Server Action não fizer cleanup).
    const filePath = `${USER_A.id}/avatar.png`;
    const fileContent = new Uint8Array([
      // PNG header (mínimo válido — 8 bytes assinatura + IHDR mínimo)
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const uploadRes = await admin.storage.from('avatars').upload(filePath, fileContent, {
      upsert: true,
      contentType: 'image/png',
    });
    expect(uploadRes.error).toBeNull();

    // Confirma que o objeto está lá antes do delete.
    const beforeList = await admin.storage.from('avatars').list(USER_A.id);
    expect(beforeList.error).toBeNull();
    expect((beforeList.data ?? []).length).toBeGreaterThan(0);

    await signInAs(USER_A);
    const res = await deleteAccount({ confirmUsername: USER_A.username });
    expect(res.ok).toBe(true);

    // Após delete, avatars/{user.id}/ está vazio.
    const afterList = await admin.storage.from('avatars').list(USER_A.id);
    expect(afterList.error).toBeNull();
    expect(afterList.data ?? []).toHaveLength(0);
  }, 90_000);
});
