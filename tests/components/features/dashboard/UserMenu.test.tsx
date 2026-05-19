import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/actions', () => ({
  signOut: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { UserMenu } from '@/components/dashboard/UserMenu';
import { toast } from '@/lib/toast';
import * as actions from '@/server/auth/actions';

const mockedSignOut = vi.mocked(actions.signOut);
const mockedToast = vi.mocked(toast);

afterEach(() => {
  mockedSignOut.mockReset();
  mockedToast.success.mockReset();
  mockedToast.error.mockReset();
  vi.restoreAllMocks();
});

describe('<UserMenu>', () => {
  it('mostra iniciais do displayName no AvatarFallback', () => {
    render(
      <UserMenu
        username="joao"
        displayName="Maria Silva"
        avatarUrl={null}
        siteUrl="https://biolink.dev"
      />,
    );
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('faz fallback para o username quando displayName é null', () => {
    render(
      <UserMenu
        username="joao-silva"
        displayName={null}
        avatarUrl={null}
        siteUrl="https://biolink.dev"
      />,
    );
    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('"Copiar URL pública" copia ${siteUrl}/@username e dispara toast.success (AC4)', async () => {
    // userEvent.setup() instala o stub de navigator.clipboard; espionamos
    // o writeText desse stub (definir o mock antes seria sobrescrito).
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(
      <UserMenu
        username="joao"
        displayName="João"
        avatarUrl={null}
        siteUrl="https://biolink.dev"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu da conta de João' }));
    await user.click(await screen.findByRole('menuitem', { name: /copiar url pública/i }));

    expect(writeText).toHaveBeenCalledWith('https://biolink.dev/@joao');
    expect(mockedToast.success).toHaveBeenCalledWith('URL pública copiada');
  });

  it('"Sair" chama o Server Action signOut (AC4)', async () => {
    const user = userEvent.setup();
    mockedSignOut.mockResolvedValue(undefined as never);
    render(
      <UserMenu
        username="joao"
        displayName="João"
        avatarUrl={null}
        siteUrl="https://biolink.dev"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu da conta de João' }));
    await user.click(await screen.findByRole('menuitem', { name: /sair/i }));

    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });
});
