/**
 * Integration tests — getPublicPage (Story 2.7, AC7).
 *
 * Cobre os 4 cenários de AC7 (1:1 com a aceitação):
 *   (a) happy path: profile válido + page publicada → render N links visíveis
 *       em ordem `position ASC`; link com `is_visible=false` é OMITIDO.
 *       Esta única assertion cobre AC7 cenário 1 + cenário 4.
 *   (b) profile inexistente → null (AC7 cenário 2).
 *   (c) page.is_published=false → null (AC7 cenário 3).
 *
 * Substrate: `biolink-dev`. Fixtures isolados por prefixo `cifx-pubpage-` +
 * UUID range `…1045/1046` (distinto de auth `…1011..1022`, profile `…1031/1032`,
 * rls `…1001/1002/1099`, links-2.5 `…1041/1042`, reorder-2.6 `…1043/1044`).
 *
 * Diferença vs `server-actions/*.test.ts`: o caminho público é
 * **anon-only** — `next/headers.cookies()` retorna store SEMPRE vazio →
 * `createClient()` resolve como role `anon`, exatamente o caminho de
 * produção. Não chamamos `signInWithPassword`. A prova material é o
 * trio de RLS policies `{profiles,pages,links}_select_public` filtrando
 * de fato as rows.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { admin, TEST_USER_PASSWORD } from './helpers/test-users';

// ---------------------------------------------------------------------------
// Mock next/headers — store sempre vazio (visitante anon, sem session)
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [] as Array<{ name: string; value: string }>,
    set: () => {},
    get: () => undefined,
    delete: () => {},
  }),
}));

// `notFound`/`redirect` lançam — `getPublicPage` não os chama, mas mockar é
// barato e evita surpresas se a função evoluir.
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT;${url}`);
  },
}));

vi.mock('@/lib/cache', () => ({
  revalidateUserSurface: vi.fn(),
}));

const { getPublicPage } = await import('@/server/page/queries');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_A = {
  id: '00000000-0000-0000-0000-000000001045',
  email: 'cifx-pubpage-a@biolink.dev',
  username: 'cifx-pubpage-a',
  password: TEST_USER_PASSWORD,
};
const USER_B = {
  id: '00000000-0000-0000-0000-000000001046',
  email: 'cifx-pubpage-b@biolink.dev',
  username: 'cifx-pubpage-b',
  password: TEST_USER_PASSWORD,
};

let pageA: string;
let pageB: string;
let linkA1Id: string;
let linkA2HiddenId: string;
let linkA3Id: string;

async function cleanup() {
  await admin.auth.admin.deleteUser(USER_A.id).catch(() => {});
  await admin.auth.admin.deleteUser(USER_B.id).catch(() => {});
}

async function createTestUser(u: typeof USER_A) {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('getPublicPage (Story 2.7)', () => {
  beforeAll(async () => {
    await cleanup();

    // User A — page publicada (default `is_published=true`) + 3 links:
    //   L1 visible (position 0), L2 oculto (position 1), L3 visible (position 2).
    await createTestUser(USER_A);
    pageA = await resolvePage(USER_A.id);

    const l1 = await admin
      .from('links')
      .insert({
        page_id: pageA,
        title: 'A — Link 1',
        url: 'https://a1.com',
        position: 0,
        is_visible: true,
      })
      .select('id')
      .single();
    expect(l1.error).toBeNull();
    linkA1Id = l1.data!.id;

    const l2 = await admin
      .from('links')
      .insert({
        page_id: pageA,
        title: 'A — Link 2 oculto',
        url: 'https://a2.com',
        position: 1,
        is_visible: false,
      })
      .select('id')
      .single();
    expect(l2.error).toBeNull();
    linkA2HiddenId = l2.data!.id;

    const l3 = await admin
      .from('links')
      .insert({
        page_id: pageA,
        title: 'A — Link 3',
        url: 'https://a3.com',
        position: 2,
        is_visible: true,
      })
      .select('id')
      .single();
    expect(l3.error).toBeNull();
    linkA3Id = l3.data!.id;

    // User B — page DESPUBLICADA + 1 link visível (não deve ser exposto).
    await createTestUser(USER_B);
    pageB = await resolvePage(USER_B.id);

    const unpub = await admin.from('pages').update({ is_published: false }).eq('id', pageB);
    expect(unpub.error).toBeNull();

    const bLink = await admin.from('links').insert({
      page_id: pageB,
      title: 'B — Link único',
      url: 'https://b1.com',
      position: 0,
      is_visible: true,
    });
    expect(bLink.error).toBeNull();
  }, 60_000);

  afterAll(async () => {
    if (pageA) await admin.from('links').delete().eq('page_id', pageA);
    if (pageB) await admin.from('links').delete().eq('page_id', pageB);
    await cleanup();
  }, 60_000);

  it('(a) AC7-1 + AC7-4 — username válido, page publicada → 2 links visíveis em ordem ASC; link oculto omitido', async () => {
    const res = await getPublicPage('cifx-pubpage-a');

    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.profile.username).toBe('cifx-pubpage-a');
    expect(res.page.id).toBe(pageA);

    // 2 links visíveis (L1 e L3); L2 oculto omitido por RLS+filtro.
    expect(res.links).toHaveLength(2);
    const ids = res.links.map((l) => l.id);
    expect(ids).toContain(linkA1Id);
    expect(ids).toContain(linkA3Id);
    expect(ids).not.toContain(linkA2HiddenId);

    // Ordem `position ASC` (usa idx_links_page_id_position_visible).
    expect(res.links[0]!.position).toBeLessThan(res.links[1]!.position);
    expect(res.links[0]!.id).toBe(linkA1Id);
    expect(res.links[1]!.id).toBe(linkA3Id);
  }, 30_000);

  it('(b) AC7-2 — profile inexistente → null', async () => {
    const res = await getPublicPage('cifx-nao-existe-xyz');
    expect(res).toBeNull();
  }, 30_000);

  it('(c) AC7-3 — page.is_published=false → null', async () => {
    const res = await getPublicPage('cifx-pubpage-b');
    expect(res).toBeNull();
  }, 30_000);
});
