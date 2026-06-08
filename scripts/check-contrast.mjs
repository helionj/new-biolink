#!/usr/bin/env node
/**
 * WCAG AA contrast checker — Story 3.2 Task 3 + [STORY-3.2-F1] refactor.
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
 * Paletas são EXTRAÍDAS automaticamente de `app/globals.css` via regex
 * parser ([STORY-3.2-F1] 2026-06-08 — elimina duplicação manual prévia).
 * Estrutura esperada: 3 blocos seletores com declarações `--token: #hex;`:
 *   - `:root, [data-theme='light'] { ... }`
 *   - `[data-theme='dark'], .dark { ... }`
 *   - `[data-theme='brand'] { ... }`
 *
 * Drift detection: tokens ausentes em qualquer preset → CRITICAL exit 2
 * (catch de typo ou rename incompleto). Tokens extra em CSS sem par WCAG
 * são silenciosamente ignorados (não-FAIL — extensão futura).
 *
 * Última atualização: [STORY-3.2-F1] refactor (CSS parser automatizado).
 *
 * Usage: `pnpm check:contrast`
 * Exit 0 quando todos os pares passam.
 * Exit 1 em qualquer FAIL de threshold.
 * Exit 2 em CRITICAL (parser failure ou tokens faltantes).
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const GLOBALS_CSS = join(PROJECT_ROOT, 'app', 'globals.css');

/**
 * Theme selector → regex que captura o corpo `{ ... }` do bloco.
 * Multiline + lazy match em `[^}]*` evita capturar blocos seguintes.
 * Order do enumeration preservado para output determinístico.
 */
const THEME_BLOCK_REGEX = {
  light: /:root,\s*\[data-theme='light'\]\s*\{([^}]+)\}/,
  dark: /\[data-theme='dark'\],\s*\.dark\s*\{([^}]+)\}/,
  brand: /\[data-theme='brand'\]\s*\{([^}]+)\}/,
};

/**
 * Pares WCAG verificados — IDENTIDADES estáveis (não cores). Cada par
 * precisa estar presente em todos os 3 presets, com hex 6-char válido.
 */
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

/**
 * Extrai paletas dos 3 blocos seletores de `app/globals.css`.
 * Retorna `{ light: { token: '#HEX' }, dark: {...}, brand: {...} }`.
 *
 * @throws Error se algum bloco não for encontrado (CSS structure drift).
 */
function parsePalettesFromCSS(cssText) {
  const palettes = {};
  for (const [theme, blockRegex] of Object.entries(THEME_BLOCK_REGEX)) {
    const blockMatch = cssText.match(blockRegex);
    if (!blockMatch) {
      throw new Error(
        `CSS parser: bloco "${theme}" não encontrado em globals.css. ` +
          `Regex esperado: ${blockRegex.source}`,
      );
    }
    const tokens = {};
    // Match `--token-name: #aabbcc;` (6-char hex apenas; ignora outros valores
    // como rem/calc/url/var — out of scope contraste WCAG).
    for (const m of blockMatch[1].matchAll(
      /--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g,
    )) {
      tokens[m[1]] = m[2].toUpperCase();
    }
    palettes[theme] = tokens;
  }
  return palettes;
}

/**
 * Verifica que cada par WCAG tem ambos os tokens presentes em todos os
 * presets. Retorna array de strings descrevendo problemas; vazio = OK.
 */
function validateTokenPresence(palettes) {
  const issues = [];
  for (const [theme, palette] of Object.entries(palettes)) {
    for (const [a, b] of PAIRS) {
      if (!palette[a]) issues.push(`${theme}: token "${a}" ausente`);
      if (!palette[b]) issues.push(`${theme}: token "${b}" ausente`);
    }
  }
  return issues;
}

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

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

let cssText;
try {
  cssText = readFileSync(GLOBALS_CSS, 'utf8');
} catch (err) {
  console.error(`❌ CRITICAL: não foi possível ler ${GLOBALS_CSS}`);
  console.error(`   ${err.message}`);
  process.exit(2);
}

let PALETTES;
try {
  PALETTES = parsePalettesFromCSS(cssText);
} catch (err) {
  console.error(`❌ CRITICAL: parser CSS falhou.`);
  console.error(`   ${err.message}`);
  process.exit(2);
}

const presenceIssues = validateTokenPresence(PALETTES);
if (presenceIssues.length > 0) {
  console.error(`❌ CRITICAL: ${presenceIssues.length} token(s) ausente(s):`);
  for (const issue of presenceIssues) console.error(`   - ${issue}`);
  process.exit(2);
}

let totalPass = 0;
let totalChecks = 0;
let anyFail = false;

console.log(`Source: ${GLOBALS_CSS.replace(PROJECT_ROOT + '/', '')}\n`);

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
    console.log(
      `  ${aPad} ↔ ${bPad}: ${ratioStr} ≥ ${threshold.toFixed(1)}  ${verdict}`,
    );
  }
  console.log('');
}

const verdict = anyFail ? 'FAIL' : 'PASS';
console.log(`SUMMARY: ${totalPass}/${totalChecks} pairs ${verdict} (WCAG AA)`);
process.exit(anyFail ? 1 : 0);
