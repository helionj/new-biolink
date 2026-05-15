import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const Schema = z.object({ name: z.string().min(1, 'Campo obrigatório') });
type Values = z.infer<typeof Schema>;

function TestForm({ onValid }: { onValid: (values: Values) => void }) {
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '' },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValid)} noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Enviar</button>
      </form>
    </Form>
  );
}

describe('<Form> (react-hook-form + zodResolver)', () => {
  it('renderiza o label associado ao input', () => {
    const { container } = render(<TestForm onValid={vi.fn()} />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('submit inválido renderiza FormMessage com a mensagem do Zod e não chama o handler', async () => {
    const onValid = vi.fn();
    render(<TestForm onValid={onValid} />);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Campo obrigatório')).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it('submit válido chama o handler com os valores', async () => {
    const onValid = vi.fn();
    render(<TestForm onValid={onValid} />);
    await userEvent.type(screen.getByLabelText('Nome'), 'alice');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid).toHaveBeenCalledWith({ name: 'alice' }, expect.anything());
  });
});
