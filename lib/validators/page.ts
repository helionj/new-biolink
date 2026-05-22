import { z } from 'zod';

import { THEMES } from '@/lib/theme';

// Single source of truth para validação do enum `theme_preset` (Story 3.3).
// `THEMES` é `as const satisfies readonly Theme[]` (Story 3.1 `lib/theme.ts`)
// derivado do enum DB; manter `z.enum(THEMES)` aqui propaga novos presets
// automaticamente após `npm run db:types` — zero duplicação literal
// (`['light','dark','brand']` aparece SÓ em `lib/theme.ts` + types.ts gerado).
export const UpdateThemeInput = z.object({
  theme: z.enum(THEMES),
});

export type UpdateThemeInput = z.infer<typeof UpdateThemeInput>;
