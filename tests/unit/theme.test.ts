/**
 * Unit tests — `lib/theme.ts` (Story 3.1 Task 5.1).
 *
 * Cobre helpers (`isTheme`, `resolveTheme`) e sentinelas (`THEMES`,
 * `DEFAULT_THEME`). A sentinela `THEMES === ['light','dark','brand']` detecta
 * drift caso uma migration mude o enum DB sem rerun de `npm run db:types`.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, isTheme, resolveTheme, THEMES } from '@/lib/theme';

describe('lib/theme', () => {
  describe('THEMES const', () => {
    it('contém exatamente light, dark, brand (sentinela DB ↔ TS)', () => {
      expect(THEMES).toEqual(['light', 'dark', 'brand']);
    });
  });

  describe('DEFAULT_THEME', () => {
    it("é 'light' (sentinela — qualquer mudança força revisão consciente)", () => {
      expect(DEFAULT_THEME).toBe('light');
    });
  });

  describe('isTheme', () => {
    it.each(['light', 'dark', 'brand'] as const)('retorna true para "%s"', (value) => {
      expect(isTheme(value)).toBe(true);
    });

    it.each(['Light', 'DARK', 'sepia', 'invalid', ''])(
      'retorna false para string inválida "%s"',
      (value) => {
        expect(isTheme(value)).toBe(false);
      },
    );

    it('retorna false para null', () => {
      expect(isTheme(null)).toBe(false);
    });

    it('retorna false para undefined', () => {
      expect(isTheme(undefined)).toBe(false);
    });

    it('retorna false para number', () => {
      expect(isTheme(42)).toBe(false);
    });

    it('retorna false para objeto', () => {
      expect(isTheme({})).toBe(false);
    });
  });

  describe('resolveTheme', () => {
    it.each(['light', 'dark', 'brand'] as const)('retorna o valor "%s" quando válido', (value) => {
      expect(resolveTheme(value)).toBe(value);
    });

    it('retorna DEFAULT_THEME quando valor inválido', () => {
      expect(resolveTheme('invalid')).toBe(DEFAULT_THEME);
    });

    it('retorna DEFAULT_THEME quando undefined', () => {
      expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
    });

    it('retorna DEFAULT_THEME quando null', () => {
      expect(resolveTheme(null)).toBe(DEFAULT_THEME);
    });
  });
});
