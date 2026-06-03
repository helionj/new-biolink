import { ImageResponse } from 'next/og';

/**
 * App icon — Soft Studio Phase 5 (Story 5.9).
 *
 * Dynamic favicon route `/icon` via Next 16 `ImageResponse` (next/og).
 * Substitui spec §5.5 L1327 `public/icon.png` static binary per DEV-A1 ratified
 * (Next 16 convention — `app/icon.tsx` é canonical para framework; static binary
 * generation requires external tool sharp/canvas fora-de-escopo).
 *
 * Spec `docs/frontend-spec.md` §1.6 L354 verbatim:
 *   "★ asterisco em peach #FFB5A7 sobre lavender #F4EFFB, 32×32"
 *
 * DEV-A2: ImageResponse via Satori NÃO suporta CSS custom properties
 * (`var(--accent)` resolveria a string literal, não ao valor). Hex literais
 * inline são spec-verbatim §1.6 L354 + §1.2.1 (`--accent` peach + `--surface`
 * lavender), zero invention (Constitution Art. IV compliant).
 *
 * DEV-A3: `app/favicon.ico` legacy (25931 bytes shipped Next.js init) preserved
 * por convention coexistence — Next 16 auto-prefers `app/icon.tsx` em modern
 * browsers via `<link rel="icon" type="image/png">`, fallback `favicon.ico`
 * em legacy browsers + email clients.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4EFFB',
        borderRadius: '6px',
        fontSize: 24,
        color: '#FFB5A7',
        fontWeight: 700,
      }}
    >
      ★
    </div>,
    { ...size },
  );
}
