import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/components/auth/LoginForm';
import { toast } from '@/lib/toast';
import * as actions from '@/server/auth/actions';

let searchParamsString = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsString),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/server/auth/actions', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedSignIn = vi.mocked(actions.signIn);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

beforeEach(() => {
  searchParamsString = '';
});

afterEach(() => {
  mockedSignIn.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<LoginForm>', () => {
  it('renderiza email + senha + link esqueci a senha + botão entrar', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /esqueci a senha/i })).toHaveAttribute(
      'href',
      '/reset-password',
    );
    expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled();
  });

  it('mostra erro para email inválido', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'foo');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'x');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('Informe um email válido')).toBeInTheDocument();
    expect(mockedSignIn).not.toHaveBeenCalled();
  });

  it('chama signIn com payload correto no submit válido', async () => {
    mockedSignIn.mockResolvedValue({ ok: true, data: undefined });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledTimes(1);
    });
    expect(mockedSignIn).toHaveBeenCalledWith({
      email: 'alice@biolink.dev',
      password: 'password123',
    });
  });

  it('mostra erro quando Server Action retorna { ok: false }', async () => {
    mockedSignIn.mockResolvedValue({ ok: false, error: 'Email ou senha incorretos' });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalled();
    });
  });

  it('exibe toast.success quando ?message=verify_email', () => {
    searchParamsString = 'message=verify_email';
    render(<LoginForm />);
    expect(mockedToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/conta criada/i));
  });

  it('exibe toast.error quando ?error=auth_callback_failed', () => {
    searchParamsString = 'error=auth_callback_failed';
    render(<LoginForm />);
    expect(mockedToastError).toHaveBeenCalledWith(expect.stringMatching(/não foi possível/i));
  });
});
