'use server';

import type { ActionResult } from '@/lib/result';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';
import { CheckUsernameInput, UpdateUsernameInput } from '@/lib/validators/profile';

type Profile = Tables<'profiles'>;

// Espelha server/auth/actions.ts:15-25 — mesmo padrão de achatamento de
// fieldErrors do Zod (mantido local para não acoplar os módulos server/).
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

export async function updateUsername(input: unknown): Promise<ActionResult<Profile>> {
  const parsed = UpdateUsernameInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Entrada inválida',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — a Server Component da page também faz esse check.
  if (!user) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // Unicidade transacional (AC4 / DP-4): o UNIQUE de `citext` (migration 0002
  // linha 66) é a garantia race-free (TOCTOU-safe). Não fazemos pre-SELECT
  // como garantia — confiamos no UPDATE sob RLS `profiles_update_own` e
  // mapeamos a violação 23505.
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ username: parsed.data.username })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    const message = error.message ?? '';
    if (/23505|duplicate key/i.test(message) || error.code === '23505') {
      return {
        ok: false,
        error: 'Este username já está em uso',
        fieldErrors: { username: 'Este username já está em uso' },
      };
    }
    return { ok: false, error: 'Erro ao atualizar username. Tente novamente' };
  }

  if (!profile) {
    return { ok: false, error: 'Erro ao atualizar username. Tente novamente' };
  }

  return { ok: true, data: profile };
}

export async function checkUsernameAvailability(
  input: unknown,
): Promise<ActionResult<{ available: boolean }>> {
  const parsed = CheckUsernameInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Entrada inválida',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  // AP-5 (schema-design.md:277-284): SELECT 1 FROM profiles WHERE username = $1
  // LIMIT 1. `username` é citext → comparação case-insensitive automática.
  // RLS `profiles_select_public USING (true)` permite leitura anônima.
  const { data: existing, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'Não foi possível verificar disponibilidade' };
  }

  return { ok: true, data: { available: !existing } };
}
