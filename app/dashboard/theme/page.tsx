import { redirect } from 'next/navigation';

import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_THEME } from '@/lib/theme';

export default async function ThemePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — dashboard/layout.tsx já faz esse guard.
  if (!user) {
    redirect('/login');
  }

  // Profile + page em paralelo (1:1 via trigger 2.2). Embed 1:1 do PostgREST
  // tipado como array no supabase-js quebra acesso — duas queries simples são
  // type-safe e robustas (mesmo motivo verbatim de server/links/actions.ts:75-92).
  const [{ data: profile }, { data: page }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, display_name, bio, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase.from('pages').select('id, theme').eq('profile_id', user.id).single(),
  ]);

  // Top-3 links visíveis (preview thumbnail é compacto). Índice parcial
  // `idx_links_page_id_position_visible` (0004_links.sql) cobre.
  let previewLinks: Array<{ id: string; title: string }> = [];
  if (page?.id) {
    const { data } = await supabase
      .from('links')
      .select('id, title')
      .eq('page_id', page.id)
      .eq('is_visible', true)
      .order('position', { ascending: true })
      .limit(3);
    previewLinks = data ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Tema da página</h1>
        <p className="text-sm text-muted-foreground">
          Escolha como sua página pública em <code>/@{profile?.username ?? ''}</code> aparece.
        </p>
      </header>
      <ThemeSelector
        currentTheme={page?.theme ?? DEFAULT_THEME}
        previewData={{
          profile: {
            username: profile?.username ?? '',
            display_name: profile?.display_name ?? null,
            bio: profile?.bio ?? null,
            avatar_url: profile?.avatar_url ?? null,
          },
          links: previewLinks,
        }}
      />
    </div>
  );
}
