'use client';

import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { ThemePreview, type ThemePreviewData } from '@/components/theme/ThemePreview';
import type { Theme } from '@/lib/theme';
import { THEMES } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { updateTheme } from '@/server/page/actions';

/** LABELS UI-only — enum 'brand' preservado em DB + Theme type (Q3 §6 PRD v0.5 ratified 2026-05-29). */
const LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  brand: 'Vibrante',
};

/** Descrições verbatim spec §2.7 L706/L715/L724 (frontend-spec.md v0.3). */
const DESCRIPTIONS: Record<Theme, string> = {
  light: 'Lavender mist',
  dark: 'Deep plum night',
  brand: 'Lavender + peach pop',
};

/**
 * Seletor de tema em formato radio-as-cards (Story 3.3, AC1+AC2+AC4).
 *
 * Padrão optimistic UI + rollback + `useTransition` — precedente verbatim
 * `components/links/LinkList.tsx:48-62` (sancionado em Story 2.6 Done). UI
 * atualiza imediato (`setSelected(next)`); se a Server Action falha, faz
 * rollback (`setSelected(previous)`) + `toast.error(res.error)`. `useTransition`
 * mantém o main thread responsivo durante o round-trip.
 *
 * Acessibilidade: `role="radiogroup"` + `aria-label="Tema da página"` no
 * container, `role="radio"` + `aria-checked` em cada card. `disabled` em
 * todos durante a transição impede cliques múltiplos. Foco visível via
 * `focus-visible:ring-2 focus-visible:ring-ring` (consome o token `--ring`
 * do tema light do dashboard — DEV-1 desta story).
 */
export function ThemeSelector({
  currentTheme,
  previewData,
}: {
  currentTheme: Theme;
  previewData: ThemePreviewData;
}) {
  const [selected, setSelected] = useState<Theme>(currentTheme);
  const [pending, setPending] = useState<Theme | null>(null);
  const [, startTransition] = useTransition();

  function handleSelect(next: Theme) {
    if (next === selected || pending) return;
    const previous = selected;
    setSelected(next);
    setPending(next);
    startTransition(async () => {
      const res = await updateTheme({ theme: next });
      setPending(null);
      if (!res.ok) {
        setSelected(previous);
        toast.error(res.error);
        return;
      }
      toast.success('Tema atualizado');
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema da página"
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      {THEMES.map((theme) => {
        const isSelected = theme === selected;
        const isPending = pending === theme;
        return (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={LABELS[theme]}
            disabled={pending !== null}
            onClick={() => handleSelect(theme)}
            className={cn(
              'group flex flex-col gap-3 rounded-lg border-2 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-muted-foreground',
              pending !== null && !isPending && 'opacity-60',
            )}
          >
            <div className="aspect-[3/4] overflow-hidden rounded-md">
              <ThemePreview theme={theme} data={previewData} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{LABELS[theme]}</span>
                <span className="text-body-sm text-muted-foreground">{DESCRIPTIONS[theme]}</span>
              </div>
              {isPending ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Salvando"
                />
              ) : isSelected ? (
                <span className="text-xs font-medium text-primary">Selecionado</span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
