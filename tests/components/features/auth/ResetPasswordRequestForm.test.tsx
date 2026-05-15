import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResetPasswordRequestForm } from '@/components/auth/ResetPasswordRequestForm';
import { toast } from '@/lib/toast';
import * as actions from '@/server/auth/actions';

vi.mock('@/server/auth/actions', () => ({
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  resendVerificationEmail: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedRequestPasswordReset = vi.mocked(actions.requestPasswordReset);
const mockedToastSuccess = vi.mocked(toast.success);

afterEach(() => {
  mockedRequestPasswordReset.mockReset();
  mockedToastSuccess.mockReset();
});

describe('<ResetPasswordRequestForm>', () => {
  it('renderiza campo email + botão Enviar link', () => {
    render(<ResetPasswordRequestForm />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link/i })).toBeEnabled();
  });

  it('mostra erro para email inválido e NÃO chama action', async () => {
    render(<ResetPasswordRequestForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'invalid');
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }));
    expect(await screen.findByText('Informe um email válido')).toBeInTheDocument();
    expect(mockedRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('chama requestPasswordReset com payload correto no submit válido', async () => {
    mockedRequestPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    render(<ResetPasswordRequestForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }));
    await waitFor(() => {
      expect(mockedRequestPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'alice@biolink.dev' }),
      );
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/se este email/i));
  });

  it('exibe toast de erro do initialError prop session_expired', () => {
    const mockedToastError = vi.mocked(toast.error);
    mockedToastError.mockReset();
    render(<ResetPasswordRequestForm initialError="session_expired" />);
    expect(mockedToastError).toHaveBeenCalledWith(expect.stringMatching(/sessão expirada/i));
  });
});
