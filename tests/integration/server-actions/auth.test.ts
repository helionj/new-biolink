/**
 * Integration tests — Story 1.5 AC8: Server Actions signUp/signIn/signOut.
 *
 * 4 cenários:
 *   1) signUp válido → cria auth.users + profiles row (via trigger 1.4)
 *   2) signUp com username existente → ActionResult { ok: false }
 *   3) signIn credenciais válidas → redirect (NEXT_REDIRECT)
 *   4) signOut → redirect (NEXT_REDIRECT)
 *
 * Substrate: `biolink-dev`. Fixtures isolated por prefixo `cifx-` + UUIDs
 * `0…1011..1014`. Note: Server Actions usam createClient() from
 * `@/lib/supabase/server` que depende de `next/headers` (cookies()).
 * Aqui mockamos `next/headers.cookies()` para um in-memory store +
 * `next/navigation.redirect` para arremessar `NEXT_REDIRECT` digest error.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

import { admin, TEST_USER_PASSWORD } from '../helpers/test-users';

// ---------------------------------------------------------------------------
// Mock next/headers.cookies() — in-memory store por teste
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

// next/navigation.redirect arremessa um erro com digest começando com NEXT_REDIRECT
// — esse pattern será reusado em todas as Server Actions de stories futuras.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT;${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;${url}`;
    throw err;
  },
}));

// Imports AFTER mocks
const { signUp, signIn, signOut } = await import('@/server/auth/actions');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SIGNUP_USER = {
  email: 'cifx-signup-1@biolink.dev',
  password: 'testpassword123',
  username: 'cifx-signup-1',
};
const SIGNIN_USER = {
  email: 'cifx-signin@biolink.dev',
  password: TEST_USER_PASSWORD,
  username: 'cifx-signin',
  id: '00000000-0000-0000-0000-000000001013',
};
const DUP_USER = {
  email: 'cifx-dup@biolink.dev',
  password: TEST_USER_PASSWORD,
  username: 'cifx-dup',
  id: '00000000-0000-0000-0000-000000001014',
};

let signupUserId: string | null = null;

async function deleteByUsername(username: string) {
  // 1) Resolve id via profiles (mais rápido que iterar páginas de admin.listUsers)
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (profile?.id) {
    // FK ON DELETE CASCADE em profiles.id → auth.users.id
    await admin.auth.admin.deleteUser(profile.id).catch(() => {});
    // Fallback: delete profile direto (caso a FK não cascateie em algum cenário)
    await admin.from('profiles').delete().eq('id', profile.id);
  }
  // 2) Defensive sweep adicional via admin (caso o profile não exista)
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      const meta = u.user_metadata as { username?: string } | null;
      if (meta?.username === username) {
        await admin.auth.admin.deleteUser(u.id).catch(() => {});
      }
    }
    if (data.users.length < 50) break;
    page += 1;
  }
}

async function fullCleanup() {
  await deleteByUsername(SIGNUP_USER.username);
  await admin.auth.admin.deleteUser(SIGNIN_USER.id).catch(() => {});
  await admin.auth.admin.deleteUser(DUP_USER.id).catch(() => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Auth Server Actions (Story 1.5)', () => {
  beforeAll(async () => {
    await fullCleanup();
  }, 60_000);

  afterAll(async () => {
    if (signupUserId) {
      await admin.auth.admin.deleteUser(signupUserId).catch(() => {});
    }
    await fullCleanup();
  }, 60_000);

  beforeEach(() => {
    cookieStore = new Map();
  });

  it('signUp cria auth.users + profiles row (via trigger 1.4)', async () => {
    let caught: unknown = null;
    try {
      await signUp({
        email: SIGNUP_USER.email,
        password: SIGNUP_USER.password,
        confirmPassword: SIGNUP_USER.password,
        username: SIGNUP_USER.username,
        acceptTerms: true,
      });
    } catch (err) {
      caught = err;
    }

    // Server Action em sucesso lança NEXT_REDIRECT (next/navigation.redirect).
    // Este pattern será reusado em todas as Server Actions de stories futuras
    // que chamam redirect() em sucesso.
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error & { digest?: string }).digest).toMatch(/^NEXT_REDIRECT/);

    // Verifica row em profiles (criada pelo trigger on_auth_user_created)
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, username')
      .eq('username', SIGNUP_USER.username)
      .maybeSingle();
    expect(error).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile?.username).toBe(SIGNUP_USER.username);
    signupUserId = profile?.id ?? null;
    expect(signupUserId).toBeTruthy();

    // Confirma também via admin.getUserById que o user existe em auth.users
    if (signupUserId) {
      const { data: getRes, error: getErr } = await admin.auth.admin.getUserById(signupUserId);
      expect(getErr).toBeNull();
      expect(getRes.user?.email).toBe(SIGNUP_USER.email);
    }
  }, 60_000);

  it('signUp com username já existente retorna ActionResult { ok: false }', async () => {
    // Pré-cria DUP_USER via admin
    const { error: createErr } = await admin.auth.admin.createUser({
      id: DUP_USER.id,
      email: DUP_USER.email,
      password: DUP_USER.password,
      email_confirm: true,
      user_metadata: { username: DUP_USER.username },
    });
    expect(createErr).toBeNull();

    const res = await signUp({
      email: 'cifx-dup-other@biolink.dev',
      password: 'testpassword123',
      confirmPassword: 'testpassword123',
      username: DUP_USER.username,
      acceptTerms: true,
    });

    expect(res).toBeDefined();
    expect(res?.ok).toBe(false);
    if (res && !res.ok) {
      expect(res.error).toBe('Este username já está em uso');
      expect(res.fieldErrors?.username).toBe('Este username já está em uso');
    }
  }, 60_000);

  it('signIn com credenciais válidas redireciona (NEXT_REDIRECT)', async () => {
    // Pré-cria user
    const { error: createErr } = await admin.auth.admin.createUser({
      id: SIGNIN_USER.id,
      email: SIGNIN_USER.email,
      password: SIGNIN_USER.password,
      email_confirm: true,
      user_metadata: { username: SIGNIN_USER.username },
    });
    expect(createErr).toBeNull();

    let caught: unknown = null;
    try {
      await signIn({ email: SIGNIN_USER.email, password: SIGNIN_USER.password });
    } catch (err) {
      caught = err;
    }
    expect((caught as Error & { digest?: string })?.digest).toMatch(/^NEXT_REDIRECT/);
  }, 60_000);

  it('signIn com credenciais erradas retorna { ok: false, error: "Email ou senha incorretos" }', async () => {
    const res = await signIn({ email: SIGNIN_USER.email, password: 'wrong-password-999' });
    expect(res?.ok).toBe(false);
    if (res && !res.ok) {
      expect(res.error).toBe('Email ou senha incorretos');
    }
  }, 60_000);

  it('signOut redireciona (NEXT_REDIRECT)', async () => {
    let caught: unknown = null;
    try {
      await signOut();
    } catch (err) {
      caught = err;
    }
    expect((caught as Error & { digest?: string })?.digest).toMatch(/^NEXT_REDIRECT/);
  }, 30_000);
});
