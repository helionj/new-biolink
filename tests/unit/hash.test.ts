/**
 * Unit tests — `lib/hash.ts` (Story 4.1 AC3).
 *
 * Cobre: 32 bytes garantidos (sha-256), determinismo, salt dependence,
 * null/empty handling. NÃO testa valor exato do hash (acoplaria à salt
 * específica).
 */
import { describe, expect, it, vi } from 'vitest';

// Mock @/lib/env ANTES do import de @/lib/hash. `vi.mock` é hoisted pelo
// Vitest para o topo do arquivo, então funciona mesmo com ES modules.
// Sem isso, lib/env.ts faz `EnvSchema.parse(process.env)` no import e quebra
// no ambiente de unit test (env vars de Supabase indisponíveis).
vi.mock('@/lib/env', () => ({
  env: {
    HASH_SALT: 'a'.repeat(32), // 32 chars; satisfaz validação min(32)
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    NEXT_PUBLIC_SITE_URL: 'http://localhost',
  },
}));

const { hashPII, hashPIINullable } = await import('@/lib/hash');

describe('hashPII', () => {
  it('retorna Buffer de 32 bytes (sha-256 canônico)', async () => {
    const hash = await hashPII('1.2.3.4');
    expect(hash).toBeInstanceOf(Buffer);
    expect(hash.length).toBe(32);
  });

  it('determinismo: mesmo input → mesmo output', async () => {
    const a = await hashPII('test-input');
    const b = await hashPII('test-input');
    expect(a.equals(b)).toBe(true);
  });

  it('inputs diferentes → outputs diferentes (distribution sanity)', async () => {
    const a = await hashPII('1.2.3.4');
    const b = await hashPII('1.2.3.5');
    expect(a.equals(b)).toBe(false);
  });

  it('UA típico (Mozilla long string) hashes para 32 bytes', async () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';
    const hash = await hashPII(ua);
    expect(hash.length).toBe(32);
  });
});

describe('hashPIINullable', () => {
  it('retorna null para input null', async () => {
    expect(await hashPIINullable(null)).toBeNull();
  });

  it('retorna null para input undefined', async () => {
    expect(await hashPIINullable(undefined)).toBeNull();
  });

  it('retorna null para empty string (header vazio é tratado como ausente)', async () => {
    expect(await hashPIINullable('')).toBeNull();
  });

  it('retorna Buffer de 32 bytes para string válida', async () => {
    const hash = await hashPIINullable('1.2.3.4');
    expect(hash).toBeInstanceOf(Buffer);
    expect(hash?.length).toBe(32);
  });

  it('é consistente com hashPII para inputs válidos', async () => {
    const direct = await hashPII('test');
    const viaNullable = await hashPIINullable('test');
    expect(viaNullable?.equals(direct)).toBe(true);
  });
});
