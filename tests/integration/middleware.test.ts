/**
 * Integration tests — middleware.ts (Story 1.7).
 *
 * Cobre a matriz `auth × path` para o middleware refatorado: matcher amplo
 * (regex canônico do arch §Routing linha 1227) + bypass list explícito
 * (`/`, `/@<username>`, `/api/track/*`, `/auth/callback`) + PROTECTED_PREFIXES
 * (`/dashboard*` → exige session) + AUTH_PAGES (exact match: `/login`,
 * `/signup`, `/reset-password` → redirect a `/dashboard` se logado).
 *
 * Pattern: importa a função `middleware` exportada de `@/middleware` (não
 * passa pelo Next.js Edge runtime; testa o handler como função pura). Mocka
 * `@supabase/ssr.createServerClient` para retornar `{ auth: { getUser } }`
 * controlável via `mockUser` por teste.
 *
 * **Não testa refresh real de token** (AC5 é não-testável em integration
 * test — depende de expiração de token Supabase; coberto via inspeção +
 * smoke manual opcional).
 *
 * **Não roda contra Supabase Branch** — diferente das suites RLS/auth, o
 * middleware é puro frontend-edge; Supabase Branch seria overhead.
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @supabase/ssr ANTES de importar o middleware
// ---------------------------------------------------------------------------
let mockUser: { id: string; email: string } | null = null;
const getUserMock = vi.fn(async () => ({ data: { user: mockUser }, error: null }));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

const { middleware } = await import('@/middleware');

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

beforeEach(() => {
  mockUser = null;
  getUserMock.mockClear();
});

// ---------------------------------------------------------------------------
// PROTECTED routes — `/dashboard*` exigem sessão Supabase válida (AC2)
// ---------------------------------------------------------------------------
describe('middleware — PROTECTED routes (/dashboard*)', () => {
  it('guest em /dashboard → redirect /login?next=/dashboard (307)', async () => {
    const res = await middleware(makeRequest('/dashboard'));

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).not.toBeNull();
    const url = new URL(location!);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('/dashboard');
  });

  it('guest em /dashboard/profile → redirect /login?next=/dashboard/profile', async () => {
    const res = await middleware(makeRequest('/dashboard/profile'));

    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('/dashboard/profile');
  });

  it('authenticated em /dashboard → passthrough (sem Location)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/dashboard'));

    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('authenticated em /dashboard/profile → passthrough', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/dashboard/profile'));

    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// AUTH_PAGES — redirecionam para /dashboard se sessão existe (AC3)
// ---------------------------------------------------------------------------
describe('middleware — AUTH_PAGES (exact match)', () => {
  it('guest em /login → passthrough (renderiza form)', async () => {
    const res = await middleware(makeRequest('/login'));

    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('authenticated em /login → redirect /dashboard (307)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/login'));

    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.pathname).toBe('/dashboard');
    expect(url.searchParams.has('next')).toBe(false);
  });

  it('authenticated em /signup → redirect /dashboard', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/signup'));

    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.pathname).toBe('/dashboard');
  });

  it('authenticated em /reset-password → redirect /dashboard', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/reset-password'));

    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.pathname).toBe('/dashboard');
  });

  it('authenticated em /reset-password/confirm → passthrough (não é AUTH_PAGES exato)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/reset-password/confirm'));

    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Bypass — rotas públicas não invocam o pipeline de auth (AC4)
// ---------------------------------------------------------------------------
describe('middleware — bypass (rotas públicas)', () => {
  it('guest em / → passthrough sem chamar getUser', async () => {
    const res = await middleware(makeRequest('/'));

    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('authenticated em / → passthrough sem chamar getUser (landing trata client-side)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/'));

    expect(res.headers.get('location')).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('guest em /@helion → passthrough (público; Story 2.7)', async () => {
    const res = await middleware(makeRequest('/@helion'));

    expect(res.headers.get('location')).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('authenticated em /@helion → passthrough (bypass; nem chama getUser)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/@helion'));

    expect(res.headers.get('location')).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('authenticated em /auth/callback?code=xxx → passthrough (handler executa exchange)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/auth/callback?code=abc123'));

    expect(res.headers.get('location')).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('authenticated em /api/track/click → passthrough (tracking anônimo)', async () => {
    mockUser = { id: 'user-1', email: 'helion@example.com' };

    const res = await middleware(makeRequest('/api/track/click'));

    expect(res.headers.get('location')).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
