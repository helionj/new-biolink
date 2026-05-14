import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// Multi-purpose Route Handler — signup confirm + password recovery + magic link futuro.
// PKCE flow do @supabase/ssr: trocar `code` por session, gravar cookies HTTP-only,
// redirecionar para `next` (path relativo) ou `/dashboard` default.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchange failed:', error.message);
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }

  // Open redirect protection: aceitar apenas path relativo iniciando com '/'
  // (mas não '//' — protocol-relative URL).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return NextResponse.redirect(new URL(safeNext, origin));
}
