/**
 * Component tests — <LinksTable> (Story 4.4 AC3, AC6).
 *
 * Cobre:
 *   (a) Tabela semântica <table> com 5 headers scope="col".
 *   (b) Rows na ordem fornecida (page.tsx já ordena desc por clicksTotal).
 *   (c) URLs com target="_blank" rel="noopener noreferrer".
 *   (d) Números formatados pt-BR + tabular-nums.
 *   (e) rows.length === 0 → null (page.tsx renderiza EmptyAnalyticsState em vez disso).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LinksTable } from '@/components/analytics/LinksTable';

const ROWS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Meu portfólio',
    url: 'https://portfolio.com',
    clicks7d: 50,
    clicks30d: 200,
    clicksTotal: 1234,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Twitter',
    url: 'https://twitter.com/me',
    clicks7d: 10,
    clicks30d: 30,
    clicksTotal: 45,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Sem cliques',
    url: 'https://inativo.com',
    clicks7d: 0,
    clicks30d: 0,
    clicksTotal: 0,
  },
];

describe('<LinksTable>', () => {
  it('AC3 + AC6 — renderiza <table> semântica com 5 headers scope="col"', () => {
    render(<LinksTable rows={ROWS} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    headers.forEach((h) => expect(h.getAttribute('scope')).toBe('col'));

    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Cliques 7d')).toBeInTheDocument();
    expect(screen.getByText('Cliques 30d')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('AC3 — renderiza rows na ordem fornecida (asserção de ordem)', () => {
    render(<LinksTable rows={ROWS} />);
    const cells = screen.getAllByRole('cell');
    // Primeira coluna (Título) das 3 rows.
    // 5 cells por row × 3 rows = 15 cells; títulos em cells[0], cells[5], cells[10].
    expect(cells[0]).toHaveTextContent('Meu portfólio');
    expect(cells[5]).toHaveTextContent('Twitter');
    expect(cells[10]).toHaveTextContent('Sem cliques');
  });

  it('AC3 — URLs com target="_blank" rel="noopener noreferrer"', () => {
    render(<LinksTable rows={ROWS} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
    links.forEach((l) => {
      expect(l.getAttribute('target')).toBe('_blank');
      expect(l.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  it('AC3 — números formatados pt-BR (1.234 não 1,234)', () => {
    render(<LinksTable rows={ROWS} />);
    expect(screen.getByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    // Linha com zeros: garantir que renderiza sem quebrar.
    expect(screen.getByText('Sem cliques')).toBeInTheDocument();
  });

  it('rows.length === 0 → renderiza null (sem <table>)', () => {
    const { container } = render(<LinksTable rows={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
