'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { SignUpInput } from '@/lib/validators/auth';
import { signUp } from '@/server/auth/actions';

type FormValues = SignUpInput;

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(SignUpInput),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      acceptTerms: false as unknown as true,
    },
  });

  const usernameValue = useWatch({ control: form.control, name: 'username' });
  const usernameAvailability = useUsernameAvailability(usernameValue);

  async function onSubmit(values: FormValues) {
    const res = await signUp(values);
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
    // Sucesso: com `mailer_autoconfirm: false` (Story 1.6) signUp não cria
    // session — usuário precisa confirmar email antes. Redireciona para
    // /login com flag de toast.
    router.push('/login?message=verify_email');
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
                <Input type="email" autoComplete="email" placeholder="seu@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="username" placeholder="seu-username" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Seu @ público (3-30 caracteres, a-z, 0-9 e hífen).
              </p>
              <FormMessage />
              <UsernameAvailabilityHint status={usernameAvailability} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar senha</FormLabel>
              <FormControl>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex items-start gap-2 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value === true}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="mt-1 size-4 rounded border-border"
                />
              </FormControl>
              <div className="grid gap-1">
                <FormLabel className="text-sm font-normal">
                  Aceito os termos de uso e a política de privacidade
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Criando...' : 'Criar conta'}
        </Button>
      </form>
    </Form>
  );
}
