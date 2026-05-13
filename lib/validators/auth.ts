import { z } from 'zod';

import { isReservedUsername } from '@/lib/reserved-usernames';

export const SignUpInput = z
  .object({
    email: z.string().email('Informe um email válido'),
    password: z.string().min(8, 'A senha precisa ter no mínimo 8 caracteres'),
    confirmPassword: z.string(),
    username: z
      .string()
      .regex(/^[a-z0-9-]{3,30}$/, 'Use 3 a 30 caracteres entre a-z, 0-9 e hífen')
      .refine((v) => !isReservedUsername(v), 'Este username é reservado'),
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
