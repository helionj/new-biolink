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

import { AddLinkModal } from '@/components/links/AddLinkModal';
import { toast } from '@/lib/toast';
import * as linkActions from '@/server/links/actions';

const mockedCreate = vi.mocked(linkActions.createLink);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

function makeLink() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    page_id: '22222222-2222-4222-8222-222222222222',
    title: 'Meu link',
    url: 'https://exemplo.com',
    icon: null,
    is_visible: true,
    position: 0,
    created_at: '2026-05-19T00:00:00Z',
    updated_at: '2026-05-19T00:00:00Z',
  };
}

const trigger = <button type="button">Abrir modal</button>;

afterEach(() => {
  mockedCreate.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<AddLinkModal>', () => {
  it('abre o modal pelo trigger (AC2)', async () => {
    const user = userEvent.setup();
    render(<AddLinkModal trigger={trigger} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir modal' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('validação inline (título vazio, URL inválida) não chama createLink (AC2/AC7)', async () => {
    const user = userEvent.setup();
    render(<AddLinkModal trigger={trigger} />);

    await user.click(screen.getByRole('button', { name: 'Abrir modal' }));
    await screen.findByRole('dialog');

    // Submete vazio.
    await user.click(screen.getByRole('button', { name: 'Adicionar link' }));

    expect(await screen.findByText('O título é obrigatório')).toBeInTheDocument();
    expect(
      await screen.findByText('A URL deve começar com http:// ou https://'),
    ).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('submit válido chama createLink, faz toast.success e fecha o modal (AC2/AC6)', async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: true, data: makeLink() });
    render(<AddLinkModal trigger={trigger} />);

    await user.click(screen.getByRole('button', { name: 'Abrir modal' }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText('Título'), 'Meu portfólio');
    await user.type(screen.getByLabelText('URL'), 'https://meusite.com');
    await user.click(screen.getByRole('button', { name: 'Adicionar link' }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        title: 'Meu portfólio',
        url: 'https://meusite.com',
        icon: undefined,
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Link adicionado');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it('fieldErrors do server refletem em FormMessage (AC7)', async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({
      ok: false,
      error: 'Dados do link inválidos',
      fieldErrors: { url: 'URL não permitida' },
    });
    render(<AddLinkModal trigger={trigger} />);

    await user.click(screen.getByRole('button', { name: 'Abrir modal' }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText('Título'), 'Título ok');
    await user.type(screen.getByLabelText('URL'), 'https://ok.com');
    await user.click(screen.getByRole('button', { name: 'Adicionar link' }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalled();
    });
    expect(mockedToastError).toHaveBeenCalledWith('Dados do link inválidos');
    expect(await screen.findByText('URL não permitida')).toBeInTheDocument();
  });
});
