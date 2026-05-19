/**
 * Integration tests — Server Actions links (Story 2.5, AC7).
 *
 * Cobre createLink/updateLink/deleteLink/toggleLinkVisibility:
 *   a) createLink sem session → { ok:false }
 *   b) input inválido autenticado → { ok:false, fieldErrors } SEM insert
 *   c) createLink válido → { ok:true }, position=0, page_id correto
 *   d) 2º createLink → position incrementa (max+1)
 *   e) updateLink próprio (title/url) → row atualizada + updated_at tocado
 *      pelo trigger trg_links_set_updated_at
 *   f) update/delete/toggle de link de OUTRO usuário → { ok:false } (RLS
 *      links_*_own via JOIN pages; row não visível ⇒ 0 rows)
 *   g) toggleLinkVisibility alterna is_visible
 *   h) deleteLink próprio → row some; gap em position permanece (Q1 RESOLVED,
 *      sem reindex) e próximo createLink usa max+1 (não preenche o gap)
 *
 * Substrate: `biolink-dev`. Fixtures isolados por prefixo `cifx-link-` +
 * UUID range `0…1041/1042` (distinto de auth `…1011..1022`,
 * profile `…1031/1032`, rls/* `…1001/1002/1099`). `@/lib/cache` é mockado
 * (revalidateUserSurface é no-op fora de request Next). Auth via o próprio
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

// revalidateUserSurface chama revalidatePath de next/cache — no-op (e erro)
// fora de um request Next. Mockar mantém as actions testáveis isoladamente.
vi.mock('@/lib/cache', () => ({
  revalidateUserSurface: vi.fn(),
}));

const { createLink, updateLink, deleteLink, toggleLinkVisibility } =
  await import('@/server/links/actions');
const { createClient } = await import('@/lib/supabase/server');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_A = {
  id: '00000000-0000-0000-0000-000000001041',
  email: 'cifx-link-a@biolink.dev',
  username: 'cifx-link-a',
  password: TEST_USER_PASSWORD,
};
const USER_B = {
  id: '00000000-0000-0000-0000-000000001042',
  email: 'cifx-link-b@biolink.dev',
  username: 'cifx-link-b',
  password: TEST_USER_PASSWORD,
};

let pageA: string;
let pageB: string;

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

async function resolvePage(userId: string): Promise<string> {
  const { data, error } = await admin.from('pages').select('id').eq('profile_id', userId).single();
  expect(error).toBeNull();
  return data!.id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Links Server Actions (Story 2.5)', () => {
  beforeAll(async () => {
    await fullCleanup();
    await createUser(USER_A);
    await createUser(USER_B);
    pageA = await resolvePage(USER_A.id);
    pageB = await resolvePage(USER_B.id);
  }, 60_000);

  afterAll(async () => {
    await admin.from('links').delete().eq('page_id', pageA);
    await admin.from('links').delete().eq('page_id', pageB);
    await fullCleanup();
  }, 60_000);

  beforeEach(async () => {
    cookieStore = new Map();
    // Estado de links determinístico por teste (positions previsíveis).
    await admin.from('links').delete().eq('page_id', pageA);
    await admin.from('links').delete().eq('page_id', pageB);
  });

  it('(a) createLink sem session → { ok:false }', async () => {
    const res = await createLink({ title: 'X', url: 'https://x.com' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/sessão expirada/i);
    }
  }, 30_000);

  it('(b) input inválido autenticado → { ok:false, fieldErrors } sem insert', async () => {
    await signInAs(USER_A);

    const emptyTitle = await createLink({ title: '   ', url: 'https://x.com' });
    expect(emptyTitle.ok).toBe(false);
    if (!emptyTitle.ok) {
      expect(emptyTitle.error).toBe('Entrada inválida');
      expect(emptyTitle.fieldErrors?.title).toBeTruthy();
    }

    const badUrl = await createLink({ title: 'Ok', url: 'not-a-url' });
    expect(badUrl.ok).toBe(false);

    const badIcon = await createLink({ title: 'Ok', url: 'https://x.com', icon: 'BAD ICON' });
    expect(badIcon.ok).toBe(false);

    // Nenhum insert ocorreu.
    const rows = await admin.from('links').select('id').eq('page_id', pageA);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(0);
  }, 60_000);

  it('(c)(d) createLink válido → position 0, page_id correto; 2º → position 1', async () => {
    await signInAs(USER_A);

    const first = await createLink({ title: 'Primeiro', url: 'https://um.com' });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.position).toBe(0);
      expect(first.data.page_id).toBe(pageA);
      expect(first.data.title).toBe('Primeiro');
      expect(first.data.is_visible).toBe(true);
    }

    const second = await createLink({
      title: 'Segundo',
      url: 'https://dois.com',
      icon: 'globe',
    });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.position).toBe(1);
      expect(second.data.icon).toBe('globe');
    }
  }, 60_000);

  it('(e) updateLink próprio atualiza title/url + updated_at tocado pelo trigger', async () => {
    await signInAs(USER_A);
    const created = await createLink({ title: 'Antes', url: 'https://antes.com' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const before = await admin
      .from('links')
      .select('updated_at')
      .eq('id', created.data.id)
      .single();
    expect(before.error).toBeNull();

    await new Promise((r) => setTimeout(r, 5));

    const res = await updateLink({
      id: created.data.id,
      title: 'Depois',
      url: 'https://depois.com',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.title).toBe('Depois');
      expect(res.data.url).toBe('https://depois.com');
    }

    const after = await admin
      .from('links')
      .select('title, url, updated_at')
      .eq('id', created.data.id)
      .single();
    expect(after.error).toBeNull();
    expect(after.data?.title).toBe('Depois');
    expect(after.data?.url).toBe('https://depois.com');
    expect(new Date(after.data!.updated_at).getTime()).toBeGreaterThan(
      new Date(before.data!.updated_at).getTime(),
    );
  }, 60_000);

  it('(g) toggleLinkVisibility alterna is_visible', async () => {
    await signInAs(USER_A);
    const created = await createLink({ title: 'Vis', url: 'https://vis.com' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const off = await toggleLinkVisibility({ id: created.data.id, is_visible: false });
    expect(off.ok).toBe(true);
    if (off.ok) expect(off.data.is_visible).toBe(false);

    const on = await toggleLinkVisibility({ id: created.data.id, is_visible: true });
    expect(on.ok).toBe(true);
    if (on.ok) expect(on.data.is_visible).toBe(true);
  }, 60_000);

  it('(f) update/delete/toggle de link de OUTRO usuário → { ok:false } (RLS)', async () => {
    // USER_A cria o link.
    await signInAs(USER_A);
    const created = await createLink({ title: 'Do A', url: 'https://do-a.com' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const linkId = created.data.id;

    // USER_B tenta mutar o link de A.
    await signInAs(USER_B);

    const upd = await updateLink({ id: linkId, title: 'Hack' });
    expect(upd.ok).toBe(false);

    const tog = await toggleLinkVisibility({ id: linkId, is_visible: false });
    expect(tog.ok).toBe(false);

    const del = await deleteLink({ id: linkId });
    expect(del.ok).toBe(false);

    // Link de A intacto (via admin, bypassa RLS).
    const still = await admin.from('links').select('title, is_visible').eq('id', linkId).single();
    expect(still.error).toBeNull();
    expect(still.data?.title).toBe('Do A');
    expect(still.data?.is_visible).toBe(true);
  }, 60_000);

  it('(h) deleteLink próprio remove a row; gap em position permanece (sem reindex)', async () => {
    await signInAs(USER_A);
    const l0 = await createLink({ title: 'L0', url: 'https://l0.com' });
    const l1 = await createLink({ title: 'L1', url: 'https://l1.com' });
    const l2 = await createLink({ title: 'L2', url: 'https://l2.com' });
    expect(l0.ok && l1.ok && l2.ok).toBe(true);
    if (!l1.ok) return;

    const del = await deleteLink({ id: l1.data.id });
    expect(del.ok).toBe(true);

    const remaining = await admin
      .from('links')
      .select('position')
      .eq('page_id', pageA)
      .order('position', { ascending: true });
    expect(remaining.error).toBeNull();
    // Gap em 1 permanece (Q1 RESOLVED — sem compactar).
    expect(remaining.data?.map((r) => r.position)).toEqual([0, 2]);

    // Próximo createLink usa max+1 = 3 (não preenche o gap 1).
    const l3 = await createLink({ title: 'L3', url: 'https://l3.com' });
    expect(l3.ok).toBe(true);
    if (l3.ok) expect(l3.data.position).toBe(3);
  }, 60_000);
});
