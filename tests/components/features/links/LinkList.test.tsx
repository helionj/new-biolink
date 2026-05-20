import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockedRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockedRefresh }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/links/actions', () => ({
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  toggleLinkVisibility: vi.fn(),
  reorderLinks: vi.fn(),
}));

import { EmptyState } from '@/components/links/EmptyState';
import { LinkList } from '@/components/links/LinkList';
import { toast } from '@/lib/toast';
import * as linkActions from '@/server/links/actions';

const mockedReorder = vi.mocked(linkActions.reorderLinks);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

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

// =============================================================================
// Story 2.6 — DnD reorder
// =============================================================================
// Estratégia: testar o caminho `persistOrder` via botões ↑/↓ (mesmo helper
// que `onDragEnd` chama — DRY). Cobre AC2 (otimista + rollback), AC4
// (teclado via botões) e AC1 (boundaries). Mocking direto do dnd-kit
// `onDragEnd` é frágil; os ↑/↓ exercitam o mesmo código.
// -----------------------------------------------------------------------------

afterEach(() => {
  mockedReorder.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<LinkList> — Story 2.6 reorder', () => {
  const ID_A = '11111111-1111-4111-8111-111111111111';
  const ID_B = '22222222-2222-4222-8222-222222222222';
  const ID_C = '33333333-3333-4333-8333-333333333333';

  function threeLinks() {
    return [makeLink(ID_A, 'Alpha', 0), makeLink(ID_B, 'Beta', 1), makeLink(ID_C, 'Gamma', 2)];
  }

  it('botão ↑ no 2º link chama reorderLinks com orderedIds [B,A,C] (AC2/AC4)', async () => {
    const user = userEvent.setup();
    mockedReorder.mockResolvedValue({ ok: true, data: undefined });
    render(<LinkList links={threeLinks()} />);

    const upButtons = screen.getAllByRole('button', { name: 'Mover para cima' });
    // Item 0 (Alpha) → ↑ disabled; Item 1 (Beta) → habilitado.
    expect(upButtons[0]).toBeDisabled();
    await user.click(upButtons[1]!);

    await waitFor(() => {
      expect(mockedReorder).toHaveBeenCalledWith({ orderedIds: [ID_B, ID_A, ID_C] });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Ordem atualizada');
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it('botão ↓ no 2º link chama reorderLinks com orderedIds [A,C,B] (AC2/AC4)', async () => {
    const user = userEvent.setup();
    mockedReorder.mockResolvedValue({ ok: true, data: undefined });
    render(<LinkList links={threeLinks()} />);

    const downButtons = screen.getAllByRole('button', { name: 'Mover para baixo' });
    // Item 2 (Gamma) → ↓ disabled (último).
    expect(downButtons[2]).toBeDisabled();
    await user.click(downButtons[1]!);

    await waitFor(() => {
      expect(mockedReorder).toHaveBeenCalledWith({ orderedIds: [ID_A, ID_C, ID_B] });
    });
  });

  it('falha do reorderLinks reverte a ordem (rollback) e exibe toast.error (AC2)', async () => {
    const user = userEvent.setup();
    mockedReorder.mockResolvedValue({ ok: false, error: 'Operação não permitida' });
    render(<LinkList links={threeLinks()} />);

    const downButtons = screen.getAllByRole('button', { name: 'Mover para baixo' });
    await user.click(downButtons[0]!); // tenta mover Alpha para baixo

    await waitFor(() => {
      expect(mockedReorder).toHaveBeenCalled();
    });
    expect(mockedToastError).toHaveBeenCalledWith('Operação não permitida');
    expect(mockedToastSuccess).not.toHaveBeenCalled();
    expect(mockedRefresh).not.toHaveBeenCalled();

    // Ordem visual permanece a original (rollback aplicado). Verifica que os
    // botões ↑ ainda estão desabilitados na posição 0 (Alpha continua no topo).
    const upButtons = screen.getAllByRole('button', { name: 'Mover para cima' });
    expect(upButtons[0]).toBeDisabled();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Alpha');
    expect(items[1]).toHaveTextContent('Beta');
    expect(items[2]).toHaveTextContent('Gamma');
  });

  it('↑ no 1º link e ↓ no último ficam disabled (AC1 boundaries)', () => {
    render(<LinkList links={threeLinks()} />);
    const upButtons = screen.getAllByRole('button', { name: 'Mover para cima' });
    const downButtons = screen.getAllByRole('button', { name: 'Mover para baixo' });

    expect(upButtons[0]).toBeDisabled();
    expect(upButtons[1]).not.toBeDisabled();
    expect(upButtons[2]).not.toBeDisabled();

    expect(downButtons[0]).not.toBeDisabled();
    expect(downButtons[1]).not.toBeDisabled();
    expect(downButtons[2]).toBeDisabled();
  });

  it('lista com 1 link: ↑ e ↓ ambos disabled (AC1 single-item)', () => {
    render(<LinkList links={[makeLink(ID_A, 'Alone', 0)]} />);
    expect(screen.getByRole('button', { name: 'Mover para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover para baixo' })).toBeDisabled();
  });

  it('cada row tem handle de drag com aria-label="Reordenar link" (AC1)', () => {
    render(<LinkList links={threeLinks()} />);
    expect(screen.getAllByRole('button', { name: 'Reordenar link' })).toHaveLength(3);
  });
});
