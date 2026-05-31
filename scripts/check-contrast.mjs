#!/usr/bin/env node
/**
 * WCAG AA contrast checker — Story 3.2 Task 3.
 *
 * Verifica `(L1 + 0.05) / (L2 + 0.05) >= threshold` para 9 pares de tokens
 * em cada um dos 3 presets (light/dark/brand) — 27 checks totais. Algoritmo
 * de luminância relativa do W3C (WCAG 2.1):
 *
 *   L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 *
 * onde cada canal sRGB é normalizado (0-1) e linearizado.
 *
 * Thresholds (WCAG 2.1 Level AA):
 *   - Texto normal (< 18pt): 4.5:1
 *   - Componentes UI grandes (WCAG 1.4.11): 3.0:1
 *
 * DEV-5 (Story 3.2): o par `background ↔ ring` (focus indicator) é o que
 * realmente recai sob WCAG 1.4.11 — borders decorativas de cards (`--border`)
 * NÃO se qualificam ("componentes UI grandes" do PRD L114 = elementos
 * funcionais como inputs/focus ring; cards são identificados por conteúdo).
 * O ring é também o componente exigido por WCAG 2.4.7 (focus visible).
 *
 * MANTER EM SINCRONIA com `app/globals.css` — qualquer mudança de paleta
 * requer atualização aqui. Future work: parser CSS automatizado
 * ([STORY-3.2-F1] em docs/STORY-BACKLOG.md).
 *
 * Última atualização: Story 3.2 Task 3 (criação) + Story 5.2 (Soft Studio swap):
 *   deep plum #5B3A8C + peach #FFB5A7 + lavender mist #FAF8FF —
 *   verbatim de docs/frontend-spec.md §1.2.1, §1.2.2, §1.2.3.
 *
 * Usage: `pnpm check:contrast`
 * Exit 0 quando todos os pares passam; exit 1 em qualquer FAIL.
 */

const PALETTES = {
  light: {
    background: '#FAF8FF',
    foreground: '#1B1530',
    primary: '#5B3A8C',
    'primary-foreground': '#FFFFFF',
    secondary: '#F4EFFB',
    'secondary-foreground': '#1B1530',
    muted: '#EFEAF7',
    'muted-foreground': '#6B5B95',
    accent: '#FFB5A7',
    'accent-foreground': '#7A2C1F',
    card: '#FFFFFF',
    'card-foreground': '#1B1530',
    popover: '#FFFFFF',
    'popover-foreground': '#1B1530',
    destructive: '#C84141',
    'destructive-foreground': '#FFFFFF',
    border: '#E6E0F8',
    ring: '#5B3A8C',
  },
  dark: {
    background: '#14102A',
    foreground: '#F4EFFB',
    primary: '#B8A1E8',
    'primary-foreground': '#14102A',
    secondary: '#1F1838',
    'secondary-foreground': '#F4EFFB',
    muted: '#251D40',
    'muted-foreground': '#B8A8D8',
    accent: '#FF9B8A',
    'accent-foreground': '#3A0F08',
    card: '#2A2244',
    'card-foreground': '#F4EFFB',
    popover: '#2A2244',
    'popover-foreground': '#F4EFFB',
    destructive: '#FF7878',
    'destructive-foreground': '#14102A',
    border: '#2A2244',
    ring: '#B8A1E8',
  },
  brand: {
    background: '#F0E8FF',
    foreground: '#1B1530',
    primary: '#5B3A8C',
    'primary-foreground': '#FFFFFF',
    secondary: '#FFFFFF',
    'secondary-foreground': '#1B1530',
    muted: '#D9CCEF',
    'muted-foreground': '#4A3A6B',
    accent: '#FFB5A7',
    'accent-foreground': '#7A2C1F',
    card: '#FFFFFF',
    'card-foreground': '#1B1530',
    popover: '#FFFFFF',
    'popover-foreground': '#1B1530',
    destructive: '#C84141',
    'destructive-foreground': '#FFFFFF',
    border: '#D9CCEF',
    ring: '#5B3A8C',
  },
};

const PAIRS = [
  ['background', 'foreground', 4.5],
  ['primary', 'primary-foreground', 4.5],
  ['muted', 'muted-foreground', 4.5],
  ['card', 'card-foreground', 4.5],
  ['popover', 'popover-foreground', 4.5],
  ['secondary', 'secondary-foreground', 4.5],
  ['accent', 'accent-foreground', 4.5],
  ['destructive', 'destructive-foreground', 4.5],
  ['background', 'ring', 3.0],
];

function hexToChannels(hex) {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
}

function srgbToLinear(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToChannels(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const La = relativeLuminance(hexA);
  const Lb = relativeLuminance(hexB);
  const [hi, lo] = La > Lb ? [La, Lb] : [Lb, La];
  return (hi + 0.05) / (lo + 0.05);
}

let totalPass = 0;
let totalChecks = 0;
let anyFail = false;

for (const [theme, palette] of Object.entries(PALETTES)) {
  console.log(`Theme: ${theme}`);
  for (const [a, b, threshold] of PAIRS) {
    const ratio = contrastRatio(palette[a], palette[b]);
    totalChecks++;
    const pass = ratio >= threshold;
    if (pass) totalPass++;
    else anyFail = true;
    const aPad = a.padEnd(11);
    const bPad = b.padEnd(22);
    const ratioStr = ratio.toFixed(2).padStart(5);
    const verdict = pass ? 'PASS' : 'FAIL';
    console.log(`  ${aPad} ↔ ${bPad}: ${ratioStr} ≥ ${threshold.toFixed(1)}  ${verdict}`);
  }
  console.log('');
}

const verdict = anyFail ? 'FAIL' : 'PASS';
console.log(`SUMMARY: ${totalPass}/${totalChecks} pairs ${verdict} (WCAG AA)`);
process.exit(anyFail ? 1 : 0);
