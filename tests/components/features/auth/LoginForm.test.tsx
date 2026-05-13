import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/actions', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { LoginForm } from '@/components/auth/LoginForm';
import * as actions from '@/server/auth/actions';

const mockedSignIn = vi.mocked(actions.signIn);

afterEach(() => {
  mockedSignIn.mockReset();
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
});
