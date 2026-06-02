import { redirect } from 'next/navigation';

import { PublicUrlCopy } from '@/components/dashboard/PublicUrlCopy';
import { AddLinkButton } from '@/components/links/AddLinkButton';
import { EmptyState } from '@/components/links/EmptyState';
import { LinkList } from '@/components/links/LinkList';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';

type Link = Tables<'links'>;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — dashboard/layout.tsx já faz esse guard.
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  // page 1:1 garantida pelo trigger da Story 2.2. Query direta a `pages` (não
  // embed `profiles.pages` — typegen o tipa como array mas o PostgREST retorna
  // objeto único p/ FK 1:1; divergência que quebraria o acesso).
  const { data: page } = await supabase
    .from('pages')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  const pageId = page?.id;

  let links: Link[] = [];
  if (pageId) {
    // RLS links_select_own já restringe ao owner; filtrar por page_id
    // resolvido do user é defense-in-depth.
    const { data } = await supabase
      .from('links')
      .select('*')
      .eq('page_id', pageId)
      .order('position', { ascending: true });
    links = data ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-h1">Meus links</h1>
        <PublicUrlCopy username={profile?.username ?? ''} siteUrl={env.NEXT_PUBLIC_SITE_URL} />
      </header>

      {links.length === 0 ? <EmptyState /> : <LinkList links={links} />}

      {links.length > 0 && <AddLinkButton />}
    </div>
  );
}
