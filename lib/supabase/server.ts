import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // `cookieStore.set()` lança em Server Components ("Cookies can only be
      // modified in a Server Action or Route Handler"). Quando @supabase/ssr
      // tenta refresh durante render de RSC, o setAll é silenciosamente
      // ignorado — o `middleware.ts` já refresh-a a sessão em cada navegação
      // (pattern oficial Supabase Next App Router). Em Server Actions/Route
      // Handlers o set funciona normalmente.
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Component context — refresh delegado ao middleware. */
        }
      },
    },
  });
}
