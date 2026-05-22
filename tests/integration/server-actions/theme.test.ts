/**
 * Integration tests — Server Action `updateTheme` (Story 3.3).
 *
 * Cobre:
 *   (a) sem session → { ok:false, error:'Sessão expirada...' }
 *   (b) input inválido (theme:'sepia') → { ok:false, error:'Tema inválido' }
 *       SEM update no DB
 *   (c) válido autenticado → { ok:true }, row atualizada + updated_at tocado
 *       pelo trigger trg_pages_set_updated_at
 *   (d) two-users isolation — USER_B tenta updateTheme enquanto USER_A é
 *       owner: cada um só vê sua própria page (RLS pages_update_own);
 *       page de A intacta após mutação de B
 *   (e) smoke sequencing — trocar light → dark → brand → light, todos
 *       retornam ok:true e a row reflete a última escolha
 *
 * Substrate: `biolink-dev`. Fixtures isolados por prefixo `cifx-theme-` +
 * UUID range `0…1051/1052` (distinto de auth `…1011-1022`, profile
 * `…1031/1032`, links `…1041-1044`, rls `…1001-1099`). Auth via o próprio
 * `@/lib/supabase/server` createClient (cookie store mockado compartilhado
 * com a Server Action — fluxo SSR real).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

import { admin, TEST_USER_PASSWORD } from '../helpers/test-users';

// ---------------------------------------------------------------------------
// Mock next/headers.cookies() — in-memory store por teste (espelha profile.test.ts)
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

// revalidateUserSurface chama revalidatePath de next/cache — no-op fora de
// um request Next. Mockar mantém a Server Action testável isoladamente.
vi.mock('@/lib/cache', () => ({
  revalidateUserSurface: vi.fn(),
}));

const { updateTheme } = await import('@/server/page/actions');
const { createClient } = await import('@/lib/supabase/server');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_A = {
  id: '00000000-0000-0000-0000-000000001051',
  email: 'cifx-theme-a@biolink.dev',
  username: 'cifx-theme-a',
  password: TEST_USER_PASSWORD,
};
const USER_B = {
  id: '00000000-0000-0000-0000-000000001052',
  email: 'cifx-theme-b@biolink.dev',
  username: 'cifx-theme-b',
  password: TEST_USER_PASSWORD,
};

async function fullCleanup() {
  await admin.auth.admin.deleteUser(USER_A.id).catch(() => {});
  await admin.auth.admin.deleteUser(USER_B.id).catch(() => {});
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

/** Autentica no cookie store mockado (mesmo store que a Server Action lê). */
async function signInAs(u: typeof USER_A) {
  cookieStore = new Map();
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email: u.email, password: u.password });
  expect(error).toBeNull();
}

async function getPageTheme(userId: string) {
  const { data, error } = await admin
    .from('pages')
    .select('theme, updated_at')
    .eq('profile_id', userId)
    .single();
  expect(error).toBeNull();
  return data!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('updateTheme Server Action (Story 3.3)', () => {
  beforeAll(async () => {
    await fullCleanup();
    await createUser(USER_A);
    await createUser(USER_B);
  }, 60_000);

  afterAll(async () => {
    await fullCleanup();
  }, 60_000);

  beforeEach(() => {
    cookieStore = new Map();
  });

  it('(a) sem session → { ok:false, error:"Sessão expirada..." }', async () => {
    const res = await updateTheme({ theme: 'dark' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/sessão expirada/i);
    }
  }, 30_000);

  it('(b) input inválido (theme:"sepia") → { ok:false, error:"Tema inválido" } sem update no DB', async () => {
    await signInAs(USER_A);

    // Snapshot do tema atual (default 'light' pós-trigger de Story 2.2).
    const before = await getPageTheme(USER_A.id);

    // 'sepia' não existe no enum theme_preset — Zod barra no boundary.
    const res = await updateTheme({ theme: 'sepia' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Tema inválido');
      expect(res.fieldErrors?.theme).toBeTruthy();
    }

    // Nenhum update ocorreu: theme inalterado.
    const after = await getPageTheme(USER_A.id);
    expect(after.theme).toBe(before.theme);
  }, 60_000);

  it('(c) válido autenticado → { ok:true }, theme atualizado + updated_at tocado pelo trigger', async () => {
    await signInAs(USER_A);

    const before = await getPageTheme(USER_A.id);
    await new Promise((r) => setTimeout(r, 5));

    const res = await updateTheme({ theme: 'dark' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.profile_id).toBe(USER_A.id);
      expect(res.data.theme).toBe('dark');
    }

    const after = await getPageTheme(USER_A.id);
    expect(after.theme).toBe('dark');
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime(),
    );
  }, 60_000);

  it('(d) two-users isolation: USER_B muta SUA page; page de USER_A intacta (RLS pages_update_own)', async () => {
    // Estado conhecido — USER_A com 'dark' (do teste c).
    const aBefore = await getPageTheme(USER_A.id);
    expect(aBefore.theme).toBe('dark');

    // USER_B autentica e seta 'brand' na PRÓPRIA page.
    await signInAs(USER_B);
    const res = await updateTheme({ theme: 'brand' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.profile_id).toBe(USER_B.id);
      expect(res.data.theme).toBe('brand');
    }

    // USER_A intacto: RLS pages_update_own restringe ao owner — USER_B
    // jamais alcança a row de A. updated_at de A NÃO foi tocado.
    const aAfter = await getPageTheme(USER_A.id);
    expect(aAfter.theme).toBe('dark');
    expect(aAfter.updated_at).toBe(aBefore.updated_at);

    const bAfter = await getPageTheme(USER_B.id);
    expect(bAfter.theme).toBe('brand');
  }, 60_000);

  it('(e) sequenciamento light → dark → brand → light: cada chamada ok:true e row reflete a última', async () => {
    await signInAs(USER_A);

    const sequence = ['light', 'dark', 'brand', 'light'] as const;
    for (const theme of sequence) {
      const res = await updateTheme({ theme });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.theme).toBe(theme);
    }

    const final = await getPageTheme(USER_A.id);
    expect(final.theme).toBe('light');
  }, 90_000);
});
