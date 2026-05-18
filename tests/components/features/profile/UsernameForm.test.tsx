import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockedRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockedRefresh }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/profile/actions', () => ({
  updateUsername: vi.fn(),
  checkUsernameAvailability: vi.fn(),
}));

import { UsernameForm } from '@/components/profile/UsernameForm';
import { toast } from '@/lib/toast';
import * as profileActions from '@/server/profile/actions';

const mockedUpdate = vi.mocked(profileActions.updateUsername);
const mockedCheck = vi.mocked(profileActions.checkUsernameAvailability);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

function makeProfile(username: string) {
  return {
    id: '00000000-0000-0000-0000-000000000031',
    username,
    display_name: null,
    bio: null,
    avatar_url: null,
    created_at: '2026-05-17T00:00:00Z',
    updated_at: '2026-05-17T00:00:00Z',
  };
}

beforeEach(() => {
  mockedCheck.mockResolvedValue({ ok: true, data: { available: true } });
});

afterEach(() => {
  mockedUpdate.mockReset();
  mockedCheck.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<UsernameForm>', () => {
  it('renderiza o campo com o username atual e o aviso "URL pública mudará" (AC2)', () => {
    render(<UsernameForm currentUsername="atual-user" />);
    expect(screen.getByLabelText(/^username$/i)).toHaveValue('atual-user');
    expect(screen.getByText(/url pública mudará/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar username/i })).toBeEnabled();
  });

  it('em sucesso chama updateUsername, exibe toast e refresh (AC2/AC4)', async () => {
    mockedUpdate.mockResolvedValue({ ok: true, data: makeProfile('novo-handle') });
    render(<UsernameForm currentUsername="atual-user" />);

    const input = screen.getByLabelText(/^username$/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'novo-handle');
    await userEvent.click(screen.getByRole('button', { name: /salvar username/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({ username: 'novo-handle' });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Username atualizado');
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it('em conflito de unicidade exibe erro tratado no campo (AC4)', async () => {
    mockedUpdate.mockResolvedValue({
      ok: false,
      error: 'Este username já está em uso',
      fieldErrors: { username: 'Este username já está em uso' },
    });
    render(<UsernameForm currentUsername="atual-user" />);

    const input = screen.getByLabelText(/^username$/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'ocupado-user');
    await userEvent.click(screen.getByRole('button', { name: /salvar username/i }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Este username já está em uso');
    });
    expect(await screen.findByText('Este username já está em uso')).toBeInTheDocument();
  });

  it('não submete username com formato inválido (zodResolver)', async () => {
    render(<UsernameForm currentUsername="atual-user" />);

    const input = screen.getByLabelText(/^username$/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'ab');
    await userEvent.click(screen.getByRole('button', { name: /salvar username/i }));

    expect(
      await screen.findByText('Use 3 a 30 caracteres entre a-z, 0-9 e hífen'),
    ).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('não checa disponibilidade do próprio username atual (skip)', async () => {
    vi.useFakeTimers();
    try {
      render(<UsernameForm currentUsername="atual-user" />);
      // Sem alterar o campo (valor === currentUsername) → skip.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mockedCheck).not.toHaveBeenCalled();

      // Ao mudar para outro username válido, passa a checar.
      fireEvent.change(screen.getByLabelText(/^username$/i), {
        target: { value: 'outro-handle' },
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(mockedCheck).toHaveBeenCalledWith({ username: 'outro-handle' });
    } finally {
      vi.useRealTimers();
    }
  });
});
