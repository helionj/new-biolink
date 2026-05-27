/**
 * Unit tests — `lib/track.ts` (Story 4.2 AC2/3).
 *
 * Cobre cenários do `insertPageView`:
 *   (a) primeiro request → { inserted: true }
 *   (b) request duplicado em <30min → { inserted: false, reason: 'duplicate' }
 *   (c) request após >30min (sem row no window) → { inserted: true }
 *   (d) ip === null → bypass dedup, sempre insere
 *   (e) erro de Supabase no dedup query → { inserted: false, reason: 'error' }
 *   (f) erro de Supabase no insert → { inserted: false, reason: 'error' }
 *   (g) hash determinístico chamado: spies em hashPIINullable recebem ip e ua exatos
 *
 * Mockamos `@/lib/supabase/admin` retornando um builder in-memory que captura
 * inputs e responde com data/error programáveis por teste. Não testamos valor
 * exato do hash (acopla a salt específico — `lib/hash.test.ts` da 4.1 já cobre).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock env ANTES do import de lib/track (que transitivamente carrega lib/hash → lib/env).
vi.mock('@/lib/env', () => ({
  env: {
    HASH_SALT: 'a'.repeat(32),
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    NEXT_PUBLIC_SITE_URL: 'http://localhost',
  },
}));

// --- Mock Supabase admin builder ----------------------------------------------
// Cada teste configura `dedupResult` e `insertResult` antes da chamada.
// O builder retorna chainable fluent que termina em maybeSingle (dedup) ou no
// próprio insert promise.

type AdminResponse<T> = { data: T | null; error: { message: string } | null };

const state: {
  dedupResult: AdminResponse<{ id: number }>;
  insertResult: AdminResponse<unknown>;
  insertedRows: Array<{ page_id: string; user_agent_hash: string | null; ip_hash: string | null }>;
  dedupCalls: Array<{ pageId?: string; ipHash?: string; cutoff?: string }>;
} = {
  dedupResult: { data: null, error: null },
  insertResult: { data: null, error: null },
  insertedRows: [],
  dedupCalls: [],
};

function makeBuilder() {
  const current: { pageId?: string; ipHash?: string; cutoff?: string } = {};
  const builder: Record<string, unknown> = {};

  // chainable methods that just return `this` (builder)
  const noop = () => builder;

  builder.select = noop;
  builder.eq = (col: string, val: string) => {
    if (col === 'page_id') current.pageId = val;
    if (col === 'ip_hash') current.ipHash = val;
    return builder;
  };
  builder.gte = (col: string, val: string) => {
    if (col === 'viewed_at') current.cutoff = val;
    return builder;
  };
  builder.limit = noop;
  builder.maybeSingle = async () => {
    state.dedupCalls.push({ ...current });
    return state.dedupResult;
  };

  // insert path (terminal, awaited directly without .select)
  builder.insert = (row: {
    page_id: string;
    user_agent_hash: string | null;
    ip_hash: string | null;
  }) => {
    state.insertedRows.push(row);
    return Promise.resolve(state.insertResult) as unknown as typeof builder;
  };

  return builder;
}

const fromMock = vi.fn(() => makeBuilder());

vi.mock('@/lib/supabase/admin', () => ({
  createAdmin: () => ({ from: fromMock }),
}));

// Spy em hashPIINullable para verificar inputs passados (cenário g).
import * as hashMod from '@/lib/hash';
const hashSpy = vi.spyOn(hashMod, 'hashPIINullable');

const { insertPageView } = await import('@/lib/track');

const TEST_PAGE_ID = '11111111-1111-4111-8111-111111111111';

describe('insertPageView', () => {
  beforeEach(() => {
    state.dedupResult = { data: null, error: null };
    state.insertResult = { data: null, error: null };
    state.insertedRows = [];
    state.dedupCalls = [];
    fromMock.mockClear();
    hashSpy.mockClear();
  });

  // ---------------------------------------------------------------------------
  // (a) primeiro request → inserted: true
  // ---------------------------------------------------------------------------
  it('(a) primeiro request (sem dedup hit) → { inserted: true }', async () => {
    const result = await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: '203.0.113.42',
      userAgent: 'UA-test',
    });

    expect(result).toEqual({ inserted: true });
    expect(state.insertedRows).toHaveLength(1);
    expect(state.insertedRows[0]!.page_id).toBe(TEST_PAGE_ID);
    expect(state.insertedRows[0]!.ip_hash).toMatch(/^\\x[0-9a-f]{64}$/);
    expect(state.insertedRows[0]!.user_agent_hash).toMatch(/^\\x[0-9a-f]{64}$/);
  });

  // ---------------------------------------------------------------------------
  // (b) request duplicado em <30min
  // ---------------------------------------------------------------------------
  it('(b) dedup hit em <30min → { inserted: false, reason: "duplicate" }', async () => {
    state.dedupResult = { data: { id: 99 }, error: null };

    const result = await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: '203.0.113.42',
      userAgent: 'UA-test',
    });

    expect(result).toEqual({ inserted: false, reason: 'duplicate' });
    expect(state.insertedRows).toHaveLength(0); // não inseriu nada
  });

  // ---------------------------------------------------------------------------
  // (c) request após >30min — dedup query retorna 0 rows → inserted: true
  // ---------------------------------------------------------------------------
  it('(c) após window expirado (dedup data: null) → { inserted: true }', async () => {
    state.dedupResult = { data: null, error: null }; // window expirado, 0 rows
    const result = await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: '203.0.113.42',
      userAgent: 'UA-test',
    });

    expect(result).toEqual({ inserted: true });
    expect(state.insertedRows).toHaveLength(1);

    // Validar que o cutoff passado é ~30min atrás
    expect(state.dedupCalls).toHaveLength(1);
    const cutoffMs = Date.parse(state.dedupCalls[0]!.cutoff!);
    const expectedMs = Date.now() - 30 * 60 * 1000;
    expect(Math.abs(cutoffMs - expectedMs)).toBeLessThan(1000); // <1s drift
  });

  // ---------------------------------------------------------------------------
  // (d) ip === null → bypass dedup, sempre insere
  // ---------------------------------------------------------------------------
  it('(d) ip === null → bypass dedup, sempre insere', async () => {
    // Mesmo que o dedup mock retorne duplicate, NÃO deve ser consultado
    state.dedupResult = { data: { id: 123 }, error: null };

    const result = await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: null,
      userAgent: 'UA-test',
    });

    expect(result).toEqual({ inserted: true });
    expect(state.dedupCalls).toHaveLength(0); // dedup NÃO consultado
    expect(state.insertedRows).toHaveLength(1);
    expect(state.insertedRows[0]!.ip_hash).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // (e) erro de Supabase no dedup query
  // ---------------------------------------------------------------------------
  it('(e) dedup query falha → { inserted: false, reason: "error" }', async () => {
    state.dedupResult = { data: null, error: { message: 'fake dedup error' } };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: '203.0.113.42',
      userAgent: 'UA-test',
    });

    expect(result).toEqual({ inserted: false, reason: 'error' });
    expect(state.insertedRows).toHaveLength(0);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // (f) erro de Supabase no insert
  // ---------------------------------------------------------------------------
  it('(f) insert falha → { inserted: false, reason: "error" }', async () => {
    state.insertResult = { data: null, error: { message: 'fake insert error' } };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: '203.0.113.42',
      userAgent: 'UA-test',
    });

    expect(result).toEqual({ inserted: false, reason: 'error' });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // (g) hash determinístico — spy em hashPIINullable recebe inputs exatos
  // ---------------------------------------------------------------------------
  it('(g) hashPIINullable é chamado com ip e userAgent exatos', async () => {
    await insertPageView({
      pageId: TEST_PAGE_ID,
      ip: '198.51.100.7',
      userAgent: 'CustomAgent/1.0',
    });

    expect(hashSpy).toHaveBeenCalledWith('198.51.100.7');
    expect(hashSpy).toHaveBeenCalledWith('CustomAgent/1.0');
  });
});
