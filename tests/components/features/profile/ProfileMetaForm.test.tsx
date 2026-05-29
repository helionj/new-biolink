import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockedRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockedRefresh }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/profile/actions', () => ({
  updateProfileMeta: vi.fn(),
}));

import { ProfileMetaForm } from '@/components/profile/ProfileMetaForm';
import { toast } from '@/lib/toast';
import * as profileActions from '@/server/profile/actions';

const mockedUpdate = vi.mocked(profileActions.updateProfileMeta);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

function makeProfile(overrides: Partial<{ display_name: string | null; bio: string | null }> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000051',
    username: 'demo',
    display_name: overrides.display_name ?? null,
    bio: overrides.bio ?? null,
    avatar_url: null,
    created_at: '2026-05-28T00:00:00Z',
    updated_at: '2026-05-28T00:00:00Z',
  };
}

afterEach(() => {
  mockedUpdate.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

describe('<ProfileMetaForm>', () => {
  it('renderiza com defaults atuais e contadores X/50, X/280 (AC1, AC4)', () => {
    render(<ProfileMetaForm currentDisplayName="Helio Demo" currentBio="Bio curta de teste" />);

    expect(screen.getByLabelText(/^nome de exibição$/i)).toHaveValue('Helio Demo');
    expect(screen.getByLabelText(/^bio$/i)).toHaveValue('Bio curta de teste');
    expect(screen.getByText('10/50')).toBeInTheDocument();
    expect(screen.getByText('18/280')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar perfil/i })).toBeEnabled();
  });

  it('renderiza vazio com defaults null e submete strings vazias (AC1, AC2)', async () => {
    // DEV-8: sem Zod transform, o client envia `''` (string vazia). A
    // normalização `'' -> null` acontece na Server Action (ver
    // server/profile/actions.ts:updateProfileMeta). AC1 ("ambos opcionais")
    // é satisfeito porque Zod `.optional()` aceita '' sem erro de validação.
    mockedUpdate.mockResolvedValue({
      ok: true,
      data: makeProfile({ display_name: null, bio: null }),
    });

    render(<ProfileMetaForm currentDisplayName={null} currentBio={null} />);

    expect(screen.getByLabelText(/^nome de exibição$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^bio$/i)).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({ display_name: '', bio: '' });
    });
  });

  it('submete happy path: chama action, toast, refresh e trim aplicado (AC3, AC4, AC5)', async () => {
    mockedUpdate.mockResolvedValue({
      ok: true,
      data: makeProfile({ display_name: 'Novo Nome', bio: 'Nova bio' }),
    });

    render(<ProfileMetaForm currentDisplayName={null} currentBio={null} />);

    await userEvent.type(screen.getByLabelText(/^nome de exibição$/i), '  Novo Nome  ');
    await userEvent.type(screen.getByLabelText(/^bio$/i), 'Nova bio');
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({
        display_name: 'Novo Nome',
        bio: 'Nova bio',
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Perfil atualizado');
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it('bloqueia submit quando display_name > 50 chars (AC2)', async () => {
    render(<ProfileMetaForm currentDisplayName={null} currentBio={null} />);

    // DEV-5: maxLength HTML corta digitação real; usar fireEvent.change para
    // bypassar e exercer a validação Zod.
    fireEvent.change(screen.getByLabelText(/^nome de exibição$/i), {
      target: { value: 'a'.repeat(51) },
    });
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    expect(
      await screen.findByText('Nome de exibição deve ter no máximo 50 caracteres'),
    ).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('bloqueia submit quando bio > 280 chars (AC2)', async () => {
    render(<ProfileMetaForm currentDisplayName={null} currentBio={null} />);

    fireEvent.change(screen.getByLabelText(/^bio$/i), {
      target: { value: 'a'.repeat(281) },
    });
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    expect(await screen.findByText('Bio deve ter no máximo 280 caracteres')).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('em erro do Server Action exibe toast, NÃO chama refresh e preserva inputs (AC4, AC6)', async () => {
    mockedUpdate.mockResolvedValue({
      ok: false,
      error: 'Erro ao atualizar perfil. Tente novamente',
    });

    render(<ProfileMetaForm currentDisplayName={null} currentBio={null} />);

    await userEvent.type(screen.getByLabelText(/^nome de exibição$/i), 'Novo Nome');
    await userEvent.type(screen.getByLabelText(/^bio$/i), 'Nova bio');
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Erro ao atualizar perfil. Tente novamente');
    });
    expect(mockedRefresh).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^nome de exibição$/i)).toHaveValue('Novo Nome');
    expect(screen.getByLabelText(/^bio$/i)).toHaveValue('Nova bio');
  });
});
