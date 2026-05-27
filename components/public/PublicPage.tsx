import { User } from 'lucide-react';
import Image from 'next/image';

import { TrackedLinkCard } from '@/components/public/TrackedLinkCard';
import { ViewBeacon } from '@/components/public/ViewBeacon';
import { cn } from '@/lib/utils';
import type { PublicPageData } from '@/server/page/queries';

/**
 * Layout vertical mobile-first da página pública (`/@username`).
 *
 * Server Component (sem `'use client'`) — zero JS extra na primeira render
 * (arch §Performance L2174-2177; relevante para AC6 / Lighthouse ≥ 90).
 *
 * Story 3.2 — aplicação visual do `page.theme`:
 *   - Wrapper externo `<div data-theme={page.theme}>` para que os seletores
 *     [data-theme=...] em globals.css cubram todos os descendentes via
 *     cascade (vence o `data-theme="light"` herdado de <html>).
 *   - Classe `.dark` condicional alimenta o `@custom-variant dark
 *     (&:is(.dark *))` (DEV-1 da 3.1) — defesa em profundidade para
 *     primitives shadcn que ainda usem `dark:` variant.
 *   - `min-h-screen bg-background text-foreground` garante que o tema cubra
 *     toda a viewport (sem isso, área fora do <main max-w-md> herdaria o
 *     fundo do <body> resolvido com data-theme="light").
 *
 * Estrutura: avatar (96×96) → display_name (h1) → bio (opcional) → lista de
 * links. Avatar com `priority` quando há URL real (LCP). Fallback de avatar
 * é `<User/>` lucide em placeholder com `aria-hidden` (DEV-4, evita iniciais
 * + color-hash extra para MVP). Empty state distingue "0 links visíveis"
 * (página válida) de "perfil inexistente" (404).
 */
export function PublicPage({ data }: { data: PublicPageData }) {
  const { profile, links, page } = data;
  const displayName = profile.display_name ?? `@${profile.username}`;

  return (
    <div
      data-theme={page.theme}
      className={cn('min-h-screen bg-background text-foreground', page.theme === 'dark' && 'dark')}
    >
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-8 sm:py-12">
        <ViewBeacon pageId={page.id} />
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
              <TrackedLinkCard key={link.id} link={link} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
