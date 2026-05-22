'use server';

/**
 * Server Actions de `pages` (Story 3.3).
 *
 * Cobre mutations do recurso `pages` cujo owner é `auth.uid()` via RLS:
 *   - updateTheme: troca o preset de tema (`pages.theme`) do dono.
 *
 * Fronteira de autorização: RLS `pages_update_own` (0003_pages.sql) — UPDATE
 * só atinge a row com `profile_id = auth.uid()`. O auth guard no topo é
 * defense in depth (a Server Component da page também redireciona guests).
 *
 * Invalidação de cache: `revalidateUserSurface(username)` é o único caminho
 * autorizado a chamar `revalidatePath` (Coding Standards §revalidate);
 * revalida `/dashboard` (layout) e `/@${username}` (página pública).
 *
 * Futuras Server Actions (`togglePublished`, etc.) devem viver neste módulo.
 */

import { revalidateUserSurface } from '@/lib/cache';
import type { ActionResult } from '@/lib/result';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';
import { UpdateThemeInput } from '@/lib/validators/page';

type Page = Tables<'pages'>;

// Espelha server/profile/actions.ts:12-22 e server/links/actions.ts:17-29 —
// mesmo padrão de achatamento de fieldErrors do Zod (mantido local para não
// acoplar os módulos server/).
function flattenFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const out: Record<string, string> = {};
  const flat = error.flatten().fieldErrors;
  for (const [field, messages] of Object.entries(flat)) {
    const first = messages?.[0];
    if (first) out[field] = first;
  }
  return out;
}

const SESSION_EXPIRED = 'Sessão expirada. Faça login novamente.';
const GENERIC_ERROR = 'Erro ao salvar o tema. Tente novamente';

export async function updateTheme(input: unknown): Promise<ActionResult<Page>> {
  const parsed = UpdateThemeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Tema inválido', fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: SESSION_EXPIRED };
  }

  // Relação 1:1 `profiles → pages` garantida pelo trigger
  // `on_auth_user_created` (Story 2.2): existe exatamente uma row de `pages`
  // por user. RLS `pages_update_own` (0003_pages.sql) restringe o UPDATE à
  // row do owner — `.eq('profile_id', user.id)` é defense in depth.
  const { data: page, error } = await supabase
    .from('pages')
    .update({ theme: parsed.data.theme })
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error || !page) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // Resolve username em query separada — embed 1:1 do PostgREST tipado como
  // array no supabase-js quebra o acesso (mesmo motivo de
  // server/links/actions.ts:75-92). Falha silenciosa: a página pública só
  // existirá se o username for resolvido; mutation já persistiu.
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  revalidateUserSurface(profile?.username ?? null);
  return { ok: true, data: page };
}
