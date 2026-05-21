/**
 * Unit tests — `parseUsername` (Story 2.7 FIX-RT-001).
 *
 * Cobertura do invariante crítico: Next.js 16 RSC (Turbopack) entrega
 * `params.username` URL-encoded (`%40helionporto`), não decoded. O parser
 * deve aceitar ambos os formatos (`@x` literal e `%40x` encoded) sem falhar.
 */

import { describe, expect, it } from 'vitest';

import { parseUsername } from '@/lib/parse-username';

describe('parseUsername', () => {
  describe('formato literal `@x`', () => {
    it('aceita `@helionporto` → `helionporto`', () => {
      expect(parseUsername('@helionporto')).toBe('helionporto');
    });

    it('normaliza para lowercase', () => {
      expect(parseUsername('@HELIONporto')).toBe('helionporto');
    });
  });

  describe('formato URL-encoded `%40x` (FIX-RT-001 — Next 16 Turbopack RSC)', () => {
    it('aceita `%40helionporto` → `helionporto`', () => {
      expect(parseUsername('%40helionporto')).toBe('helionporto');
    });

    it('aceita `%40HELIONporto` → `helionporto` (lowercase)', () => {
      expect(parseUsername('%40HELIONporto')).toBe('helionporto');
    });
  });

  describe('inputs inválidos → null (404 silencioso)', () => {
    it('sem prefixo `@`: `helionporto` → null', () => {
      expect(parseUsername('helionporto')).toBeNull();
    });

    it('só `@`: `@` → null (username vazio)', () => {
      expect(parseUsername('@')).toBeNull();
    });

    it('só `%40` (decoded para `@`) → null (username vazio)', () => {
      expect(parseUsername('%40')).toBeNull();
    });

    it('string vazia → null', () => {
      expect(parseUsername('')).toBeNull();
    });

    it('URI malformed (`%FF` isolado): captura erro e retorna null', () => {
      // %FF não é UTF-8 válido → decodeURIComponent lança URIError
      expect(parseUsername('%FFinvalido')).toBeNull();
    });

    it('prefixo errado: `#helionporto` → null', () => {
      expect(parseUsername('#helionporto')).toBeNull();
    });
  });
});
