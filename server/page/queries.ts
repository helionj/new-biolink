import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type ThemePreset = Database['public']['Enums']['theme_preset'];
type LinkRow = Database['public']['Tables']['links']['Row'];

export type PublicPageData = {
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  page: {
    id: string;
    theme: ThemePreset;
  };
  links: Array<Pick<LinkRow, 'id' | 'title' | 'url' | 'icon' | 'position'>>;
};

/**
 * Fetch SSR de uma página pública (`/@username`).
 *
 * Estratégia AP-1 (schema-design.md L232-245) em 2 round-trips:
 *   (a) pages + profiles via embed `profiles!inner(...)` — filtra por
 *       `profiles.username` (citext) e `is_published=true`.
 *   (b) links visíveis ordenados por `position ASC` — usa o índice parcial
 *       `idx_links_page_id_position_visible` (0004_links.sql L88).
 *
 * RLS cobre o visitante anon (substitui filtragem em SQL):
 *   - profiles_select_public (0002:101): USING true
 *   - pages_select_public    (0003:93):  USING is_published=true
 *   - links_select_public    (0004:124): JOIN is_visible=true AND
 *                                            pages.is_published=true
 *
 * `cache()` do React deduplica esta chamada entre `generateMetadata` e o
 * render do componente dentro do mesmo request RSC.
 *
 * @returns null se username inexistente, `is_published=false`, ou erro de
 *   rede/RLS. `links: []` é página válida (perfil sem links visíveis).
 */
export const getPublicPage = cache(
  async (usernameLower: string): Promise<PublicPageData | null> => {
    const supabase = await createClient();

    const { data: pageRow, error: pageErr } = await supabase
      .from('pages')
      .select('id, theme, profiles!inner(username, display_name, bio, avatar_url)')
      .eq('profiles.username', usernameLower)
      .eq('is_published', true)
      .maybeSingle();

    if (pageErr) {
      console.error('[getPublicPage] page fetch error:', pageErr.message);
      return null;
    }
    if (!pageRow) return null;

    const { data: links, error: linksErr } = await supabase
      .from('links')
      .select('id, title, url, icon, position')
      .eq('page_id', pageRow.id)
      .eq('is_visible', true)
      .order('position', { ascending: true });

    if (linksErr) {
      console.error('[getPublicPage] links fetch error:', linksErr.message);
      return null;
    }

    // O embed `profiles!inner(...)` retorna profile como objeto único:
    // a FK `pages_profile_id_fkey` é `isOneToOne: true` (types.ts L84).
    const profile = pageRow.profiles as unknown as PublicPageData['profile'];

    return {
      profile,
      page: { id: pageRow.id, theme: pageRow.theme },
      links: links ?? [],
    };
  },
);
