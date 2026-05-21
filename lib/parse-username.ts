/**
 * Parse do segmento dinâmico `/@username` da rota pública (Story 2.7).
 *
 * Comportamento esperado:
 *   parseUsername('@helionporto')   → 'helionporto'
 *   parseUsername('%40helionporto') → 'helionporto'   (URL-encoded; ver nota)
 *   parseUsername('@HELIONporto')   → 'helionporto'   (lowercase; citext+CHECK)
 *   parseUsername('helionporto')    → null            (sem prefixo @)
 *   parseUsername('%40')            → null            (só @, vazio depois)
 *   parseUsername('%FFinvalido')    → null            (sequência URI inválida)
 *
 * **Decoding defensivo (FIX-RT-001):** o Next.js 16 RSC com Turbopack entrega
 * `params.username` **URL-encoded** (`'%40helionporto'`), não decoded. Aplicamos
 * `decodeURIComponent` antes do `startsWith('@')` para aceitar ambos os formatos.
 * Se a string for malformed, `decodeURIComponent` lança — capturamos e
 * retornamos `null` (= 404 silencioso para o visitante).
 *
 * Lowercase é defesa em profundidade: o CHECK `^[a-z0-9-]+$` em
 * `0002_profiles.sql:67` já força lowercase no signup, e `username` é `citext`
 * (case-insensitive). Normalizar aqui evita ambiguidade no fetch.
 */
export function parseUsername(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith('@')) return null;
  const username = decoded.slice(1).toLowerCase();
  if (username.length === 0) return null;
  return username;
}
