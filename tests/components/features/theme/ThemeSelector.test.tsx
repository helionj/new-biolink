import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/page/actions', () => ({
  updateTheme: vi.fn(),
}));

// next/image em jsdom 29 — stub para renderizar como <img> nativo.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} className={className} />;
  },
}));

import { ThemeSelector } from '@/components/theme/ThemeSelector';
import type { Tables } from '@/lib/supabase/types';
import { toast } from '@/lib/toast';
import * as pageActions from '@/server/page/actions';

const mockedUpdate = vi.mocked(pageActions.updateTheme);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

const previewData = {
  profile: { username: 'demo', display_name: 'Demo', bio: null, avatar_url: null },
  links: [],
};

function fakePage(theme: 'light' | 'dark' | 'brand'): Tables<'pages'> {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    profile_id: '00000000-0000-0000-0000-000000001051',
    theme,
    is_published: true,
    created_at: '2026-05-21T00:00:00Z',
    updated_at: '2026-05-21T00:00:00Z',
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('<ThemeSelector>', () => {
  it('renderiza 3 cards (light, dark, brand) com nomes visíveis (AC1)', () => {
    render(<ThemeSelector currentTheme="light" previewData={previewData} />);
    expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /vibrante/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('exibe label "Vibrante" + descrição "Lavender + peach pop" para tema brand (Q3 §6 PRD v0.5, Story 5.6 DEV-B)', () => {
    render(<ThemeSelector currentTheme="light" previewData={previewData} />);
    // Label rebrand "Brand" → "Vibrante" preserva enum 'brand' em DB/types.
    expect(screen.getByText('Vibrante')).toBeInTheDocument();
    // Descrições verbatim spec §2.7 L706/L715/L724.
    expect(screen.getByText('Lavender mist')).toBeInTheDocument();
    expect(screen.getByText('Deep plum night')).toBeInTheDocument();
    expect(screen.getByText('Lavender + peach pop')).toBeInTheDocument();
  });

  it('card atual está aria-checked=true; outros aria-checked=false (AC2)', () => {
    render(<ThemeSelector currentTheme="dark" previewData={previewData} />);
    expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /vibrante/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('clique chama updateTheme + toast.success em sucesso (AC2, AC4)', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue({ ok: true, data: fakePage('brand') });
    render(<ThemeSelector currentTheme="light" previewData={previewData} />);

    await user.click(screen.getByRole('radio', { name: /vibrante/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({ theme: 'brand' });
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Tema atualizado');
    expect(screen.getByRole('radio', { name: /vibrante/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('erro do server reverte seleção + toast.error (AC4)', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue({
      ok: false,
      error: 'Erro ao salvar o tema. Tente novamente',
    });
    render(<ThemeSelector currentTheme="light" previewData={previewData} />);

    await user.click(screen.getByRole('radio', { name: /dark/i }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Erro ao salvar o tema. Tente novamente');
    });
    // Rollback: light volta a aria-checked=true.
    expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('clique no card já selecionado é no-op (não chama Server Action)', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector currentTheme="brand" previewData={previewData} />);

    await user.click(screen.getByRole('radio', { name: /vibrante/i }));

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedToastSuccess).not.toHaveBeenCalled();
  });

  it('container tem role="radiogroup" com aria-label (a11y)', () => {
    render(<ThemeSelector currentTheme="light" previewData={previewData} />);
    expect(screen.getByRole('radiogroup', { name: /tema da página/i })).toBeInTheDocument();
  });
});
