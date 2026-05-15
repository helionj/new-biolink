import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';

// Story 1.7 implementou o matcher amplo + bypass list, materializando o
// pattern canônico de docs/architecture.md §Routing Architecture > Protected
// Route Pattern (linha 1227). O default agora é INTERCEPTAR; o bypass é
// explícito em código (early-return abaixo). Stories 1.5/1.6 usavam uma
// lista enumerada de paths — esta story fecha esse roadmap.
//
// Cross-ref: docs/architecture.md §Routing linhas 1183-1184 (terminologia
// PROTECTED_PREFIXES + AUTH_PAGES) e linha 1227 (regex do matcher).
const PROTECTED_PREFIXES = ['/dashboard'];
// Exact match (Story 1.6, preservado em 1.7): comparar `path === p` em vez
// de `startsWith`. Motivo: `/reset-password/confirm` precisa de session
// válida (oposto do "se logado → /dashboard" das auth pages).
// `startsWith('/reset-password')` engoliria `/reset-password/confirm` para
// `/dashboard` redirect e perderia a página de nova senha. Divergência
// consciente do snippet do arch §Routing (que usa `some(startsWith)`) —
// o snippet é didático/pré-Story 1.6.
const AUTH_PAGES = ['/login', '/signup', '/reset-password'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Bypass — rotas públicas que não precisam do pipeline de auth.
  // Early-return ANTES de instanciar o createServerClient para economizar
  // latência (sem `getUser()` desnecessário) e clareza semântica.
  //
  // `/auth/callback` está aqui (mudança vs Story 1.6) porque o Route
  // Handler executa seu próprio `exchangeCodeForSession` que internamente
  // faz setAll dos novos cookies; rodar middleware antes seria redundante
  // e em cenários adversariais (usuário com session antiga clicando no
  // link de email em outra aba) poderia criar race condition entre dois
  // setAll. Story 1.7 PSN #1.
  if (
    path === '/' ||
    path.startsWith('/@') ||
    path.startsWith('/api/track') ||
    path === '/auth/callback'
  ) {
    return NextResponse.next({ request: req });
  }

  // Padrão oficial @supabase/ssr para Next middleware: a response deve ser
  // recriada quando o cliente Supabase refresh tokens (via setAll), e os
  // cookies precisam ser propagados para qualquer redirect — caso contrário
  // o browser perde a sessão entre redirects.
  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper: build a redirect response copiando cookies refreshed do supabaseResponse
  function redirectWithCookies(pathname: string, nextPath?: string) {
    const url = req.nextUrl.clone();
    url.pathname = pathname;
    if (nextPath) {
      url.searchParams.set('next', nextPath);
    } else {
      url.searchParams.delete('next');
    }
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !user) {
    return redirectWithCookies('/login', path);
  }

  if (AUTH_PAGES.includes(path) && user) {
    return redirectWithCookies('/dashboard');
  }

  return supabaseResponse;
}

// Matcher canônico do arch §Routing Architecture > Protected Route Pattern
// (linha 1227). Intercepta TODAS as rotas exceto: assets estáticos
// (`_next/static`, `_next/image`), favicon, e arquivos de imagem por
// extensão. O bypass de auth (rotas públicas como `/`, `/@*`, `/api/track`,
// `/auth/callback`) é feito em runtime via early-return no handler — não
// no matcher — para manter a regex simples e a lógica explícita em código.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
