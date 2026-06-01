import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
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

import Home from '@/app/page';

afterEach(() => {
  mockGetUser.mockReset();
});

describe('<Home> — landing pública Soft Studio', () => {
  it('guest: hero CTAs (primary + secondary ghost) + 3 cards motivos + header Entrar + footer github', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { container } = render(await Home());

    // Hero primary CTA — label tem "→" pós-5.4 (regex tolera with/without)
    const primaryCta = screen.getByRole('link', { name: /Criar minha página/ });
    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveAttribute('href', '/signup');

    // Hero secondary CTA — ghost link (apenas guest)
    const secondaryCta = screen.getByRole('link', { name: /Já tem conta\?/ });
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute('href', '/login');

    // Header "Entrar" link (apenas guest)
    const headerEntrar = screen.getAllByRole('link', { name: 'Entrar' });
    expect(headerEntrar.length).toBeGreaterThanOrEqual(1);

    // H1 presente
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    // 3 Cards motivos — verificar via títulos H3 (CardTitle is div but text matches)
    expect(screen.getByText('Sem ads forçados')).toBeInTheDocument();
    expect(screen.getByText('Analytics próprios')).toBeInTheDocument();
    expect(screen.getByText('Open source')).toBeInTheDocument();

    // Footer github external link
    const github = screen.getByRole('link', { name: /open-source/i });
    expect(github).toHaveAttribute('href', 'https://github.com/helionj/new-biolink');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
    expect(github).toHaveAttribute('target', '_blank');

    expect(container).toMatchSnapshot();
  });

  it('autenticado: primary CTA "Ir para meu dashboard" + sem secondary + sem header Entrar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    render(await Home());

    const cta = screen.getByRole('link', { name: /Ir para meu dashboard/ });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/dashboard');

    // Secondary ghost CTA "Já tem conta?" não renderiza para autenticado
    expect(screen.queryByRole('link', { name: /Já tem conta\?/ })).not.toBeInTheDocument();

    // Header "Entrar" também não renderiza para autenticado
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();

    // Primary CTA do guest não renderiza para autenticado
    expect(screen.queryByRole('link', { name: /Criar minha página/ })).not.toBeInTheDocument();
  });
});
