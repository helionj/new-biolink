import { User } from 'lucide-react';
import Image from 'next/image';

import type { Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export type ThemePreviewData = {
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  links: Array<{ id: string; title: string }>;
};

/**
 * Preview mini da página pública renderizada com o tema fornecido (Story 3.3
 * AC3 — "Server Component isolado, sem iframe").
 *
 * Estratégia de cascade: o wrapper `<div data-theme={theme}>` reproduz o
 * mesmo padrão de `PublicPage.tsx` (Story 3.2). A classe `.dark` condicional
 * alimenta o `@custom-variant dark (&:is(.dark *))` da globals.css (DEV-1 da
 * 3.1) — defense in depth para primitives shadcn.
 *
 * Componente puro (sem estado nem efeitos). Usado dentro do Client Component
 * `<ThemeSelector>` — Next 16 traz para o client bundle automaticamente, mas
 * o componente em si não depende de APIs server.
 *
 * `aria-hidden="true"` no wrapper: o preview é decorativo (cada `<button>`
 * ancestral já provê `aria-checked` + label semântico). Sem isso o leitor de
 * tela narraria 3× o conteúdo (uma vez por card).
 */
export function ThemePreview({ theme, data }: { theme: Theme; data: ThemePreviewData }) {
  const { profile, links } = data;
  const displayName = profile.display_name ?? `@${profile.username || 'user'}`;
  return (
    <div
      data-theme={theme}
      className={cn(
        'flex h-full w-full flex-col items-center gap-2 rounded-md bg-background px-3 py-4 text-foreground',
        theme === 'dark' && 'dark',
      )}
      aria-hidden="true"
    >
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt="" width={48} height={48} className="rounded-full" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <User className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="line-clamp-1 text-center text-sm font-semibold tracking-tight">{displayName}</p>
      {profile.bio && (
        <p className="line-clamp-1 text-center text-xs text-muted-foreground">{profile.bio}</p>
      )}
      <ul className="flex w-full flex-col gap-1.5">
        {links.length === 0 ? (
          <li className="text-center text-xs text-muted-foreground">Sem links</li>
        ) : (
          links.slice(0, 3).map((link) => (
            <li
              key={link.id}
              className="truncate rounded-md border border-border bg-card px-2 py-1.5 text-center text-xs text-card-foreground"
            >
              {link.title}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
