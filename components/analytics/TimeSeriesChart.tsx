'use client';

import Link from 'next/link';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';

type Point = { day: string; count: number };

type Props = {
  series: Point[]; // sparse, ASC por dia (saída de get_page_views_series)
  range: '7d' | '30d';
};

/**
 * Gap-fill no cliente: a RPC retorna apenas dias com count>0. Para o gráfico
 * cobrir todos os N dias do range (eixo X completo), preenchemos os dias
 * ausentes com count=0. Usa timezone do cliente — intencional para mostrar
 * "hoje" do usuário (não UTC).
 */
function gapFill(series: Point[], days: 7 | 30): Point[] {
  const map = new Map<string, number>();
  for (const p of series) map.set(p.day, p.count);

  const today = new Date();
  const result: Point[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const isoDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({ day: isoDay, count: map.get(isoDay) ?? 0 });
  }
  return result;
}

function ToggleLink({
  value,
  current,
  children,
}: {
  value: '7d' | '30d';
  current: '7d' | '30d';
  children: React.ReactNode;
}) {
  const isActive = value === current;
  return (
    <Link
      href={`?range=${value}`}
      replace
      scroll={false}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'rounded-md border border-border px-3 py-1 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-background text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </Link>
  );
}

export function TimeSeriesChart({ series, range }: Props) {
  const days = range === '30d' ? 30 : 7;
  const dense = gapFill(series, days);

  return (
    <figure className="space-y-3 rounded-lg border border-border p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Page views — últimos {days} dias</h2>
        <nav aria-label="Selecionar janela do gráfico" className="flex gap-2">
          <ToggleLink value="7d" current={range}>
            7d
          </ToggleLink>
          <ToggleLink value="30d" current={range}>
            30d
          </ToggleLink>
        </nav>
      </figcaption>

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dense} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => d.slice(5)}
              tick={{ fontSize: 12 }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
            <Tooltip
              formatter={(value) => [
                typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value ?? ''),
                'Page views',
              ]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Dados do gráfico — page views diárias dos últimos {days} dias</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Page Views</th>
          </tr>
        </thead>
        <tbody>
          {dense.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
