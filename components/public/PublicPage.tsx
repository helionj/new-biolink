import { User } from 'lucide-react';
import Image from 'next/image';

import { PublicLinkCard } from '@/components/public/PublicLinkCard';
import type { PublicPageData } from '@/server/page/queries';

/**
 * Layout vertical mobile-first da página pública (`/@username`).
 *
 * Server Component (sem `'use client'`) — zero JS extra na primeira render
 * (arch §Performance L2174-2177; relevante para AC6 / Lighthouse ≥ 90).
 *
 * Estrutura: avatar (96×96) → display_name (h1) → bio (opcional) → lista de
 * links. Avatar com `priority` quando há URL real (LCP). Fallback de avatar
 * é `<User/>` lucide em placeholder com `aria-hidden` (DEV-4, evita iniciais
 * + color-hash extra para MVP). Empty state distingue "0 links visíveis"
 * (página válida) de "perfil inexistente" (404).
 */
export function PublicPage({ data }: { data: PublicPageData }) {
  const { profile, links } = data;
  const displayName = profile.display_name ?? `@${profile.username}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-8 sm:py-12">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={96}
          height={96}
          className="rounded-full"
          priority
        />
      ) : (
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <User className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>

      {profile.bio && <p className="text-center text-muted-foreground">{profile.bio}</p>}

      {links.length === 0 ? (
        <p className="text-muted-foreground">@{profile.username} ainda não publicou links.</p>
      ) : (
        <ul className="flex w-full flex-col gap-3" aria-label={`Links de @${profile.username}`}>
          {links.map((link) => (
            <PublicLinkCard key={link.id} link={link} />
          ))}
        </ul>
      )}
    </main>
  );
}
