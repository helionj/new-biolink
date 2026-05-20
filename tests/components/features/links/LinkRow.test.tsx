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
}));

import { LinkRow } from '@/components/links/LinkRow';
import { toast } from '@/lib/toast';
import * as linkActions from '@/server/links/actions';

const mockedUpdate = vi.mocked(linkActions.updateLink);
const mockedDelete = vi.mocked(linkActions.deleteLink);
const mockedToggle = vi.mocked(linkActions.toggleLinkVisibility);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

function makeLink(overrides: Partial<ReturnType<typeof baseLink>> = {}) {
  return { ...baseLink(), ...overrides };
}

function baseLink() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    page_id: '22222222-2222-4222-8222-222222222222',
    title: 'Meu link',
    url: 'https://exemplo.com',
    icon: null as string | null,
    is_visible: true,
    position: 0,
    created_at: '2026-05-19T00:00:00Z',
    updated_at: '2026-05-19T00:00:00Z',
  };
}

afterEach(() => {
  mockedUpdate.mockReset();
  mockedDelete.mockReset();
  mockedToggle.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<LinkRow>', () => {
  it('toggle de visibilidade chama toggleLinkVisibility com { id, is_visible } e faz toast (AC4/AC6)', async () => {
    const user = userEvent.setup();
    mockedToggle.mockResolvedValue({ ok: true, data: makeLink({ is_visible: false }) });
    render(<LinkRow link={makeLink()} />);

    await user.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockedToggle).toHaveBeenCalledWith({
        id: '11111111-1111-4111-8111-111111111111',
        is_visible: false,
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Link oculto');
  });

  it('em falha do toggle reverte o estado (rollback) e faz toast.error (AC4)', async () => {
    const user = userEvent.setup();
    mockedToggle.mockResolvedValue({ ok: false, error: 'Operação não permitida' });
    render(<LinkRow link={makeLink({ is_visible: true })} />);

    const sw = screen.getByRole('switch');
    expect(sw).toBeChecked();

    await user.click(sw);

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Operação não permitida');
    });
    // Rollback: volta a checked=true.
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('edição inline de título chama updateLink({ id, title }) (AC3)', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue({ ok: true, data: makeLink({ title: 'Novo' }) });
    render(<LinkRow link={makeLink()} />);

    await user.click(screen.getByRole('button', { name: 'Meu link' }));
    const input = screen.getByLabelText('Título do link');
    await user.clear(input);
    await user.type(input, 'Novo{Enter}');

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Novo',
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Link atualizado');
  });

  it('edição de URL via botão de edit chama updateLink({ id, url }) (AC3)', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue({ ok: true, data: makeLink({ url: 'https://novo.com' }) });
    render(<LinkRow link={makeLink()} />);

    await user.click(screen.getByRole('button', { name: 'Editar URL' }));
    const input = screen.getByLabelText('URL do link');
    await user.clear(input);
    await user.type(input, 'https://novo.com{Enter}');

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({
        id: '11111111-1111-4111-8111-111111111111',
        url: 'https://novo.com',
      });
    });
  });

  it('delete só chama deleteLink após confirmar no modal (AC5)', async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue({ ok: true, data: undefined });
    render(<LinkRow link={makeLink()} />);

    await user.click(screen.getByRole('button', { name: 'Excluir link' }));

    // Modal aberto, ação ainda NÃO chamada (1ª barreira).
    await screen.findByText('Excluir link?');
    expect(mockedDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith({
        id: '11111111-1111-4111-8111-111111111111',
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Link excluído');
  });

  it('cancelar no modal de delete não chama deleteLink (AC5)', async () => {
    const user = userEvent.setup();
    render(<LinkRow link={makeLink()} />);

    await user.click(screen.getByRole('button', { name: 'Excluir link' }));
    await screen.findByText('Excluir link?');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByText('Excluir link?')).not.toBeInTheDocument();
    });
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('erro no delete faz toast.error (AC5/AC6)', async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue({ ok: false, error: 'Link não encontrado' });
    render(<LinkRow link={makeLink()} />);

    await user.click(screen.getByRole('button', { name: 'Excluir link' }));
    await screen.findByText('Excluir link?');
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Link não encontrado');
    });
  });

  // ---------------------------------------------------------------------------
  // Story 2.6 — handle de drag + botões ↑/↓
  // ---------------------------------------------------------------------------

  it('expõe handle de drag com aria-label="Reordenar link" (AC1)', () => {
    render(<LinkRow link={makeLink()} />);
    expect(screen.getByRole('button', { name: 'Reordenar link' })).toBeInTheDocument();
  });

  it('isolated render sem onMove: botões ↑/↓ ficam disabled (no-op default, sem crash)', () => {
    render(<LinkRow link={makeLink()} />);
    expect(screen.getByRole('button', { name: 'Mover para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover para baixo' })).toBeDisabled();
  });

  it('com onMove provido e isFirst=false → ↑ chama onMove(id,"up") (AC4)', async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<LinkRow link={makeLink()} onMove={onMove} isFirst={false} isLast={false} />);

    await user.click(screen.getByRole('button', { name: 'Mover para cima' }));
    expect(onMove).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', 'up');
  });

  it('com onMove provido e isLast=true → ↓ fica disabled (AC1 boundary)', () => {
    const onMove = vi.fn();
    render(<LinkRow link={makeLink()} onMove={onMove} isFirst={false} isLast={true} />);
    expect(screen.getByRole('button', { name: 'Mover para baixo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover para cima' })).not.toBeDisabled();
  });
});
