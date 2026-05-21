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
 * Usage: `pnpm check:contrast`
 * Exit 0 quando todos os pares passam; exit 1 em qualquer FAIL.
 */

const PALETTES = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a',
    primary: '#7c3aed',
    'primary-foreground': '#ffffff',
    secondary: '#f1f5f9',
    'secondary-foreground': '#0f172a',
    muted: '#f1f5f9',
    'muted-foreground': '#475569',
    accent: '#ede9fe',
    'accent-foreground': '#4c1d95',
    card: '#ffffff',
    'card-foreground': '#0f172a',
    popover: '#ffffff',
    'popover-foreground': '#0f172a',
    destructive: '#dc2626',
    'destructive-foreground': '#ffffff',
    border: '#e2e8f0',
    ring: '#7c3aed',
  },
  dark: {
    background: '#09090b',
    foreground: '#fafafa',
    primary: '#a78bfa',
    'primary-foreground': '#1e1b4b',
    secondary: '#27272a',
    'secondary-foreground': '#fafafa',
    muted: '#27272a',
    'muted-foreground': '#a1a1aa',
    accent: '#1e1b4b',
    'accent-foreground': '#ede9fe',
    card: '#09090b',
    'card-foreground': '#fafafa',
    popover: '#09090b',
    'popover-foreground': '#fafafa',
    destructive: '#b91c1c',
    'destructive-foreground': '#fafafa',
    border: '#27272a',
    ring: '#a78bfa',
  },
  brand: {
    background: '#faf5ff',
    foreground: '#2e1065',
    primary: '#7c3aed',
    'primary-foreground': '#ffffff',
    secondary: '#ede9fe',
    'secondary-foreground': '#2e1065',
    muted: '#ede9fe',
    'muted-foreground': '#5b21b6',
    accent: '#ddd6fe',
    'accent-foreground': '#2e1065',
    card: '#ffffff',
    'card-foreground': '#2e1065',
    popover: '#ffffff',
    'popover-foreground': '#2e1065',
    destructive: '#b91c1c',
    'destructive-foreground': '#ffffff',
    border: '#c4b5fd',
    ring: '#7c3aed',
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
