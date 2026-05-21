import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VARIANTS = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
const SIZES = ['default', 'sm', 'lg', 'icon'] as const;

describe('<Button>', () => {
  it('renderiza com variante e tamanho default', () => {
    const { container } = render(<Button>Click</Button>);
    const btn = screen.getByRole('button', { name: 'Click' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-slot', 'button');
    expect(btn.className).toBe(cn(buttonVariants({ variant: 'default', size: 'default' })));
    expect(container).toMatchSnapshot();
  });

  it.each(VARIANTS)('aplica a classe da variante "%s"', (variant) => {
    render(<Button variant={variant}>v-{variant}</Button>);
    const btn = screen.getByRole('button', { name: `v-${variant}` });
    expect(btn.className).toBe(cn(buttonVariants({ variant, size: 'default' })));
  });

  it.each(SIZES)('aplica a classe do tamanho "%s"', (size) => {
    render(<Button size={size}>s-{size}</Button>);
    const btn = screen.getByRole('button', { name: `s-${size}` });
    expect(btn.className).toBe(cn(buttonVariants({ variant: 'default', size })));
  });

  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respeita disabled (não dispara onClick)', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Off
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Off' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renderiza como <a> via render prop (polimorfismo base-ui)', () => {
    // URL absoluta proposital: a partir da Story 2.7 (`app/[username]/page.tsx`),
    // o segmento dinâmico captura qualquer single-segment path, fazendo a regra
    // `@next/next/no-html-link-for-pages` disparar para `<a href="/x">` interno.
    // Usar URL externa preserva a intenção do teste (provar o polimorfismo do
    // Button para `<a>`) sem trigger da regra.
    render(<Button render={<a href="https://example.com/x" />}>Link</Button>);
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toHaveAttribute('href', 'https://example.com/x');
    expect(link).toHaveAttribute('data-slot', 'button');
    expect(link.className).toBe(cn(buttonVariants({ variant: 'default', size: 'default' })));
  });
});
