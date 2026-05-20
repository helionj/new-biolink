// app/[username]/page.tsx — Story 2.7 (Página pública SSR)
//
// DEV-1 (divergência consciente do arch §Routing L1167 + §Unified Project
// Structure L1591): segmento dinâmico `[username]` ao invés do literal
// `@[username]` que o arch prescreve. Razão: Next.js 16 trata qualquer
// pasta começando com `@` como slot de parallel route — `app/@foo/` nunca
// resolve como URL `/<algo>` literal. Resolução pragmática:
//   1) o segmento é `[username]` (livre);
//   2) este Server Component valida `params.username.startsWith('@')` e
//      strip do prefixo antes do DB lookup; caso contrário, `notFound()`.
//
// Garantias de não-colisão:
//   - Precedência de rotas Next.js: rotas estáticas (`/`, `/login`,
//     `/dashboard`, `/api/*`) têm precedência sobre `[username]`.
//   - `lib/reserved-usernames.ts` (Story 2.1) bloqueia signup com names
//     que colidiriam com paths estáticos.
//   - `middleware.ts:39` (`path.startsWith('/@')`) bypassa o pipeline de
//     auth para `/@*` — visitante anon não atinge `auth.getUser()`.
//
// DEV-2: tracking de page view (FR10) é Story 4.2 — fora de escopo aqui.
// DEV-3: 2 round-trips com embed Supabase em `getPublicPage` (AP-1).
// DEV-4: avatar fallback é ícone `<User/>` lucide, não iniciais.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicPage } from '@/components/public/PublicPage';
import { parseUsername } from '@/lib/parse-username';
import { getPublicPage } from '@/server/page/queries';

// ISR (arch §Performance L2181-2184). `revalidateUserSurface` (lib/cache.ts,
// o único módulo autorizado a chamar `revalidatePath`) já dispara
// `/@${username}` em toda mutation relevante (Stories 2.5/2.6) — NÃO
// chamar `revalidatePath` direto aqui.
export const revalidate = 60;

type RouteParams = { username: string };

const NOT_FOUND_METADATA = {
  title: 'Página não encontrada — BioLink',
  robots: { index: false },
} satisfies Metadata;

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { username: raw } = await params;
  const username = parseUsername(raw);
  if (!username) return NOT_FOUND_METADATA;

  const data = await getPublicPage(username);
  if (!data) return NOT_FOUND_METADATA;

  const { profile } = data;
  const displayName = profile.display_name ?? `@${profile.username}`;
  const title = `${displayName} (@${profile.username}) — BioLink`;
  const description = profile.bio ?? `Página pessoal de @${profile.username} no BioLink`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: '/og-image.png' }],
    },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<RouteParams> }) {
  const { username: raw } = await params;
  const username = parseUsername(raw);
  if (!username) notFound();

  const data = await getPublicPage(username);
  if (!data) notFound();

  return <PublicPage data={data} />;
}
