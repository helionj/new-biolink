import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  if (PROTECTED_PATHS.some((p) => path.startsWith(p)) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.some((p) => path.startsWith(p)) && user) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return res;
}

// Story 1.7 expandirá o matcher para `/((?!_next/static|...).*)` cobrindo todas
// as rotas privadas. Aqui é deliberadamente reduzido a /signup, /login,
// /dashboard/* para minimizar surface de bugs no MVP de auth UI.
export const config = {
  matcher: ['/signup', '/login', '/dashboard/:path*'],
};
