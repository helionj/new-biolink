import { z } from 'zod';

// Story 4.5 — Task 1 (AC3). Schema mínimo de pre-flight para `deleteAccount`:
// apenas garante que o input não é vazio. O match real (case-insensitive
// contra `profile.username`, que é `citext` — 0002_profiles.sql:66) é
// server-side em `server/account/actions.ts:deleteAccount` (DEV-5/DEV-8).
// Não reutilizar `usernameSchema` de `profile.ts` — atacantes podem mandar
// qualquer string e o servidor responde com erro genérico mesmo assim.
export const DeleteAccountInput = z.object({
  confirmUsername: z.string().min(1, 'Digite seu username para confirmar'),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountInput>;
