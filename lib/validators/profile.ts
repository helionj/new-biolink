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

// ---------------------------------------------------------------------------
// Profile metadata (Story 5.1) — FR13
// ---------------------------------------------------------------------------
// display_name TEXT nullable, length <= 50 (0002_profiles.sql:68 CHECK).
// bio          TEXT nullable, length <= 280 (0002_profiles.sql:69 CHECK).
//
// DEV-8 (deviation do snippet original da story): mantemos o schema SEM
// `.transform` para preservar `Input === Output` — o shim shadcn `FormField`
// (components/ui/form.tsx) tipa o Controller como `Control<TFieldValues, any,
// TFieldValues>` (sem 3º generic), e RHF 7.75 + @hookform/resolvers 5 rejeitam
// `useForm<TInput, _, TOutput>` quando os tipos divergem. A normalização
// `'' | undefined -> null` (DEV-2, necessária para `display_name ?? '@username'`
// em components/public/PublicPage.tsx:34) é movida para a Server Action
// `updateProfileMeta`, com efeito funcional idêntico.
export const UpdateProfileMetaInput = z.object({
  display_name: z
    .string()
    .trim()
    .max(50, 'Nome de exibição deve ter no máximo 50 caracteres')
    .optional(),
  bio: z.string().trim().max(280, 'Bio deve ter no máximo 280 caracteres').optional(),
});

export type UpdateProfileMetaInput = z.infer<typeof UpdateProfileMetaInput>;
