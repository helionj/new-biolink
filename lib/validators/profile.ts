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

// ---------------------------------------------------------------------------
// Avatar upload (Story 3.4)
// ---------------------------------------------------------------------------

// MANTER EM SINCRONIA com supabase/migrations/0006_storage_avatars.sql
// (`allowed_mime_types` do bucket). Drift detectado em code review (precedente
// STORY-3.2-F1 backlog item LOW).
const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1 MB (FR13)
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UploadAvatarInput = z.object({
  file: z
    .instanceof(Blob, { message: 'Arquivo é obrigatório' })
    .refine((b) => b.size > 0, 'Arquivo vazio')
    .refine((b) => b.size <= MAX_AVATAR_SIZE, 'Arquivo deve ter no máximo 1 MB')
    .refine(
      (b) => (ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(b.type),
      'Use jpg, png ou webp',
    ),
});

export type UploadAvatarInput = z.infer<typeof UploadAvatarInput>;
