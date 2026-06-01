'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { Button, buttonVariants } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { SignInInput } from '@/lib/validators/auth';
import { signIn } from '@/server/auth/actions';

type FormValues = SignInInput;

const ERROR_TOASTS: Record<string, string> = {
  auth_callback_failed: 'Não foi possível confirmar o link. Solicite um novo email.',
  session_expired: 'Sessão expirada. Solicite um novo link de redefinição.',
};

const MESSAGE_TOASTS: Record<string, string> = {
  verify_email: 'Conta criada! Confirme seu email para fazer login.',
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get('error');
  const messageKey = searchParams.get('message');
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (errorKey && ERROR_TOASTS[errorKey]) {
      toast.error(ERROR_TOASTS[errorKey]);
      firedRef.current = true;
      return;
    }
    if (messageKey && MESSAGE_TOASTS[messageKey]) {
      toast.success(MESSAGE_TOASTS[messageKey]);
      firedRef.current = true;
    }
  }, [errorKey, messageKey]);

  const form = useForm<FormValues>({
    resolver: zodResolver(SignInInput),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    const res = await signIn(values);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  className="h-12"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Link
          href="/reset-password"
          className="self-end text-sm text-muted-foreground hover:text-foreground"
        >
          Esqueci a senha →
        </Link>
        <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 w-full">
          {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
        <div className="my-2 flex items-center gap-2">
          <hr className="flex-1 border-border" />
          <span className="text-caption text-muted-foreground">ou</span>
          <hr className="flex-1 border-border" />
        </div>
        <Link href="/signup" className={cn(buttonVariants({ variant: 'ghost' }), 'h-12 w-full')}>
          Criar conta →
        </Link>
      </form>
    </Form>
  );
}
