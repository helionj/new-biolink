import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MobileDrawer } from '@/components/dashboard/MobileDrawer';

afterEach(() => {
  mockPathname = '/dashboard';
});

describe('<MobileDrawer>', () => {
  it('o trigger hambúrguer tem aria-label e abre o drawer (AC1)', async () => {
    const user = userEvent.setup();
    render(<MobileDrawer />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('o conteúdo expõe role="dialog" e os 5 itens de navegação (AC2, AC5)', async () => {
    const user = userEvent.setup();
    render(<MobileDrawer />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    const dialog = await screen.findByRole('dialog');

    for (const label of ['Links', 'Profile', 'Theme', 'Analytics', 'Account']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(dialog).toBeInTheDocument();
  });

  it('ESC fecha o drawer (AC5 — focus trap nativo Radix/Base UI)', async () => {
    const user = userEvent.setup();
    render(<MobileDrawer />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('navegar por um item fecha o drawer', async () => {
    const user = userEvent.setup();
    render(<MobileDrawer />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('link', { name: 'Profile' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
