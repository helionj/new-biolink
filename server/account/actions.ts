'use server';

/**
 * Account Module Server Actions — Story 4.5 (Task 3).
 *
 * 2 actions canônicas (arch §Server Actions L410-414):
 *   - exportAccountData() — owner-side dump (RLS-aware via createClient)
 *   - deleteAccount({confirmUsername}) — hard-delete em cascata via Admin API
 *
 * Referências verbatim:
 *   - architecture.md §Server Actions L410-414       (signatures)
 *   - architecture.md §Components #9 L560-569         (account module spec)
 *   - architecture.md §Workflow 4 L767-792            (deleteUser → signOut → client redirect)
 *   - architecture.md §Middleware/Guards L1571        (service-role apenas em delete)
 *   - prd.md §Story 4.5 L603-615                      (ACs verbatim)
 *   - supabase/migrations/0002_profiles.sql:53        (endorse cascade verbatim:
 *     "ON DELETE CASCADE garante limpeza via deleteAccount Server Action — Story 4.5")
 *   - lib/supabase/admin.ts                           (REUSE — createAdmin())
 *
 * DEV summary (detalhes em docs/stories/4.5.conta-exportar-excluir.story.md):
 *   - DEV-3: cascade chain DB-side (zero migration nova; 1 chamada admin.auth.admin.deleteUser
 *     cascateia 5 tabelas — auth.users → profiles → pages → links → click_events / page_views).
 *   - DEV-4: Storage cleanup explícito de avatars/{user.id}/ ANTES do deleteUser
 *     (storage.objects NÃO cascateia de auth.users; best-effort — DEV-15).
 *   - DEV-5: defense-in-depth no username match — server-side case-insensitive
 *     comparison contra profile.username carregado da session (cliente envia
 *     string raw; não confiar).
 *   - DEV-6: export usa createClient() (RLS); admin reservado para delete + Storage.
 *   - DEV-9: deleteUser → signOut → return { ok: true } (client controla redirect
 *     para que toast.success() rode antes do navigate; sonner persiste 4s).
 *   - DEV-12: _meta.warning verbatim (PRD AC2 "anonimizados ou não, com warning").
 *   - DEV-13: linkIds round-trip extra (PostgREST sem JOIN — query em 2 hops).
 *   - DEV-15: Storage cleanup best-effort (não bloqueia delete; orphan storage
 *     menos crítico que orphan DB).
 */

import type { ActionResult } from '@/lib/result';
import { createAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';
import { DeleteAccountInput } from '@/lib/validators/account';

// ---------------------------------------------------------------------------
// Tipo do payload do export (PRD AC2 — "JSON contendo: profile + page + links
// + click_events + page_views, com warning").
// ---------------------------------------------------------------------------
export type AccountExport = {
  _meta: {
    exported_at: string; // ISO 8601 UTC
    warning: string; // LGPD pseudonimização notice (DEV-12)
  };
  profile: Tables<'profiles'> | null;
  page: Tables<'pages'> | null;
  links: Tables<'links'>[];
  click_events: Tables<'click_events'>[];
  page_views: Tables<'page_views'>[];
};

// Texto verbatim do warning (DEV-12). Mantido como const para que o
// component test cheque o conteúdo determinístico.
const EXPORT_WARNING =
  'ip_hash e user_agent_hash são pseudonimização SHA-256 + salt (Story 4.1) — ' +
  'irreversíveis sem o salt server-side. Dados são exportados como armazenados ' +
  '(não há transformação adicional).';

// ---------------------------------------------------------------------------
// exportAccountData — RLS-aware (createClient, não admin). PRD AC2.
// ---------------------------------------------------------------------------
export async function exportAccountData(): Promise<ActionResult<AccountExport>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // 2 queries paralelas — profile (PK) + page (1:1 via UNIQUE profile_id).
  const [profileRes, pageRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('pages').select('*').eq('profile_id', user.id).maybeSingle(),
  ]);

  const pageId = pageRes.data?.id ?? null;

  // links + page_views dependem de pageId; quando ausente (não deveria —
  // trigger 1:1 de Story 2.2 garante page no signup), arrays ficam vazios.
  const [linksRes, pageViewsRes] = await Promise.all([
    pageId
      ? supabase.from('links').select('*').eq('page_id', pageId)
      : Promise.resolve({ data: [] as Tables<'links'>[], error: null }),
    pageId
      ? supabase.from('page_views').select('*').eq('page_id', pageId)
      : Promise.resolve({ data: [] as Tables<'page_views'>[], error: null }),
  ]);

  // DEV-13: round-trip extra para resolver linkIds antes de buscar click_events
  // (PostgREST não suporta JOIN arbitrário; pattern 4.4 DEV-8). Índices PK +
  // idx_click_events_link_id_clicked_at (Story 4.1) garantem custo trivial.
  const linkIds = (linksRes.data ?? []).map((l) => l.id);
  const clickEventsRes =
    linkIds.length > 0
      ? await supabase.from('click_events').select('*').in('link_id', linkIds)
      : { data: [] as Tables<'click_events'>[], error: null };

  return {
    ok: true,
    data: {
      _meta: {
        exported_at: new Date().toISOString(),
        warning: EXPORT_WARNING,
      },
      profile: profileRes.data,
      page: pageRes.data,
      links: linksRes.data ?? [],
      click_events: clickEventsRes.data ?? [],
      page_views: pageViewsRes.data ?? [],
    },
  };
}

