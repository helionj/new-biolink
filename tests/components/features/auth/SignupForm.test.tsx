import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/server/profile/actions', () => ({
  checkUsernameAvailability: vi.fn(),
  updateUsername: vi.fn(),
}));

import { SignupForm } from '@/components/auth/SignupForm';
import * as actions from '@/server/auth/actions';
import * as profileActions from '@/server/profile/actions';

const mockedSignUp = vi.mocked(actions.signUp);
const mockedCheck = vi.mocked(profileActions.checkUsernameAvailability);

beforeEach(() => {
  // Default seguro para os testes que não exercitam disponibilidade
  // (o hook só chama isto após o debounce + schema válido).
  mockedCheck.mockResolvedValue({ ok: true, data: { available: true } });
});

afterEach(() => {
  mockedSignUp.mockReset();
  mockedPush.mockReset();
  mockedCheck.mockReset();
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

// ---------------------------------------------------------------------------
// AC1 — validação live: debounce 300ms + indicador de disponibilidade
// Fake timers para determinismo do debounce (story §Testing). Usamos
// fireEvent (não userEvent): userEvent.type + fake timers + resolver async
// do RHF deadlocka em jsdom (timeout). O hook usa usernameSchema.safeParse
// (síncrono), independente da validação async do RHF.
// ---------------------------------------------------------------------------
describe('<SignupForm> — validação live de username (AC1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function typeUsername(value: string) {
    fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value } });
  }

  it('não chama checkUsernameAvailability antes dos 300ms (debounce)', async () => {
    render(<SignupForm />);
    typeUsername('novo-user');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(mockedCheck).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(mockedCheck).toHaveBeenCalledWith({ username: 'novo-user' });
  });

  it('coalesce mudanças rápidas — uma única chamada após o settle', async () => {
    render(<SignupForm />);
    typeUsername('abc');
    typeUsername('abcd');
    typeUsername('abcdef');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mockedCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck).toHaveBeenCalledWith({ username: 'abcdef' });
  });

  it('mostra "Verificando disponibilidade..." enquanto aguarda e "Username disponível" no resultado', async () => {
    mockedCheck.mockResolvedValue({ ok: true, data: { available: true } });
    render(<SignupForm />);
    typeUsername('livre-user');

    // Antes de resolver: estado "checking"
    expect(screen.getByText('Verificando disponibilidade...')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText('Username disponível')).toBeInTheDocument();
  });

  it('mostra "Este username já está em uso" quando indisponível', async () => {
    mockedCheck.mockResolvedValue({ ok: true, data: { available: false } });
    render(<SignupForm />);
    typeUsername('ocupado-user');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText('Este username já está em uso')).toBeInTheDocument();
  });

  it('não dispara a checagem para formato inválido (schema gate)', async () => {
    render(<SignupForm />);
    typeUsername('ab');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockedCheck).not.toHaveBeenCalled();
  });

  it('não dispara a checagem para username reservado (schema gate)', async () => {
    render(<SignupForm />);
    typeUsername('dashboard');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockedCheck).not.toHaveBeenCalled();
  });
});
