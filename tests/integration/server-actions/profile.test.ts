/**
 * Integration tests — Server Actions profile (Story 2.1).
 *
 * Cobre `updateUsername` (AC4) e `checkUsernameAvailability` (DP-1=a):
 *   1) checkUsernameAvailability: livre → available:true; em uso → false;
 *      formato inválido → { ok:false }
 *   2) updateUsername sem session → { ok:false, error:'Sessão expirada...' }
 *   3) updateUsername reservado → { ok:false } (barrado pelo schema)
 *   4) updateUsername válido autenticado → { ok:true } + row atualizada
 *      (+ updated_at tocado pelo trigger trg_profiles_set_updated_at)
 *   5) RACE CONDITION simulada — usuário A tenta o username já ocupado por B:
 *      colisão no UNIQUE citext (caminho Postgres 23505 / DP-4) →
 *      { ok:false, error:'Este username já está em uso' }
 *
 * Substrate: `biolink-dev`. Fixtures isolados por prefixo `cifx-prof-` +
 * UUID range `0…1031..1032` (distinto de auth.test.ts `…1011..1022` e
 * rls/profiles.test.ts `…1001/1002/1099`). Auth via o próprio
 * `@/lib/supabase/server` createClient (compartilha o cookie store mockado
 * com a Server Action — fluxo SSR real).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

import { admin, TEST_USER_PASSWORD } from '../helpers/test-users';

// ---------------------------------------------------------------------------
// Mock next/headers.cookies() — in-memory store por teste (espelha auth.test.ts)
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

const { updateUsername, checkUsernameAvailability } = await import('@/server/profile/actions');
const { createClient } = await import('@/lib/supabase/server');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_A = {
  id: '00000000-0000-0000-0000-000000001031',
  email: 'cifx-prof-a@biolink.dev',
  username: 'cifx-prof-a',
  password: TEST_USER_PASSWORD,
};
const USER_B = {
  id: '00000000-0000-0000-0000-000000001032',
  email: 'cifx-prof-b@biolink.dev',
  username: 'cifx-prof-taken',
  password: TEST_USER_PASSWORD,
};
const NEW_USERNAME = 'cifx-prof-new';

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
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email: u.email, password: u.password });
  expect(error).toBeNull();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Profile Server Actions (Story 2.1)', () => {
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

  it('checkUsernameAvailability: livre → available:true; em uso → false; inválido → { ok:false }', async () => {
    const free = await checkUsernameAvailability({ username: 'cifx-prof-free-xyz' });
    expect(free).toEqual({ ok: true, data: { available: true } });

    const taken = await checkUsernameAvailability({ username: USER_B.username });
    expect(taken).toEqual({ ok: true, data: { available: false } });

    // citext → case-insensitive: variação de caixa do username ocupado
    // também deve ser reportada como indisponível.
    const takenCase = await checkUsernameAvailability({ username: USER_B.username.toUpperCase() });
    // toUpperCase quebra o regex (a-z), então o schema barra antes do DB.
    expect(takenCase.ok).toBe(false);

    const invalid = await checkUsernameAvailability({ username: 'X' });
    expect(invalid.ok).toBe(false);
  }, 30_000);

  it('updateUsername sem session retorna { ok:false, error:"Sessão expirada..." }', async () => {
    // cookieStore vazio (beforeEach) — sem session ativa.
    const res = await updateUsername({ username: NEW_USERNAME });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/sessão expirada/i);
    }
  }, 30_000);

  it('updateUsername com username reservado retorna { ok:false } (barrado pelo schema)', async () => {
    await signInAs(USER_A);
    const res = await updateUsername({ username: 'admin' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Entrada inválida');
      expect(res.fieldErrors?.username).toBe('Este username é reservado');
    }
  }, 60_000);

  it('updateUsername válido autenticado → { ok:true } + row atualizada + updated_at tocado', async () => {
    // Captura updated_at pré-update (via admin, bypassa RLS).
    const before = await admin.from('profiles').select('updated_at').eq('id', USER_A.id).single();
    expect(before.error).toBeNull();
    const beforeUpdatedAt = before.data?.updated_at;

    await new Promise((r) => setTimeout(r, 5));

    await signInAs(USER_A);
    const res = await updateUsername({ username: NEW_USERNAME });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.id).toBe(USER_A.id);
      expect(res.data.username).toBe(NEW_USERNAME);
    }

    const after = await admin
      .from('profiles')
      .select('username, updated_at')
      .eq('id', USER_A.id)
      .single();
    expect(after.error).toBeNull();
    expect(after.data?.username).toBe(NEW_USERNAME);
    expect(new Date(after.data!.updated_at).getTime()).toBeGreaterThan(
      new Date(beforeUpdatedAt!).getTime(),
    );
  }, 60_000);

  it('RACE CONDITION: updateUsername para username já ocupado → { ok:false } (colisão 23505 / DP-4)', async () => {
    // USER_A (agora cifx-prof-new) tenta tomar o username de USER_B.
    // O UNIQUE de citext (migration 0002:66) é a garantia race-free —
    // o UPDATE colide e a Server Action mapeia 23505 para erro tratado.
    await signInAs(USER_A);
    const res = await updateUsername({ username: USER_B.username });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Este username já está em uso');
      expect(res.fieldErrors?.username).toBe('Este username já está em uso');
    }

    // USER_B permanece dono do username (não foi mutado).
    const b = await admin.from('profiles').select('username').eq('id', USER_B.id).single();
    expect(b.data?.username).toBe(USER_B.username);
  }, 60_000);
});
