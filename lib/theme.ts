/**
 * Theme presets — leitura e validação (Story 3.1).
 *
 * Fonte única de verdade: o enum `theme_preset` do schema Supabase
 * (`0002_profiles.sql`, `0003_pages.sql`). Importar `Theme` aqui em vez de
 * redeclarar a union literal garante que migrations futuras (ex.: novo preset
 * `'sepia'`) se propaguem automaticamente após `npm run db:types`.
 *
 * Este módulo é PURO (zero side-effects, sem `'use client'`, sem Supabase
 * client). Mutação de `pages.theme` / `profiles.theme` é Story 3.3 via Server
 * Action (`server/page/actions.ts` ou `server/profile/actions.ts`).
 */

import type { Database } from '@/lib/supabase/types';

export type Theme = Database['public']['Enums']['theme_preset'];

export const THEMES = ['light', 'dark', 'brand'] as const satisfies readonly Theme[];

export const DEFAULT_THEME: Theme = 'light';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function resolveTheme(value: unknown): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}
