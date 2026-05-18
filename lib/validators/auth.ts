import { z } from 'zod';

import { usernameSchema } from '@/lib/validators/profile';

export const SignUpInput = z
  .object({
    email: z.string().email('Informe um email válido'),
    password: z.string().min(8, 'A senha precisa ter no mínimo 8 caracteres'),
    confirmPassword: z.string(),
    username: usernameSchema,
    acceptTerms: z.literal(true, { message: 'Aceite os termos para continuar' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof SignUpInput>;

export const SignInInput = z.object({
  email: z.string().email('Informe um email válido'),
  password: z.string().min(1, 'Informe sua senha'),
});

export type SignInInput = z.infer<typeof SignInInput>;

export const ResetPasswordRequestInput = z.object({
  email: z.string().email('Informe um email válido'),
});

export type ResetPasswordRequestInput = z.infer<typeof ResetPasswordRequestInput>;

export const ResetPasswordConfirmInput = z
  .object({
    newPassword: z.string().min(8, 'A senha precisa ter no mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type ResetPasswordConfirmInput = z.infer<typeof ResetPasswordConfirmInput>;
