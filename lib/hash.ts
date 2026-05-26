/**
 * SHA-256 hashing helpers for PII (Story 4.1 AC3).
 *
 * Hash primário acontece aqui (TS, runtime Node/Edge via Web Crypto) — a função
 * `hash_pii(text)` em Postgres é defensiva (apenas para scripts SQL ad-hoc) e
 * intencionalmente NÃO foi criada nesta story (DEV-3; schema-design.md §4
 * linhas 385-411).
 *
 * Output canônico: 32 bytes (`octet_length = 32`) — validado pela check
 * constraint `chk_click_events_hash_size` no DB (0007_click_events.sql).
 *
 * Salt: `env.HASH_SALT` (≥ 32 chars hex), validado em `lib/env.ts:11-13`
 * (Story 1.x). NUNCA hashar sem salt — defesa anti-rainbow-table.
 */
import { env } from '@/lib/env';

const encoder = new TextEncoder();

/**
 * Hash determinístico de uma string + salt. Sempre retorna 32 bytes.
 *
 * Uso típico: `hashPII(ip)` ou `hashPII(userAgent)` no Route Handler
 * `/api/track/click` (Task 6). NÃO usar para senhas (use bcrypt do Supabase
 * Auth) — esta função é determinística por design (queries de agregação por
 * `ip_hash` em analytics requerem consistência).
 */
export async function hashPII(value: string): Promise<Buffer> {
  const data = encoder.encode(value + env.HASH_SALT);
  const ab = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(ab);
}

/**
 * Variante nullable — retorna `null` se input falsy (null/undefined/empty
 * string). Útil quando headers estão ausentes em prod (proxies que strippam
 * IP/UA): inserir `null` em `click_events.ip_hash`/`user_agent_hash` é
 * permitido por design (colunas nullable + chk_click_events_hash_size aceita
 * NULL).
 */
export async function hashPIINullable(value: string | null | undefined): Promise<Buffer | null> {
  if (!value) return null;
  return hashPII(value);
}
