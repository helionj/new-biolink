/**
 * Component tests — <AnalyticsLoadingSkeleton> (Story 4.4 AC5).
 *
 * Cobre:
 *   (a) Container com aria-busy="true" + aria-live="polite".
 *   (b) Texto sr-only "Carregando analytics…" presente.
 *   (c) >= 6 skeleton bars (1 title + 4 cards + 1 chart + 1 table).
 *   (d) Cada bar tem aria-hidden="true".
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnalyticsLoadingSkeleton } from '@/components/analytics/AnalyticsLoadingSkeleton';

describe('<AnalyticsLoadingSkeleton>', () => {
  it('AC5 — container com aria-busy + aria-live + sr-only text', () => {
    render(<AnalyticsLoadingSkeleton />);
    const container = screen.getByTestId('analytics-loading');
    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Carregando analytics…')).toBeInTheDocument();
  });

  it('AC5 — renderiza ≥ 7 skeleton bars todos com aria-hidden', () => {
    const { container } = render(<AnalyticsLoadingSkeleton />);
    const bars = container.querySelectorAll('div[aria-hidden="true"]');
    // 1 title + 4 cards + 1 chart + 1 table = 7
    expect(bars.length).toBeGreaterThanOrEqual(7);
  });
});
