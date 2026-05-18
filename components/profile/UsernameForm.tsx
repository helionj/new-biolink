'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';

import { UsernameAvailabilityHint } from '@/components/profile/UsernameAvailabilityHint';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUsernameAvailability } from '@/lib/hooks/use-username-availability';
import { toast } from '@/lib/toast';
import { UpdateUsernameInput } from '@/lib/validators/profile';
import { updateUsername } from '@/server/profile/actions';

type FormValues = UpdateUsernameInput;

export function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateUsernameInput),
    mode: 'onChange',
    defaultValues: { username: currentUsername },
  });

  const usernameValue = useWatch({ control: form.control, name: 'username' });
  // Não checar disponibilidade do próprio username atual (seria "em uso"
  // porque é o dele mesmo).
  const usernameAvailability = useUsernameAvailability(
    usernameValue,
    usernameValue === currentUsername,
  );

  async function onSubmit(values: FormValues) {
    const res = await updateUsername(values);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) {
          form.setError(field as keyof FormValues, { message: String(message) });
        }
      }
      return;
    }
    toast.success('Username atualizado');
    form.reset({ username: res.data.username });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="username" placeholder="seu-username" {...field} />
              </FormControl>
              <p role="note" className="text-sm text-amber-600 dark:text-amber-500">
                Atenção: a URL pública mudará para <code>/@{usernameValue || 'seu-username'}</code>.
              </p>
              <FormMessage />
              <UsernameAvailabilityHint status={usernameAvailability} />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar username'}
        </Button>
      </form>
    </Form>
  );
}
