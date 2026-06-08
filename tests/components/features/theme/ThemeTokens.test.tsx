/**
 * Component-level tests — Theme tokens (Story 3.1 Task 5.2 + [STORY-3.1-F1] refactor 2026-06-08).
 *
 * Estratégia AC1: validamos a PRESENÇA dos seletores `[data-theme="..."]` no
 * source `app/globals.css` via leitura de arquivo. jsdom 29 não computa CSS
 * vars de stylesheets externas de forma confiável (especialmente com
 * `@theme inline` do Tailwind 4), então regex no source é mais barato e
 * direto para garantir que o vocabulário visual está estruturado.
 *
 * Post-[STORY-3.1-F1]: classe `.dark` eliminada da codebase; `[data-theme="dark"]`
 * é single source of truth para dark mode activation.
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

  it('define [data-theme="dark"] (single source — classe .dark eliminada per [STORY-3.1-F1])', () => {
    expect(globalsCss).toMatch(/\[data-theme=['"]dark['"]\]\s*\{/);
    // Anti-regressão: classe .dark NÃO deve ser ativador (apenas referências
    // históricas em comentários JSDoc são permitidas).
    expect(globalsCss).not.toMatch(/^\s*\.dark\s*\{/m);
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

  it('mantém fallback @media (prefers-color-scheme: dark) restrito a :not([data-theme])', () => {
    expect(globalsCss).toMatch(/:root:not\(\[data-theme\]\)/);
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
