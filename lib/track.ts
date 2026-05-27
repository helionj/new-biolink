/**
 * Server-side page view tracker (Story 4.2 AC2/3).
 *
 * Hasheia PII (ip, user-agent) com HASH_SALT (REUSE lib/hash.ts da 4.1),
 * aplica dedup window de 30 min (AC3 — query app-side por page_id + ip_hash +
 * viewed_at >= now() - 30min), e insere row em page_views via service-role
 * (DEV-5 herdado de 4.1 DEV-3 — admin bypassa RLS, AC4).
 *
 * RACE WINDOW (DEV-2): dois requests paralelos do mesmo ip_hash+page_id
 * podem ambos passar o SELECT antes do INSERT — duplicação <0.1% esperada,
 * aceitável para tracking estatístico (não-financeiro). Mitigações DB-level
 * rejeitadas: Postgres não suporta now() em predicate de partial unique index
 * (must be IMMUTABLE); trigger AFTER INSERT é overkill para MVP. Phase 2 pode
 * revisitar se análise mostrar abuse pattern.
 *
 * BYTEA serialization (DEV-4 herdado de 4.1): Supabase JS exige formato
 * `\x<hex>` (NÃO base64) — Postgres bytea_output padrão hex. Validado em
 * runtime na 4.1 (tests/integration/api/track-click.test.ts cenário g).
 */
import { hashPIINullable } from '@/lib/hash';
import { createAdmin } from '@/lib/supabase/admin';

/** Dedup window per PRD AC3 — 30 minutos. Exportado para 4.3/4.4 referirem se necessário. */
export const DEDUP_WINDOW_MS = 30 * 60 * 1000;

export type InsertPageViewResult =
  | { inserted: true }
  | { inserted: false; reason: 'duplicate' | 'error' };

/**
 * Insere uma page view com dedup window de 30 min por (page_id, ip_hash).
 *
 * - Se `ip` é null (proxy strippa IP), bypass dedup (não há chave estável) →
 *   sempre insere (idem bypass de rate-limit da 4.1 Route Handler Task 6.4).
 * - Hash de IP/UA via Web Crypto sha256 + HASH_SALT (lib/hash.ts).
 * - Insert via service-role (lib/supabase/admin.ts) — bypassa RLS por design.
 *
 * @returns `{ inserted: true }` em sucesso; `{ inserted: false, reason: 'duplicate' }`
 *   se row recente já existe no window; `{ inserted: false, reason: 'error' }` em
 *   falha de Supabase (já loggada via console.error).
 */
export async function insertPageView(input: {
  pageId: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<InsertPageViewResult> {
  const ipHash = await hashPIINullable(input.ip);
  const uaHash = await hashPIINullable(input.userAgent);

  const admin = createAdmin();

  // Dedup window check (DEV-2). Bypass se ipHash ausente (nenhuma chave estável).
  if (ipHash) {
    const ipHashHex = '\\x' + ipHash.toString('hex');
    const cutoffIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

    const { data: existing, error: dedupErr } = await admin
      .from('page_views')
      .select('id')
      .eq('page_id', input.pageId)
      .eq('ip_hash', ipHashHex)
      .gte('viewed_at', cutoffIso)
      .limit(1)
      .maybeSingle();

    if (dedupErr) {
      console.error('[track/view] dedup query failed', dedupErr);
      return { inserted: false, reason: 'error' };
    }
    if (existing) {
      return { inserted: false, reason: 'duplicate' };
    }
  }

  // Insert (DEV-4: bytea como \x<hex>, não base64).
  const { error: insertErr } = await admin.from('page_views').insert({
    page_id: input.pageId,
    user_agent_hash: uaHash ? '\\x' + uaHash.toString('hex') : null,
    ip_hash: ipHash ? '\\x' + ipHash.toString('hex') : null,
  });

  if (insertErr) {
    console.error('[track/view] insert failed', insertErr);
    return { inserted: false, reason: 'error' };
  }

  return { inserted: true };
}
