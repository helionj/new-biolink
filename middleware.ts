import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
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
  const path = req.nextUrl.pathname;

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

  if (PROTECTED_PATHS.some((p) => path.startsWith(p)) && !user) {
    return redirectWithCookies('/login', path);
  }

  if (AUTH_PAGES.some((p) => path.startsWith(p)) && user) {
    return redirectWithCookies('/dashboard');
  }

  return supabaseResponse;
}

// Story 1.7 expandirá o matcher para `/((?!_next/static|...).*)` cobrindo todas
// as rotas privadas. Aqui é deliberadamente reduzido a /signup, /login,
// /dashboard, /dashboard/* para minimizar surface de bugs no MVP de auth UI.
// /dashboard listado explicitamente além de /dashboard/:path* — defensivo
// contra mudança de path-to-regexp v8 no Next 16 (`:path*` pode não cobrir o
// segmento vazio em todas as versões).
export const config = {
  matcher: ['/signup', '/login', '/dashboard', '/dashboard/:path*'],
};
