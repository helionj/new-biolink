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

describe('<Home> — landing pública (canary)', () => {
  it('guest: CTA "Criar minha página" → /signup, com hero, 3 bullets e footer GitHub', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { container } = render(await Home());

    const cta = screen.getByRole('link', { name: 'Criar minha página' });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/signup');

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    const github = screen.getByRole('link', { name: /github/i });
    expect(github).toHaveAttribute('href', 'https://github.com/helionj/new-biolink');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
    expect(github).toHaveAttribute('target', '_blank');

    expect(container).toMatchSnapshot();
  });

  it('autenticado: CTA "Ir para meu dashboard" → /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    render(await Home());

    const cta = screen.getByRole('link', { name: 'Ir para meu dashboard' });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Criar minha página' })).not.toBeInTheDocument();
  });
});
