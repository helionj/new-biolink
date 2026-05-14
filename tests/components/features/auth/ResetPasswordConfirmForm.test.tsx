import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/actions', () => ({
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  resendVerificationEmail: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { ResetPasswordConfirmForm } from '@/components/auth/ResetPasswordConfirmForm';
import * as actions from '@/server/auth/actions';

const mockedConfirmPasswordReset = vi.mocked(actions.confirmPasswordReset);

afterEach(() => {
  mockedConfirmPasswordReset.mockReset();
});

describe('<ResetPasswordConfirmForm>', () => {
  it('renderiza 2 campos password + botão Atualizar senha', () => {
    render(<ResetPasswordConfirmForm />);
    expect(screen.getByLabelText(/^nova senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirmar nova senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /atualizar senha/i })).toBeEnabled();
  });

  it('mostra erro para senha curta e NÃO chama action', async () => {
    render(<ResetPasswordConfirmForm />);
    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'short');
    await userEvent.type(screen.getByLabelText(/^confirmar nova senha$/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /atualizar senha/i }));
    expect(
      await screen.findByText('A senha precisa ter no mínimo 8 caracteres'),
    ).toBeInTheDocument();
    expect(mockedConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it('mostra erro quando confirmPassword diferente', async () => {
    render(<ResetPasswordConfirmForm />);
    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/^confirmar nova senha$/i), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /atualizar senha/i }));
    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(mockedConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it('chama confirmPasswordReset com payload correto no submit válido', async () => {
    mockedConfirmPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    render(<ResetPasswordConfirmForm />);
    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/^confirmar nova senha$/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /atualizar senha/i }));
    await waitFor(() => {
      expect(mockedConfirmPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          newPassword: 'password123',
          confirmPassword: 'password123',
        }),
      );
    });
  });
});
