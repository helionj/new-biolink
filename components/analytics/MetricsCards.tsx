import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  totalPageViews: number;
  totalClicks: number;
  pageViews30d: number;
  clicks30d: number;
};

// Labels verbatim do PRD AC1 — mix PT/EN intencional. Termos "Page Views" e
// "Clicks" são naturalizados no contexto analytics em PT-BR (DEV-10 ratificado @po).
const CARDS = [
  { label: 'Total Page Views', key: 'totalPageViews' as const, testId: 'metric-total-pv' },
  { label: 'Total Clicks', key: 'totalClicks' as const, testId: 'metric-total-clicks' },
  { label: 'Page Views (30d)', key: 'pageViews30d' as const, testId: 'metric-pv-30d' },
  { label: 'Clicks (30d)', key: 'clicks30d' as const, testId: 'metric-clicks-30d' },
];

export function MetricsCards(props: Props) {
  return (
    <>
      {CARDS.map((card) => (
        <Card key={card.key} data-testid={card.testId}>
          <CardHeader className="pb-2">
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {props[card.key].toLocaleString('pt-BR')}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </>
  );
}
