import { z } from 'zod';

// Single source of truth para validação de link. Espelha o padrão de
// lib/validators/profile.ts (Zod 4, schemas PascalCase com sufixo `Input`,
// `z.infer` types homônimos — arch §2478).
//
// Regras alinhadas VERBATIM ao CHECK do DB (supabase/migrations/0004_links.sql,
// Story 2.3) para falhar no boundary com mensagem tratada em vez de surfacing
// de Postgres 23514 (DEV-2):
//   - title: length BETWEEN 1 AND 100  → trim().min(1).max(100)
//   - url:   url ~* '^https?://'       → regex /^https?:\/\//i (Zod 4 idiom,
//            sem `.url()` deprecado; também rejeita javascript:)
//   - icon:  icon ~ '^[a-z0-9-]{1,40}$' → regex homônimo, opcional (nullable)

const linkTitle = z
  .string()
  .trim()
  .min(1, 'O título é obrigatório')
  .max(100, 'O título deve ter no máximo 100 caracteres');

const linkUrl = z
  .string()
  .trim()
  .regex(/^https?:\/\//i, 'A URL deve começar com http:// ou https://');

const linkIcon = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/, 'Ícone inválido')
  .optional();

const linkId = z.string().uuid('Identificador inválido');

export const CreateLinkInput = z.object({
  title: linkTitle,
  url: linkUrl,
  icon: linkIcon,
});

export type CreateLinkInput = z.infer<typeof CreateLinkInput>;

export const UpdateLinkInput = z.object({
  id: linkId,
  title: linkTitle.optional(),
  url: linkUrl.optional(),
});

export type UpdateLinkInput = z.infer<typeof UpdateLinkInput>;

export const DeleteLinkInput = z.object({
  id: linkId,
});

export type DeleteLinkInput = z.infer<typeof DeleteLinkInput>;

export const ToggleLinkVisibilityInput = z.object({
  id: linkId,
  is_visible: z.boolean(),
});

export type ToggleLinkVisibilityInput = z.infer<typeof ToggleLinkVisibilityInput>;

// Story 2.6 — reorder por drag-and-drop. orderedIds é a nova ordem completa
// dos links da page (1..N). Reusa `linkId` (validação RFC 9562 v4 — links.id
// é sempre gen_random_uuid).
export const ReorderLinksInput = z.object({
  orderedIds: z.array(linkId).min(1, 'Lista vazia'),
});

export type ReorderLinksInput = z.infer<typeof ReorderLinksInput>;
