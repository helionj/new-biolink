'use server';

import { revalidateUserSurface } from '@/lib/cache';
import type { ActionResult } from '@/lib/result';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';
import {
  CreateLinkInput,
  DeleteLinkInput,
  ToggleLinkVisibilityInput,
  UpdateLinkInput,
} from '@/lib/validators/link';

type Link = Tables<'links'>;

// Espelha server/profile/actions.ts:12-22 — mesmo padrão de achatamento de
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

// AC7 — mapeamento de erro Postgres por classe → mensagem PT-BR tratada.
// Espelha server/profile/actions.ts:55-69. NUNCA vazar error.message cru.
function mapLinkError(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  // Row ausente sob RLS (não-owner) — .single()/.maybeSingle() ⇒ PGRST116.
  if (code === 'PGRST116' || /results contain 0 rows|no rows returned/i.test(message)) {
    return 'Link não encontrado';
  }
  // RLS violation (ex.: INSERT WITH CHECK em page de outro usuário).
  if (code === '42501' || /row-level security|violates row-level/i.test(message)) {
    return 'Operação não permitida';
  }
  // CHECK constraint (title/url/icon) — defesa; o Zod já barra no boundary.
  if (code === '23514' || /violates check constraint/i.test(message)) {
    return 'Dados do link inválidos';
  }
  // UNIQUE (page_id, position) — não esperado no CRUD de 2.5, defensivo.
  if (code === '23505' || /duplicate key|unique constraint/i.test(message)) {
    return 'Conflito de ordenação';
  }
  return 'Erro ao salvar o link. Tente novamente';
}

const SESSION_EXPIRED = 'Sessão expirada. Faça login novamente.';

export async function createLink(input: unknown): Promise<ActionResult<Link>> {
  const parsed = CreateLinkInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida', fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — a Server Component da page também faz esse check.
  if (!user) {
    return { ok: false, error: SESSION_EXPIRED };
  }

  // Resolve username + page (1:1 garantida pelo trigger da Story 2.2). NÃO
  // usar embed `profiles.pages!inner(id)`: os tipos gerados o tipam como array
  // mas o PostgREST retorna objeto único (FK 1:1) — divergência typegen↔runtime
  // do supabase-js que quebra o acesso. Duas queries simples (PK/FK indexados)
  // são type-safe e robustas.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  const pageId = page?.id;
  if (profileError || pageError || !profile || !pageId) {
    return { ok: false, error: 'Erro ao salvar o link. Tente novamente' };
  }

  // Próxima position: max + 1 (gaps OK — Q1 RESOLVED, sem reindex).
  const { data: maxRow } = await supabase
    .from('links')
    .select('position')
    .eq('page_id', pageId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = (maxRow?.position ?? -1) + 1;

  const { data: link, error } = await supabase
    .from('links')
    .insert({ page_id: pageId, position: nextPos, ...parsed.data })
    .select()
    .single();

  if (error || !link) {
    return { ok: false, error: mapLinkError(error) };
  }

  revalidateUserSurface(profile.username);
  return { ok: true, data: link };
}

export async function updateLink(input: unknown): Promise<ActionResult<Link>> {
  const parsed = UpdateLinkInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida', fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: SESSION_EXPIRED };
  }

  const patch: { title?: string; url?: string } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.url !== undefined) patch.url = parsed.data.url;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'Nada para atualizar' };
  }

  // RLS links_update_own garante ownership via JOIN pages.profile_id =
  // auth.uid(); row não-owner ⇒ 0 rows ⇒ .single() ⇒ PGRST116 ⇒ "não encontrado".
  const { data: link, error } = await supabase
    .from('links')
    .update(patch)
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error || !link) {
    return { ok: false, error: mapLinkError(error) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  revalidateUserSurface(profile?.username ?? null);
  return { ok: true, data: link };
}

export async function deleteLink(input: unknown): Promise<ActionResult<void>> {
  const parsed = DeleteLinkInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida', fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: SESSION_EXPIRED };
  }

  // RLS links_delete_own: link de outro usuário não é visível ⇒ 0 rows
  // deletadas. .select() expõe as rows afetadas p/ detectar não-owner/inexistente.
  // Gap em `position` é o comportamento sancionado (Q1 RESOLVED — sem reindex).
  const { data: deleted, error } = await supabase
    .from('links')
    .delete()
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    return { ok: false, error: mapLinkError(error) };
  }
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: 'Link não encontrado' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  revalidateUserSurface(profile?.username ?? null);
  return { ok: true, data: undefined };
}

export async function toggleLinkVisibility(input: unknown): Promise<ActionResult<Link>> {
  const parsed = ToggleLinkVisibilityInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Entrada inválida', fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: SESSION_EXPIRED };
  }

  // RLS links_update_own: não-owner ⇒ 0 rows ⇒ PGRST116 ⇒ "não encontrado".
  const { data: link, error } = await supabase
    .from('links')
    .update({ is_visible: parsed.data.is_visible })
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error || !link) {
    return { ok: false, error: mapLinkError(error) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  revalidateUserSurface(profile?.username ?? null);
  return { ok: true, data: link };
}
