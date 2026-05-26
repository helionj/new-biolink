/**
 * Route Handler — POST /api/track/click (Story 4.1 AC2/3/5/6).
 *
 * Primeiro Route Handler do projeto (todas as mutations anteriores são Server
 * Actions, architecture.md §API Style L174). Recebe `{ link_id }` de cliques
 * vindos da página pública, hasheia IP/UA com salt env, aplica rate-limit
 * 60/min/ip_hash e insere em `click_events` via service-role (bypassa RLS —
 * AC4 "insert allowed via service role only").
 *
 * Status codes:
 *   - 204 No Content: insert OK (arch §Workflow 2 L738)
 *   - 400 Bad Request: body inválido (Zod)
 *   - 404 Not Found: link inexistente OU page não publicada (AC2)
 *   - 429 Too Many Requests: rate limit excedido (AC5 — Retry-After header)
 *   - 500 Internal Server Error: insert falhou (Supabase/network)
 *
 * Runtime: `nodejs` — Buffer.from() é Node-only e simplifica conversão
 * Web-Crypto-output → base64 string (`Insert.ip_hash: string | null` per
 * supabase/types.ts pós-0007; DEV-4 validado em pnpm db:types).
 */
import { z } from 'zod';

import { hashPIINullable } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  link_id: z.string().uuid(),
});

const RATE_LIMIT = { max: 60, windowMs: 60_000 } as const;

export async function POST(request: Request): Promise<Response> {
  // 1. Parse + validate body
  const json = await request.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return new Response(null, { status: 400 });
  }
  const { link_id } = parsed.data;

  // 2. Extract IP + UA (Vercel/Cloudflare proxy headers — request.ip foi
  //    removido do Next 15+; x-forwarded-for é canônico para Next 16).
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent');

  // 3. Hash PII ANTES do rate-limit (chave = ip_hash hex, defesa anti-PII
  //    em memória do processo).
  const ipHash = await hashPIINullable(ip);
  const uaHash = await hashPIINullable(userAgent);

  // 4. Rate limit: bypass se ipHash ausente (proxies que strippam IP).
  //    Decisão defensiva: não-bloquear tracking legítimo quando IP é unknown.
  if (ipHash) {
    const key = ipHash.toString('hex');
    const { allowed, resetAt } = checkRateLimit(key, RATE_LIMIT);
    if (!allowed) {
      return new Response(null, {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))),
        },
      });
    }
  }

  // 5. Resolver link via service-role (AC2). service-role bypassa RLS —
  //    necessário para resolver link público (visitante anônimo NÃO tem
  //    auth.uid()) sem expor SELECT permissivo no DB.
  const admin = createAdmin();
  const { data: link, error: selectError } = await admin
    .from('links')
    .select('id, page_id, pages!inner(is_published)')
    .eq('id', link_id)
    .maybeSingle();

  if (selectError) {
    console.error('[track/click] link lookup failed', selectError);
    return new Response(null, { status: 500 });
  }
  if (!link) {
    return new Response(null, { status: 404 });
  }
  // pages!inner com .single() retorna objeto único; PostgREST/types.ts narrowing
  // pode tipar como array — defensivo aceita ambos.
  const pages = link.pages as unknown as { is_published: boolean } | { is_published: boolean }[];
  const isPublished = Array.isArray(pages) ? pages[0]?.is_published : pages.is_published;
  if (!isPublished) {
    return new Response(null, { status: 404 });
  }

  // 6. Insert via service-role (bypassa RLS — AC4). Supabase JS encaminha o
  //    valor como texto para o PostgREST; o formato canônico de bytea em texto
  //    é `\x<hex>` (Postgres `bytea_output` padrão hex) — base64 é interpretado
  //    como bytes da string ASCII, quebrando a check constraint de 32 bytes.
  //    DEV-4 validado em runtime: hex prefixado é o caminho seguro.
  const { error: insertError } = await admin.from('click_events').insert({
    link_id,
    user_agent_hash: uaHash ? '\\x' + uaHash.toString('hex') : null,
    ip_hash: ipHash ? '\\x' + ipHash.toString('hex') : null,
  });

  if (insertError) {
    console.error('[track/click] insert failed', insertError);
    return new Response(null, { status: 500 });
  }

  // 7. Sucesso — arch §Workflow 2 L738 ("TRACK-->>V: 204 No Content").
  return new Response(null, { status: 204 });
}
