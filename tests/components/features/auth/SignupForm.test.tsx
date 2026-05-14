import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockedPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockedPush, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/server/auth/actions', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

import { SignupForm } from '@/components/auth/SignupForm';
import * as actions from '@/server/auth/actions';

const mockedSignUp = vi.mocked(actions.signUp);

afterEach(() => {
  mockedSignUp.mockReset();
  mockedPush.mockReset();
});

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
  await userEvent.type(screen.getByLabelText(/^username$/i), 'alice-1');
  await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
  await userEvent.type(screen.getByLabelText(/^confirmar senha$/i), 'password123');
  await userEvent.click(screen.getByLabelText(/aceito os termos/i));
}

describe('<SignupForm>', () => {
  it('renderiza todos os campos com labels PT-BR', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirmar senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aceito os termos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeEnabled();
  });

  it('mostra erro para email inválido', async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'invalid');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice-1');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/^confirmar senha$/i), 'password123');
    await userEvent.click(screen.getByLabelText(/aceito os termos/i));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(await screen.findByText('Informe um email válido')).toBeInTheDocument();
    expect(mockedSignUp).not.toHaveBeenCalled();
  });

  it('mostra erro para senha curta', async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice-1');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'short');
    await userEvent.type(screen.getByLabelText(/^confirmar senha$/i), 'short');
    await userEvent.click(screen.getByLabelText(/aceito os termos/i));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(
      await screen.findByText('A senha precisa ter no mínimo 8 caracteres'),
    ).toBeInTheDocument();
  });

  it('mostra erro para senhas que não coincidem', async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice-1');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/^confirmar senha$/i), 'different1');
    await userEvent.click(screen.getByLabelText(/aceito os termos/i));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
  });

  it('mostra erro para username reservado', async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'admin');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/^confirmar senha$/i), 'password123');
    await userEvent.click(screen.getByLabelText(/aceito os termos/i));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(await screen.findByText('Este username é reservado')).toBeInTheDocument();
  });

  it('mostra erro para username com regex inválido', async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@biolink.dev');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'AB');
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/^confirmar senha$/i), 'password123');
    await userEvent.click(screen.getByLabelText(/aceito os termos/i));
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(
      await screen.findByText('Use 3 a 30 caracteres entre a-z, 0-9 e hífen'),
    ).toBeInTheDocument();
  });

  it('chama signUp Server Action com payload correto no submit válido', async () => {
    mockedSignUp.mockResolvedValue({ ok: true, data: undefined });
    render(<SignupForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(mockedSignUp).toHaveBeenCalledTimes(1);
    });
    expect(mockedSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@biolink.dev',
        password: 'password123',
        confirmPassword: 'password123',
        username: 'alice-1',
        acceptTerms: true,
      }),
    );
  });

  it('em sucesso, redireciona para /login?message=verify_email (Story 1.6 mailer_autoconfirm:false)', async () => {
    mockedSignUp.mockResolvedValue({ ok: true, data: undefined });
    render(<SignupForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(mockedPush).toHaveBeenCalledWith('/login?message=verify_email');
    });
  });
});
