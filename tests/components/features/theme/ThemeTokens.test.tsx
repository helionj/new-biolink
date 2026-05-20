/**
 * Component-level tests — Theme tokens (Story 3.1 Task 5.2).
 *
 * Estratégia AC1: validamos a PRESENÇA dos seletores `[data-theme="..."]` e
 * `.dark` no source `app/globals.css` via leitura de arquivo. jsdom 29 não
 * computa CSS vars de stylesheets externas de forma confiável (especialmente
 * com `@theme inline` do Tailwind 4), então regex no source é mais barato e
 * direto para garantir que o vocabulário visual está estruturado.
 *
 * AC3 cobertura: smoke import do `lib/theme` confirmando superfície pública.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, isTheme, resolveTheme, THEMES, type Theme } from '@/lib/theme';

const globalsCss = readFileSync(resolve(__dirname, '../../../../app/globals.css'), 'utf8');

describe('app/globals.css — theme selectors (AC1)', () => {
  it('define :root, [data-theme="light"] (composto)', () => {
    expect(globalsCss).toMatch(/:root,\s*\[data-theme=['"]light['"]\]/);
  });

  it('define [data-theme="dark"] (acoplado a .dark via seletor composto)', () => {
    expect(globalsCss).toMatch(/\[data-theme=['"]dark['"]\],\s*\.dark/);
  });

  it('define [data-theme="brand"]', () => {
    expect(globalsCss).toMatch(/\[data-theme=['"]brand['"]\]/);
  });

  it.each(['background', 'foreground', 'primary', 'muted', 'border', 'radius'])(
    'declara token --%s',
    (token) => {
      expect(globalsCss).toContain(`--${token}:`);
    },
  );

  it('mantém @theme inline para Tailwind 4 utilities', () => {
    expect(globalsCss).toMatch(/@theme inline/);
  });

  it('mantém fallback @media (prefers-color-scheme: dark) restrito a :not()', () => {
    expect(globalsCss).toMatch(/:root:not\(\[data-theme\]\):not\(\.dark\)/);
  });
});

describe('lib/theme — surface (AC3)', () => {
  it('exporta superfície pública esperada', () => {
    expect(THEMES).toBeDefined();
    expect(DEFAULT_THEME).toBeDefined();
    expect(typeof isTheme).toBe('function');
    expect(typeof resolveTheme).toBe('function');
  });

  it('THEMES tem tipagem readonly e inclui todos os presets', () => {
    const themes: readonly Theme[] = THEMES;
    expect(themes).toContain('light');
    expect(themes).toContain('dark');
    expect(themes).toContain('brand');
  });
});
