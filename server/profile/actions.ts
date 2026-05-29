'use server';

import { revalidateUserSurface } from '@/lib/cache';
import type { ActionResult } from '@/lib/result';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';
import {
  CheckUsernameInput,
  UpdateProfileMetaInput,
  UpdateUsernameInput,
  UploadAvatarInput,
} from '@/lib/validators/profile';

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

// ---------------------------------------------------------------------------
// updateProfileMeta — Story 5.1 (FR13)
// ---------------------------------------------------------------------------
//
// Padrão idêntico ao updateUsername: parse Zod -> auth -> UPDATE sob RLS
// `profiles_update_own` (0002_profiles.sql:107-115). Sem mapeamento 23505
// (não há UNIQUE em display_name/bio). CHECK constraints (linhas 68-69)
// garantem length <= 50/280 server-side. Normalização '' -> null acontece
// inline (DEV-8) para preservar fallback `display_name ?? '@username'` em
// components/public/PublicPage.tsx:34.
export async function updateProfileMeta(input: unknown): Promise<ActionResult<Profile>> {
  const parsed = UpdateProfileMetaInput.safeParse(input);
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

  // Defense in depth — dashboard/layout.tsx + Server Component da page guardam.
  if (!user) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // DEV-2 + DEV-8: normalizar '' | undefined -> null para preservar fallback
  // `display_name ?? '@username'` em components/public/PublicPage.tsx:34.
  // (Moved from Zod transform — ver lib/validators/profile.ts DEV-8.)
  const emptyToNull = (v: string | undefined): string | null => (v && v.length > 0 ? v : null);

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      display_name: emptyToNull(parsed.data.display_name),
      bio: emptyToNull(parsed.data.bio),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error || !profile) {
    return { ok: false, error: 'Erro ao atualizar perfil. Tente novamente' };
  }

  // DEV-3: revalidar /@<username> (SSR) além de /dashboard layout, senão a
  // mudança só aparece na página pública no próximo deploy/ISR-revalidate.
  revalidateUserSurface(profile.username);

  return { ok: true, data: profile };
}

// ---------------------------------------------------------------------------
// uploadAvatar — Story 3.4 Task 2
// ---------------------------------------------------------------------------
//
// Signature verbatim arch §Server Actions L388-390 (FormData binário, retorna
// { avatar_url }). DEV-4 (story): path determinístico `{uid}/avatar.{ext}` +
// upsert:true para zero objetos órfãos. DEV-3: getPublicUrl (bucket public:true,
// DEV-5 ratificado por @data-engineer na Task 1).
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadAvatar(
  formData: FormData,
): Promise<ActionResult<{ avatar_url: string }>> {
  // Next 16 server-side recebe Blob/File (Web API) ao deserializar FormData.
  const fileField = formData.get('avatar');
  const parsed = UploadAvatarInput.safeParse({ file: fileField });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Arquivo inválido',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }
  const file = parsed.data.file;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — dashboard/layout.tsx já guarda.
  if (!user) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // DEV-4 — path determinístico `{user.id}/avatar.{ext}`. Trade-off: trocar
  // jpg→png deixa o `.jpg` antigo órfão (best-effort cleanup omitido no MVP;
  // 99% dos usuários trocam jpg→jpg).
  const ext = EXT_BY_MIME[file.type] ?? 'bin';
  const path = `${user.id}/avatar.${ext}`;

  const uploadResult = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadResult.error) {
    return { ok: false, error: 'Erro ao enviar avatar. Tente novamente' };
  }

  // DEV-3 — getPublicUrl é síncrono (zero round-trip), alinhado com bucket
  // public:true ratificado em DEV-5 (Task 1 da Dara).
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  // RLS `profiles_update_own` (0002_profiles.sql:107-115) restringe à row do
  // owner. CHECK `avatar_url ~* '^https?://'` (0002:70) cobre Storage public URL.
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
    .select('username, avatar_url')
    .single();

  if (error || !profile) {
    // Best-effort rollback: remove o objeto recém-enviado para não deixar
    // dangling reference (RLS `avatars_delete_own` autoriza — owner-only).
    await supabase.storage.from('avatars').remove([path]);
    return { ok: false, error: 'Erro ao atualizar avatar. Tente novamente' };
  }

  revalidateUserSurface(profile.username);

  return { ok: true, data: { avatar_url: profile.avatar_url ?? publicUrl } };
}
