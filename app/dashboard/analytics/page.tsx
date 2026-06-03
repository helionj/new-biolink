import { redirect } from 'next/navigation';

import { EmptyAnalyticsState } from '@/components/analytics/EmptyAnalyticsState';
import { LinksTable } from '@/components/analytics/LinksTable';
import { MetricsCards } from '@/components/analytics/MetricsCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

type AnalyticsRange = '7d' | '30d';

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { range: rangeParam } = await searchParams;
  const range: AnalyticsRange = rangeParam === '30d' ? '30d' : '7d';

  // Fase 1: page + username em paralelo (username serve para a CTA do empty state).
  const [pageRes, profileRes] = await Promise.all([
    supabase.from('pages').select('id').eq('profile_id', user.id).single(),
    supabase.from('profiles').select('username').eq('id', user.id).single(),
  ]);
  const pageId = pageRes.data?.id;
  const username = profileRes.data?.username ?? '';

  if (!pageId) {
    // Defense-in-depth: o trigger 1:1 da Story 2.2 garante a página por user.
    return <EmptyAnalyticsState siteUrl={env.NEXT_PUBLIC_SITE_URL} username={username} />;
  }

  // Fase 2: links do owner + total page views (lifetime) em paralelo.
  const [linksRes, totalPVRes] = await Promise.all([
    supabase
      .from('links')
      .select('id, title, url')
      .eq('page_id', pageId)
      .order('position', { ascending: true }),
    supabase.from('page_views').select('id', { count: 'exact', head: true }).eq('page_id', pageId),
  ]);
  const links = linksRes.data ?? [];
  const linkIds = links.map((l) => l.id);
  const totalPageViews = totalPVRes.count ?? 0;

  // Fase 3: agregações 30d + série + per-link. Só faz sentido se houver links.
  let totalClicks = 0;
  let pageViews30dRows: { count: number | null }[] = [];
  let linkClicks7dRows: { link_id: string | null; count: number | null }[] = [];
  let linkClicks30dRows: { link_id: string | null; count: number | null }[] = [];
  let clickEventsRows: { link_id: string | null }[] = [];
  let seriesRows: { day: string; count: number }[] = [];

  if (linkIds.length > 0) {
    const [totalClicksRes, pv30dRes, seriesRes, linkClicks7dRes, linkClicks30dRes, clickEventsRes] =
      await Promise.all([
        supabase
          .from('click_events')
          .select('id', { count: 'exact', head: true })
          .in('link_id', linkIds),
        supabase.from('page_views_30d').select('count').eq('page_id', pageId),
        supabase.rpc('get_page_views_series', {
          p_page_id: pageId,
          p_days: range === '30d' ? 30 : 7,
        }),
        supabase.from('link_clicks_7d').select('link_id, count').in('link_id', linkIds),
        supabase.from('link_clicks_30d').select('link_id, count').in('link_id', linkIds),
        supabase.from('click_events').select('link_id').in('link_id', linkIds),
      ]);
    totalClicks = totalClicksRes.count ?? 0;
    pageViews30dRows = pv30dRes.data ?? [];
    seriesRows = seriesRes.data ?? [];
    linkClicks7dRows = linkClicks7dRes.data ?? [];
    linkClicks30dRows = linkClicks30dRes.data ?? [];
    clickEventsRows = clickEventsRes.data ?? [];
  } else {
    const [pv30dRes, seriesRes] = await Promise.all([
      supabase.from('page_views_30d').select('count').eq('page_id', pageId),
      supabase.rpc('get_page_views_series', {
        p_page_id: pageId,
        p_days: range === '30d' ? 30 : 7,
      }),
    ]);
    pageViews30dRows = pv30dRes.data ?? [];
    seriesRows = seriesRes.data ?? [];
  }

  const pageViews30d = pageViews30dRows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const clicks30d = linkClicks30dRows.reduce((sum, r) => sum + (r.count ?? 0), 0);

  // Empty state: sem links OU zero eventos lifetime.
  const isEmpty = links.length === 0 || totalPageViews + totalClicks === 0;
  if (isEmpty) {
    return <EmptyAnalyticsState siteUrl={env.NEXT_PUBLIC_SITE_URL} username={username} />;
  }

  // Build per-link aggregations.
  const clicks7dByLink = new Map<string, number>();
  for (const row of linkClicks7dRows) {
    if (row.link_id) {
      clicks7dByLink.set(row.link_id, (clicks7dByLink.get(row.link_id) ?? 0) + (row.count ?? 0));
    }
  }
  const clicks30dByLink = new Map<string, number>();
  for (const row of linkClicks30dRows) {
    if (row.link_id) {
      clicks30dByLink.set(row.link_id, (clicks30dByLink.get(row.link_id) ?? 0) + (row.count ?? 0));
    }
  }
  const clicksTotalByLink = new Map<string, number>();
  for (const row of clickEventsRows) {
    if (row.link_id) {
      clicksTotalByLink.set(row.link_id, (clicksTotalByLink.get(row.link_id) ?? 0) + 1);
    }
  }

  const tableRows = links
    .map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      clicks7d: clicks7dByLink.get(l.id) ?? 0,
      clicks30d: clicks30dByLink.get(l.id) ?? 0,
      clicksTotal: clicksTotalByLink.get(l.id) ?? 0,
    }))
    .sort((a, b) => b.clicksTotal - a.clicksTotal);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-h1">Analytics</h1>
        <p className="text-body text-muted-foreground">Como sua página tá indo.</p>
      </header>

      <section aria-label="Métricas principais" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricsCards
          totalPageViews={totalPageViews}
          totalClicks={totalClicks}
          pageViews30d={pageViews30d}
          clicks30d={clicks30d}
        />
      </section>

      <section aria-label="Série temporal de page views">
        <TimeSeriesChart series={seriesRows} range={range} />
      </section>

      <section aria-label="Cliques por link">
        <LinksTable rows={tableRows} />
      </section>
    </div>
  );
}
