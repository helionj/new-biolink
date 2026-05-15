import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/ui/input';

describe('<Input>', () => {
  it('renderiza com data-slot e placeholder', () => {
    const { container } = render(<Input placeholder="seu@email.com" />);
    const input = screen.getByPlaceholderText('seu@email.com');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(container).toMatchSnapshot();
  });

  it('respeita disabled', () => {
    render(<Input disabled placeholder="x" />);
    expect(screen.getByPlaceholderText('x')).toBeDisabled();
  });

  it('reflete aria-invalid', () => {
    render(<Input aria-invalid placeholder="x" />);
    expect(screen.getByPlaceholderText('x')).toHaveAttribute('aria-invalid', 'true');
  });

  it('encaminha o type', () => {
    render(<Input type="password" placeholder="senha" />);
    expect(screen.getByPlaceholderText('senha')).toHaveAttribute('type', 'password');
  });

  it('funciona como controlled (value/onChange)', async () => {
    function Controlled() {
      const [value, setValue] = useState('');
      return <Input placeholder="nome" value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    render(<Controlled />);
    const input = screen.getByPlaceholderText('nome');
    await userEvent.type(input, 'alice');
    expect(input).toHaveValue('alice');
  });
});
