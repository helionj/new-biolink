import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/links/actions', () => ({
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  toggleLinkVisibility: vi.fn(),
}));

import { EmptyState } from '@/components/links/EmptyState';
import { LinkList } from '@/components/links/LinkList';

function makeLink(id: string, title: string, position: number) {
  return {
    id,
    page_id: '22222222-2222-4222-8222-222222222222',
    title,
    url: 'https://exemplo.com',
    icon: null,
    is_visible: true,
    position,
    created_at: '2026-05-19T00:00:00Z',
    updated_at: '2026-05-19T00:00:00Z',
  };
}

describe('<LinkList>', () => {
  it('renderiza N rows na ordem recebida (AC1)', () => {
    const links = [
      makeLink('11111111-1111-4111-8111-111111111111', 'Alpha', 0),
      makeLink('22222222-2222-4222-8222-222222222222', 'Beta', 1),
      makeLink('33333333-3333-4333-8333-333333333333', 'Gamma', 2),
    ];
    render(<LinkList links={links} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Alpha');
    expect(items[1]).toHaveTextContent('Beta');
    expect(items[2]).toHaveTextContent('Gamma');
  });
});

describe('<EmptyState>', () => {
  it('mostra ilustração + CTA "Adicione seu primeiro link" (AC8)', () => {
    render(<EmptyState />);

    expect(screen.getByText('Nenhum link ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicione seu primeiro link' })).toBeInTheDocument();
  });
});
