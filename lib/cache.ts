import { revalidatePath } from 'next/cache';

/**
 * Revalida a superfície de cache do usuário após uma mutation.
 *
 * Toda Server Action que altera `links`/profile/theme/page DEVE chamar este
 * helper ao final (Coding Standards §2398). `revalidatePath` direto de
 * `next/cache` é proibido em feature code — este é o único módulo autorizado a
 * importá-lo (ESLint custom rule planejada na Story 1.1).
 *
 * - `/dashboard` (layout): a UI autenticada do dono sempre é revalidada.
 * - `/@${username}`: a página pública só é revalidada quando há `username` e
 *   `dashboardOnly` não foi pedido. A rota `/@username` só existe a partir da
 *   Story 2.7 — revalidar um path inexistente é no-op seguro no Next.js
 *   (apenas marca o path; nada quebra).
 *
 * @param username Username do dono (para a página pública). `null`/`undefined`
 *   pula a revalidação pública.
 * @param opts.dashboardOnly Quando `true`, revalida apenas `/dashboard`.
 */
export function revalidateUserSurface(
  username: string | null | undefined,
  opts: { dashboardOnly?: boolean } = {},
): void {
  revalidatePath('/dashboard', 'layout');
  if (!opts.dashboardOnly && username) {
    revalidatePath(`/@${username}`);
  }
}
