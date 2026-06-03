import { ImageResponse } from 'next/og';

/**
 * Apple touch icon — Soft Studio Phase 5 (Story 5.9).
 *
 * Dynamic apple-touch-icon route `/apple-icon` via Next 16 `ImageResponse`.
 * Substitui spec §5.5 L1328 `public/apple-icon.png` static binary per DEV-A1.
 *
 * Spec `docs/frontend-spec.md` §1.6 L354 verbatim:
 *   "★ asterisco em peach #FFB5A7 sobre lavender #F4EFFB" (180×180 apple variant)
 *
 * iOS Safari Add to Home Screen consome este endpoint; tamanho 180×180
 * é canonical para retina display. fontSize 120 (~67% canvas) é mais imponente
 * que icon padrão (24/32 em favicon = ~75%) — calibrado para presença iOS home.
 *
 * borderRadius 32 (~18%) é hint para iOS auto-mask rounded corners; iOS
 * sobrescreve com seu próprio mask radius mas explicit value preserva design
 * intent em browsers que não aplicam mask.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4EFFB',
        borderRadius: '32px',
        fontSize: 120,
        color: '#FFB5A7',
        fontWeight: 700,
      }}
    >
      ★
    </div>,
    { ...size },
  );
}
