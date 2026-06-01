'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

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
import { toast } from '@/lib/toast';
import { ResetPasswordRequestInput } from '@/lib/validators/auth';
import { requestPasswordReset } from '@/server/auth/actions';

type FormValues = ResetPasswordRequestInput;

const INITIAL_ERROR_TOASTS: Record<string, string> = {
  session_expired: 'Sessão expirada. Solicite um novo link de redefinição.',
};

interface Props {
  initialError?: string | undefined;
}

export function ResetPasswordRequestForm({ initialError }: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (initialError && INITIAL_ERROR_TOASTS[initialError]) {
      toast.error(INITIAL_ERROR_TOASTS[initialError]);
      firedRef.current = true;
    }
  }, [initialError]);

  const form = useForm<FormValues>({
    resolver: zodResolver(ResetPasswordRequestInput),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    const res = await requestPasswordReset(values);
    if (!res) return;
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) {
          form.setError(field as keyof FormValues, { message: String(message) });
        }
      }
      return;
    }
    toast.success(
      'Se este email estiver cadastrado, você receberá um link para redefinir sua senha em alguns minutos.',
    );
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="h-12"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 w-full">
          {form.formState.isSubmitting ? 'Enviando...' : 'Enviar link'}
        </Button>
      </form>
    </Form>
  );
}
