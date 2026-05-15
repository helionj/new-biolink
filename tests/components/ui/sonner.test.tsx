import { act, render, screen } from '@testing-library/react';
import { toast as sonnerToast } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { Toaster } from '@/components/ui/sonner';
import { notify, toast } from '@/lib/toast';

beforeAll(() => {
  // jsdom has no matchMedia; sonner calls it for `theme="system"` detection.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => {
  // sonner state is a module-level singleton; clear between tests.
  sonnerToast.dismiss();
});

describe('<Toaster> (sonner) + @/lib/toast', () => {
  it('snapshot do Toaster montado (vazio)', () => {
    const { baseElement } = render(<Toaster />);
    expect(baseElement).toMatchSnapshot();
  });

  it('dispara toast.success via @/lib/toast e renderiza no portal', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Operação concluída com sucesso');
    });
    expect(await screen.findByText('Operação concluída com sucesso')).toBeInTheDocument();
  });

  it('dispara toast.error via @/lib/toast e renderiza no portal', async () => {
    render(<Toaster />);
    act(() => {
      toast.error('Algo deu errado');
    });
    expect(await screen.findByText('Algo deu errado')).toBeInTheDocument();
  });

  it('dispara toast.info via @/lib/toast e renderiza no portal', async () => {
    render(<Toaster />);
    act(() => {
      toast.info('Apenas uma informação');
    });
    expect(await screen.findByText('Apenas uma informação')).toBeInTheDocument();
  });

  it('notify({ variant: "destructive" }) mapeia para erro com title + description', async () => {
    render(<Toaster />);
    act(() => {
      notify({ title: 'Falha crítica', description: 'Detalhe do erro', variant: 'destructive' });
    });
    expect(await screen.findByText('Falha crítica')).toBeInTheDocument();
    expect(screen.getByText('Detalhe do erro')).toBeInTheDocument();
  });

  it('notify({ variant: "success" }) mapeia para sucesso', async () => {
    render(<Toaster />);
    act(() => {
      notify({ title: 'Tudo certo', variant: 'success' });
    });
    expect(await screen.findByText('Tudo certo')).toBeInTheDocument();
  });

  it('notify() default (sem variant) renderiza o título', async () => {
    render(<Toaster />);
    act(() => {
      notify({ title: 'Notificação neutra' });
    });
    expect(await screen.findByText('Notificação neutra')).toBeInTheDocument();
  });
});
