/**
 * Component tests — <MetricsCards> (Story 4.4 AC1).
 *
 * Cobre:
 *   (a) Renderiza 4 cards na ordem PRD (Total Page Views, Total Clicks,
 *       Page Views (30d), Clicks (30d)).
 *   (b) Labels verbatim do PRD AC1 (DEV-10 ratificado @po).
 *   (c) Números formatados pt-BR (ponto como separador de milhares).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MetricsCards } from '@/components/analytics/MetricsCards';

describe('<MetricsCards>', () => {
  it('AC1 — renderiza 4 cards com labels verbatim PRD e valores em pt-BR', () => {
    render(
      <MetricsCards totalPageViews={1234} totalClicks={56} pageViews30d={789} clicks30d={12} />,
    );

    // Labels verbatim PRD AC1 (DEV-10).
    expect(screen.getByText('Total Page Views')).toBeInTheDocument();
    expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    expect(screen.getByText('Page Views (30d)')).toBeInTheDocument();
    expect(screen.getByText('Clicks (30d)')).toBeInTheDocument();

    // Valores formatados pt-BR (1.234 não 1,234).
    expect(screen.getByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('789')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('AC1 — zeros renderizam sem erro', () => {
    render(<MetricsCards totalPageViews={0} totalClicks={0} pageViews30d={0} clicks30d={0} />);
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });

  it('AC1 — 4 cards via data-testid (ordem PRD)', () => {
    render(<MetricsCards totalPageViews={1} totalClicks={2} pageViews30d={3} clicks30d={4} />);
    expect(screen.getByTestId('metric-total-pv')).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-clicks')).toBeInTheDocument();
    expect(screen.getByTestId('metric-pv-30d')).toBeInTheDocument();
    expect(screen.getByTestId('metric-clicks-30d')).toBeInTheDocument();
  });
});
