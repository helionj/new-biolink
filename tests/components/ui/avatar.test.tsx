import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';

describe('<Avatar>', () => {
  it('renderiza a raiz com data-slot e tamanho default', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const root = container.querySelector('[data-slot=avatar]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-size', 'default');
    // Token base do contorno (avatar.tsx:20).
    expect(root?.className).toMatch(/after:border-border/);
  });

  it.each(['sm', 'default', 'lg'] as const)('aplica data-size="%s"', (size) => {
    const { container } = render(
      <Avatar size={size}>
        <AvatarFallback>X</AvatarFallback>
      </Avatar>,
    );
    expect(container.querySelector('[data-slot=avatar]')).toHaveAttribute('data-size', size);
  });

  it('AvatarFallback renderiza filhos com data-slot correto e tokens muted', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const fallback = container.querySelector('[data-slot=avatar-fallback]');
    expect(fallback).not.toBeNull();
    expect(fallback).toHaveTextContent('AB');
    expect(fallback?.className).toMatch(/bg-muted/);
    expect(fallback?.className).toMatch(/text-muted-foreground/);
  });

  it('AvatarImage + AvatarFallback coexistem: enquanto image não carrega, fallback é visível', () => {
    // jsdom não dispara `load` de URLs externas, então `@base-ui/react/avatar`
    // mantém status="loading" e renderiza apenas o fallback. Esse é o
    // comportamento de produção esperado em conexões lentas — fallback
    // sempre visível como degradação progressiva.
    render(
      <Avatar>
        <AvatarImage src="https://example.com/x.png" alt="Avatar de Alice" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    // Validação smoke: o componente compila e o fallback é o que o usuário vê
    // até o load completar.
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('AvatarBadge renderiza posicionado absoluto com token primary', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
        <AvatarBadge>
          <svg aria-hidden="true" />
        </AvatarBadge>
      </Avatar>,
    );
    const badge = container.querySelector('[data-slot=avatar-badge]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toMatch(/absolute/);
    expect(badge?.className).toMatch(/bg-primary/);
    expect(badge?.className).toMatch(/text-primary-foreground/);
  });

  it('AvatarGroup + AvatarGroupCount agrupam com data-slots corretos', () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>AA</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>BB</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(container.querySelector('[data-slot=avatar-group]')).not.toBeNull();
    expect(container.querySelector('[data-slot=avatar-group-count]')).toHaveTextContent('+3');
    expect(container.querySelectorAll('[data-slot=avatar]')).toHaveLength(2);
  });

  it('snapshot do conjunto Avatar + Fallback', () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(container).toMatchSnapshot();
  });

  it('aceita data attributes adicionais via spread', () => {
    render(
      <Avatar data-testid="user-avatar">
        <AvatarFallback>X</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
  });
});
