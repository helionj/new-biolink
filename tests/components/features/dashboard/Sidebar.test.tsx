import { render, screen } from '@testing-library/react';
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

import { Sidebar } from '@/components/dashboard/Sidebar';

afterEach(() => {
  mockPathname = '/dashboard';
});

describe('<Sidebar>', () => {
  it('renderiza os 5 itens de navegação com hrefs canônicos (AC2)', () => {
    render(<Sidebar />);

    const expected = [
      ['Links', '/dashboard'],
      ['Profile', '/dashboard/profile'],
      ['Theme', '/dashboard/theme'],
      ['Analytics', '/dashboard/analytics'],
      ['Account', '/dashboard/account'],
    ] as const;

    for (const [label, href] of expected) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('expõe a navegação como landmark nomeado (AC5)', () => {
    render(<Sidebar />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  it('marca o item da rota ativa com aria-current="page" (AC3)', () => {
    mockPathname = '/dashboard/profile';
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    // /dashboard (Links) usa match exato — não deve acender em sub-rotas.
    expect(screen.getByRole('link', { name: 'Links' })).not.toHaveAttribute('aria-current');
  });

  it('na raiz /dashboard, apenas "Links" fica ativo (AC3)', () => {
    mockPathname = '/dashboard';
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Links' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
  });
});
