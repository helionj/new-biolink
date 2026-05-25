import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

describe('<Card>', () => {
  it('renderiza a raiz com data-slot e tokens BioLink', () => {
    render(<Card>conteúdo</Card>);
    const root = screen.getByText('conteúdo');
    expect(root).toHaveAttribute('data-slot', 'card');
    expect(root).toHaveAttribute('data-size', 'default');
    // Tokens BioLink (Story 3.2): bg-card / text-card-foreground devem aparecer
    // nas classes do root.
    expect(root.className).toMatch(/bg-card/);
    expect(root.className).toMatch(/text-card-foreground/);
  });

  it('aplica data-size="sm" quando size="sm"', () => {
    render(<Card size="sm">small</Card>);
    expect(screen.getByText('small')).toHaveAttribute('data-size', 'sm');
  });

  it('compõe Header/Title/Description/Action/Content/Footer com os data-slots corretos', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
          <CardDescription>Descrição</CardDescription>
          <CardAction>Ação</CardAction>
        </CardHeader>
        <CardContent>Conteúdo</CardContent>
        <CardFooter>Rodapé</CardFooter>
      </Card>,
    );

    expect(container.querySelector('[data-slot=card-header]')).not.toBeNull();
    expect(container.querySelector('[data-slot=card-title]')).toHaveTextContent('Título');
    expect(container.querySelector('[data-slot=card-description]')).toHaveTextContent('Descrição');
    expect(container.querySelector('[data-slot=card-action]')).toHaveTextContent('Ação');
    expect(container.querySelector('[data-slot=card-content]')).toHaveTextContent('Conteúdo');
    expect(container.querySelector('[data-slot=card-footer]')).toHaveTextContent('Rodapé');
  });

  it('snapshot do conjunto completo', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Métricas</CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>1234 cliques</CardContent>
        <CardFooter>+12% vs semana anterior</CardFooter>
      </Card>,
    );
    expect(container).toMatchSnapshot();
  });
});