// ---------------------------------------------------------------------------
// deleteAccount — Admin API + cascade DB-side + Storage cleanup. PRD AC3+AC4.
// ---------------------------------------------------------------------------
export async function deleteAccount(raw: unknown): Promise<ActionResult<void>> {
  const parsed = DeleteAccountInput.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.flatten().fieldErrors.confirmUsername?.[0];
    return { ok: false, error: firstError ?? 'Entrada inválida' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // DEV-5: defense-in-depth — carrega profile.username da session e compara
  // case-insensitive. profiles.username é citext (0002_profiles.sql:66) mas
  // o client envia string raw via fetch/RPC, então fazemos o check explícito.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  if (profileError || !profile?.username) {
    return {
      ok: false,
      error: 'Não foi possível verificar seu username. Tente novamente.',
    };
  }

  if (parsed.data.confirmUsername.trim().toLowerCase() !== profile.username.toLowerCase()) {
    return {
      ok: false,
      error: 'Username não confere. Digite exatamente seu @ para confirmar.',
    };
  }

  // Service-role: usado APENAS no path de delete (arch §Middleware/Guards L1571).
  // ESLint guard recommend: importar createAdmin somente em server/account/actions.ts.
  const admin = createAdmin();

  // DEV-4 + DEV-15: Storage cleanup ANTES do deleteUser. Storage.objects NÃO
  // tem FK para auth.users — sem este cleanup, avatars/{user.id}/* fica órfão.
  // Best-effort: falha aqui é loggada e prossegue (orphan storage < orphan DB).
  try {
    const { data: avatarFiles, error: listError } = await admin.storage
      .from('avatars')
      .list(user.id);
    if (listError) {
      console.warn(`[deleteAccount] storage list failed for ${user.id}: ${listError.message}`);
    } else if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${user.id}/${f.name}`);
      const { error: removeError } = await admin.storage.from('avatars').remove(paths);
      if (removeError) {
        console.warn(
          `[deleteAccount] storage remove failed for ${user.id}: ${removeError.message}`,
        );
      }
    }
  } catch (err) {
    console.warn(`[deleteAccount] storage cleanup threw for ${user.id}:`, err);
  }

  // DEV-3 + DEV-9: hard-delete via Admin API. Cascade chain (5 FKs ON DELETE
  // CASCADE; comentário endorse em 0002:53) limpa profiles → pages → links
  // → click_events → page_views atomicamente em uma única transação Postgres.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return { ok: false, error: 'Erro ao excluir conta. Tente novamente.' };
  }

  // signOut limpa cookies client (a sessão server-side já caiu com deleteUser).
  // DEV-9: NÃO chamamos redirect() aqui — client controla navigation para que
  // toast.success('Conta excluída') dispare antes do unmount + push('/').
  await supabase.auth.signOut();

  return { ok: true, data: undefined };
}
