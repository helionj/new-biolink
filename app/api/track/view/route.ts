/**
 * Route Handler — POST /api/track/view (Story 4.2 AC2/3/5).
 *
 * Segundo Route Handler do projeto (pareando com /api/track/click da 4.1).
 * Recebe `{ page_id }` de mounts de página pública via ViewBeacon
 * (components/public/ViewBeacon.tsx), hasheia IP/UA com salt env, aplica
 * rate-limit 60/min/ip_hash (REUSE de lib/rate-limit da 4.1, arch §Security
 * L2138) e delega o insert + dedup window (30min, AC3) ao lib/track.ts
 * (insertPageView, Task 4).
 *
 * DEV-6 (ratificado por @po): valida `pages.is_published = true` antes do
 * insert — simetria com 4.1 + arch §Workflow 2 L728, defesa contra anon
 * registrar view em página privada/draft.
 *
 * DEV-7 (ratificado por @po): retorna 204 uniformemente em insert OK E em
 * duplicate detected — semântica "request aceito, sem body". Cliente
 * (sendBeacon) não inspeciona body/status, fire-and-forget. Insertion vs
 * dedup é detalhe server-side, validado em integration tests.
 *
 * Status codes:
 *   - 204 No Content: insert OK ou duplicate (DEV-7 uniforme)
 *   - 400 Bad Request: body inválido (Zod)
 *   - 404 Not Found: page inexistente OU is_published=false (DEV-6)
 *   - 429 Too Many Requests: rate limit excedido (Retry-After header)
 *   - 500 Internal Server Error: insert/lookup falhou (Supabase/network)
 *
 * Runtime: `nodejs` — Buffer.from() é Node-only e simplifica conversão
 * Web-Crypto-output → hex string (DEV-4 herdado de 4.1).
 */
import { z } from 'zod';

import { hashPIINullable } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAdmin } from '@/lib/supabase/admin';
import { insertPageView } from '@/lib/track';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  page_id: z.string().uuid(),
});

const RATE_LIMIT = { max: 60, windowMs: 60_000 } as const;

export async function POST(request: Request): Promise<Response> {
  // 1. Parse + validate body
  const json = await request.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return new Response(null, { status: 400 });
  }
  const { page_id } = parsed.data;

  // 2. Extract IP + UA (REUSE 100% pattern da 4.1)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent');

  // 3. Rate limit por ip_hash (REUSE da 4.1, AC5 da 4.1 cobre tracking
  //    endpoints em geral conforme arch §Security L2138). Hashear ANTES
  //    para usar ip_hash como chave (defesa anti-PII em memória).
  const ipHash = await hashPIINullable(ip);
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

  // 4. Resolver page + check is_published (DEV-6) via service-role.
  //    service-role bypassa RLS — necessário para resolver page pública
  //    (visitante anônimo NÃO tem auth.uid()) sem expor SELECT permissivo
  //    no DB.
  const admin = createAdmin();
  const { data: page, error: selectError } = await admin
    .from('pages')
    .select('id, is_published')
    .eq('id', page_id)
    .maybeSingle();

  if (selectError) {
    console.error('[track/view] page lookup failed', selectError);
    return new Response(null, { status: 500 });
  }
  if (!page || !page.is_published) {
    return new Response(null, { status: 404 });
  }

  // 5. Insert via lib/track (handles dedup AC3) — DEV-7: 204 uniforme em
  //    inserted: true E em duplicate.
  const result = await insertPageView({ pageId: page_id, ip, userAgent });
  if (!result.inserted && result.reason === 'error') {
    return new Response(null, { status: 500 });
  }

  // 6. Sucesso — insert OK ou duplicate (ambos 204).
  return new Response(null, { status: 204 });
}
