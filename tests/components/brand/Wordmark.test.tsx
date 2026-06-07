/**
 * Component tests — <Wordmark> (Story 5.9 AC1 + AC7 + Phase 2 Logomark adoption).
 *
 * Cobre:
 *   (a) "biolink" lowercase wordmark text (Q5 §6 L1407-1417 ratified)
 *   (b) Spiral symbol rendered por default + omitido com showSymbol={false}
 *       (Phase 2 logomark — substitui ★ asterisco shipped Story 5.9 PR #41)
 *   (c) href passthrough wraps em <Link> com aria-label "biolink"
 *   (d) sem href renderiza span standalone (composição livre em footers/headings)
 *   (e) size variant md (default) aplica text-2xl ≡ 24px §1.6 L351
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// next/link → âncora <a> simples para testes (pattern Story 4.4 TimeSeriesChart).
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

import { Wordmark } from '@/components/brand/Wordmark';

describe('<Wordmark>', () => {
  it('renderiza "biolink" lowercase per Q5 §6 ratified', () => {
    render(<Wordmark />);
    expect(screen.getByText('biolink')).toBeInTheDocument();
  });

  it('renderiza spiral symbol por default (Phase 2 logomark)', () => {
    render(<Wordmark />);
    expect(screen.getByTestId('wordmark-symbol')).toBeInTheDocument();
  });

  it('omite spiral symbol quando showSymbol=false', () => {
    render(<Wordmark showSymbol={false} />);
    expect(screen.queryByTestId('wordmark-symbol')).toBeNull();
    // "biolink" continua presente
    expect(screen.getByText('biolink')).toBeInTheDocument();
  });

  it('renderiza como <a> quando href provided + aria-label "biolink"', () => {
    render(<Wordmark href="/" />);
    const link = screen.getByRole('link', { name: 'biolink' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('omite <a> quando href ausente — renderiza span standalone', () => {
    const { container } = render(<Wordmark />);
    expect(container.querySelector('a')).toBeNull();
  });

  it('aplica size variant md por default (text-2xl ≡ 24px §1.6 L351)', () => {
    const { container } = render(<Wordmark />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-2xl');
  });
});
