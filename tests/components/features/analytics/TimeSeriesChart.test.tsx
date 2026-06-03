/**
 * Component tests — <TimeSeriesChart> (Story 4.4 AC2, AC6).
 *
 * Cobre:
 *   (a) <figure> + <figcaption> estrutura semântica (AC6).
 *   (b) Gap-fill funciona — series sparse com 2 dias vira tabela com N (7 ou 30) rows.
 *   (c) Tabela fallback sr-only com <caption> + 2 <th scope="col"> + N rows (AC6).
 *   (d) Toggle 7d/30d com <Link> aponta para ?range=7d / ?range=30d com aria-current na active.
 *
 * NÃO testa visual do chart (recharts requer canvas/SVG — pulado).
 */

import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// next/link → âncora <a> simples para testes.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// recharts → mock leve para evitar canvas/SVG no jsdom.
// AreaChart + Area adicionados em Story 5.7 (switch LineChart → AreaChart + peach gradient under per spec §2.8 L775-777).
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    AreaChart: Passthrough,
    Area: () => null,
    LineChart: Passthrough,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: Passthrough,
  };
});

import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';

const TWO_POINT_SERIES = [
  { day: '2026-05-20', count: 5 },
  { day: '2026-05-26', count: 3 },
];

describe('<TimeSeriesChart>', () => {
  it('AC6 — renderiza <figure> + <figcaption>', () => {
    const { container } = render(<TimeSeriesChart series={TWO_POINT_SERIES} range="7d" />);
    expect(container.querySelector('figure')).not.toBeNull();
    expect(container.querySelector('figcaption')).not.toBeNull();
  });

  it('AC2 + AC6 — tabela fallback sr-only com gap-fill para 7 dias (caption + 2 headers + 7 rows)', () => {
    render(<TimeSeriesChart series={TWO_POINT_SERIES} range="7d" />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(table.className).toContain('sr-only');

    // 2 column headers semânticos.
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers[0]!.getAttribute('scope')).toBe('col');
    expect(headers[0]).toHaveTextContent('Dia');
    expect(headers[1]).toHaveTextContent('Page Views');

    // 7 data rows (gap-fill).
    const bodyRows = within(table).getAllByRole('row');
    // 1 header row + 7 data rows = 8 total.
    expect(bodyRows).toHaveLength(8);
  });

  it('AC2 — range=30d → tabela fallback com 30 rows', () => {
    render(<TimeSeriesChart series={TWO_POINT_SERIES} range="30d" />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(31); // 1 header + 30 data
  });

  it('AC2 — toggle links 7d/30d com aria-current na opção ativa', () => {
    render(<TimeSeriesChart series={TWO_POINT_SERIES} range="7d" />);

    const link7d = screen.getByRole('link', { name: '7d' });
    const link30d = screen.getByRole('link', { name: '30d' });

    expect(link7d.getAttribute('href')).toBe('?range=7d');
    expect(link30d.getAttribute('href')).toBe('?range=30d');
    expect(link7d.getAttribute('aria-current')).toBe('page');
    expect(link30d.getAttribute('aria-current')).toBeNull();
  });

  it('AC2 — range=30d → aria-current na 30d', () => {
    render(<TimeSeriesChart series={TWO_POINT_SERIES} range="30d" />);
    const link30d = screen.getByRole('link', { name: '30d' });
    expect(link30d.getAttribute('aria-current')).toBe('page');
  });
});
