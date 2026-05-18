import { z } from 'zod';

import { isReservedUsername } from '@/lib/reserved-usernames';

// Single source of truth para validação de username (DP-3 / arch §148).
// Composto em SignUpInput (lib/validators/auth.ts) e usado por
// updateUsername / checkUsernameAvailability (server/profile/actions.ts).
export const usernameSchema = z
  .string()
  .regex(/^[a-z0-9-]{3,30}$/, 'Use 3 a 30 caracteres entre a-z, 0-9 e hífen')
  .refine((v) => !isReservedUsername(v), 'Este username é reservado');

export const UpdateUsernameInput = z.object({
  username: usernameSchema,
});

export type UpdateUsernameInput = z.infer<typeof UpdateUsernameInput>;

export const CheckUsernameInput = z.object({
  username: usernameSchema,
});

export type CheckUsernameInput = z.infer<typeof CheckUsernameInput>;
