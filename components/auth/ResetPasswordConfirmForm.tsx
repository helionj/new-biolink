'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
import { ResetPasswordConfirmInput } from '@/lib/validators/auth';
import { confirmPasswordReset } from '@/server/auth/actions';

type FormValues = ResetPasswordConfirmInput;

export function ResetPasswordConfirmForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(ResetPasswordConfirmInput),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    const res = await confirmPasswordReset(values);
    // Em sucesso, Server Action chama redirect('/dashboard') — nunca chega aqui.
    if (res && !res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) {
          form.setError(field as keyof FormValues, { message: String(message) });
        }
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Atualizando...' : 'Atualizar senha'}
        </Button>
      </form>
    </Form>
  );
}
