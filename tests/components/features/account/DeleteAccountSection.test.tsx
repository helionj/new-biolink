import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Story 4.5 — Task 7.3. Cobre DeleteAccountSection:
//   1) Renderiza botão "Excluir conta" com dialog inicialmente fechado.
//   2) Click abre dialog com confirmation text + input visível.
//   3) Input vazio: botão "Excluir permanentemente" disabled.
//   4) Input errado (case-insensitive mismatch): botão disabled.
//   5) Input correto + submit: action invocada com confirmUsername, toast.success
//      disparado, router.push('/') chamado.

const mockedPush = vi.fn();
const mockedRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockedPush, replace: vi.fn(), refresh: mockedRefresh }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/account/actions', () => ({
  exportAccountData: vi.fn(),
  deleteAccount: vi.fn(),
}));

import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';
import { toast } from '@/lib/toast';
import * as accountActions from '@/server/account/actions';

const mockedDelete = vi.mocked(accountActions.deleteAccount);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

afterEach(() => {
  mockedDelete.mockReset();
  mockedPush.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<DeleteAccountSection>', () => {
  it('renderiza botão "Excluir conta" com dialog inicialmente fechado (AC1)', () => {
    render(<DeleteAccountSection username="cifx-alice" />);

    expect(screen.getByRole('button', { name: /excluir conta/i })).toBeInTheDocument();
    expect(screen.queryByText(/tem certeza absoluta/i)).not.toBeInTheDocument();
  });

  it('click abre dialog com confirmation text e input (AC3)', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection username="cifx-alice" />);

    await user.click(screen.getByRole('button', { name: /excluir conta/i }));

    await screen.findByText(/tem certeza absoluta/i);
    expect(screen.getByLabelText(/digite seu username para confirmar/i)).toBeInTheDocument();
  });

  it('input vazio: botão "Excluir permanentemente" disabled (AC3)', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection username="cifx-alice" />);

    await user.click(screen.getByRole('button', { name: /excluir conta/i }));
    await screen.findByText(/tem certeza absoluta/i);

    expect(screen.getByRole('button', { name: /excluir permanentemente/i })).toBeDisabled();
  });

  it('input com username errado: botão disabled — não chama action (AC3 defense-in-depth)', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection username="cifx-alice" />);

    await user.click(screen.getByRole('button', { name: /excluir conta/i }));
    await screen.findByText(/tem certeza absoluta/i);

    const input = screen.getByLabelText(/digite seu username para confirmar/i);
    await user.type(input, 'wrong-username');

    const submitBtn = screen.getByRole('button', { name: /excluir permanentemente/i });
    expect(submitBtn).toBeDisabled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('input correto + submit: action invocada, toast.success, router.push("/") (AC3+AC4)', async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue({ ok: true, data: undefined });

    render(<DeleteAccountSection username="cifx-alice" />);

    await user.click(screen.getByRole('button', { name: /excluir conta/i }));
    await screen.findByText(/tem certeza absoluta/i);

    const input = screen.getByLabelText(/digite seu username para confirmar/i);
    // Case-insensitive — testa que match com case diferente também funciona.
    await user.type(input, 'CIFX-ALICE');

    const submitBtn = screen.getByRole('button', { name: /excluir permanentemente/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith({ confirmUsername: 'CIFX-ALICE' });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Conta excluída');
    expect(mockedPush).toHaveBeenCalledWith('/');
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it('action retorna erro: toast.error + dialog permanece + router.push NÃO chamado', async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue({ ok: false, error: 'Erro ao excluir conta. Tente novamente.' });

    render(<DeleteAccountSection username="cifx-alice" />);

    await user.click(screen.getByRole('button', { name: /excluir conta/i }));
    await screen.findByText(/tem certeza absoluta/i);

    const input = screen.getByLabelText(/digite seu username para confirmar/i);
    await user.type(input, 'cifx-alice');

    const submitBtn = screen.getByRole('button', { name: /excluir permanentemente/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Erro ao excluir conta. Tente novamente.');
    });
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
