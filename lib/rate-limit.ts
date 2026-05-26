/**
 * In-memory fixed-window rate limiter (Story 4.1 AC5).
 *
 * Usado pelo Route Handler `/api/track/click` para limitar **60 events/min por
 * ip_hash** (verbatim AC5). Implementação intencionalmente simples: 1 Map em
 * memória + fixed-window counter + cleanup piggybacked. Sliding window é
 * overkill para o caso de uso ("básico").
 *
 * LIMITAÇÃO FUNDAMENTAL (DEV-5): em serverless (Vercel Functions), cada cold
 * start cria nova instância do módulo → o Map é PER-INSTANCE, não global.
 * Múltiplas instâncias paralelas podem aceitar tráfego acima do limite
 * agregado. AC5 verbatim permite "em-memory ou Redis-free fallback" — esta
 * implementação é o fallback explícito do PRD. Mitigações com Redis (Upstash/
 * Vercel KV) ficam para Phase 2 se observabilidade indicar abuso.
 *
 * Não usa `setInterval` para cleanup (não-funcional em ambiente serverless) —
 * limpeza piggybacked nas próprias chamadas (a cada 100 invocações, varre
 * entradas com janela já expirada).
 */

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();
let callCount = 0;

const CLEANUP_INTERVAL = 100;

export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  resetAt: number;
  remaining: number;
};

/**
 * Verifica se uma `key` (tipicamente `ip_hash` em hex) ainda pode realizar
 * uma ação. Incrementa o contador quando `allowed=true`. NÃO incrementa
 * quando bloqueado (fixed-window — overflow consome 1 slot só na 1ª rejeição
 * via o caminho `count++` antes do retorno).
 *
 * Idempotência por chave: keys diferentes têm contadores independentes.
 *
 * `resetAt` é monotônico DENTRO de uma mesma janela ativa, e é redefinido
 * quando a janela expira (timestamp absoluto em ms).
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  // Janela expirada → reset
  if (!entry || entry.windowStart + opts.windowMs < now) {
    entry = { count: 0, windowStart: now };
    store.set(key, entry);
  }

  // Cleanup piggybacked — varre o store para evitar memory leak em produção
  // sob alto tráfego. Threshold de 100 calls é um trade-off: barato o suficiente
  // para não pesar no hot path, frequente o suficiente para manter o Map enxuto.
  if (++callCount % CLEANUP_INTERVAL === 0) {
    for (const [k, v] of store) {
      // Conservador: só remove se a janela já expirou há windowMs adicional
      // (dá folga para evitar race entre cleanup e check da mesma chave).
      if (v.windowStart + opts.windowMs * 2 < now) {
        store.delete(k);
      }
    }
  }

  if (entry.count >= opts.max) {
    return {
      allowed: false,
      resetAt: entry.windowStart + opts.windowMs,
      remaining: 0,
    };
  }

  entry.count++;
  return {
    allowed: true,
    resetAt: entry.windowStart + opts.windowMs,
    remaining: opts.max - entry.count,
  };
}

/**
 * Escape hatch usado em tests (Vitest beforeEach) para garantir isolamento
 * entre cenários. NÃO chamar em produção — apaga contadores ativos e quebra
 * o limite efetivo até a próxima janela.
 */
export function __resetRateLimit(): void {
  store.clear();
  callCount = 0;
}
