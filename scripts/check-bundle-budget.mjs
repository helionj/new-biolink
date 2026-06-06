#!/usr/bin/env node
/**
 * scripts/check-bundle-budget.mjs
 *
 * Mede First Load JS gzipped de rotas públicas pós-build e alerta quando
 * margem para threshold AC3 (200 KB) cai abaixo do warning margin.
 *
 * Reproduz metodologia DEV-1 da Story 3.5 (docs/a11y-audit.md §1) adaptada
 * para Next 16 + Turbopack:
 *   1. Lê .next/build-manifest.json → rootMainFiles + polyfillFiles = SHARED
 *   2. Para cada rota pública:
 *      a. Lê .next/server/app/{route}/page_client-reference-manifest.js
 *      b. Extrai __RSC_MANIFEST → entryJSFiles (chunks de entrypoints INITIAL load)
 *   3. FIRST_LOAD = unique(SHARED ∪ ROUTE_ENTRY_CHUNKS), gzip-9 cada, soma bytes
 *
 * Nota: entryJSFiles captura apenas o INITIAL load (page + layouts adjacentes).
 *       Módulos lazy/dynamic ficam em clientModules.*.chunks (out-of-scope AC3).
 *
 * Threshold AC3: First Load JS público < 200 KB gzipped.
 * Warning margin: < 5 KB livres → considerar abrir story de mitigação.
 *
 * Usage:
 *   pnpm build
 *   pnpm bundle-budget [--strict]
 *
 * Exit codes:
 *   0 → todas rotas dentro do budget (mesmo com warnings advisory)
 *   1 → 1+ rota excede threshold em strict mode
 *   2 → .next/ não existe ou build inválido
 *
 * Reference:
 *   - [STORY-3.5-F1] backlog item (monitor margem apertada)
 *   - docs/a11y-audit.md §1 (metodologia DEV-1 original)
 *   - TEST-001 Story 4.1 workaround: per-build single-build measurement
 *     (sem cross-build comparison, evita Turbopack chunk-name hashing drift)
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const NEXT_DIR = join(PROJECT_ROOT, '.next');

// Threshold AC3/NFR4 (PRD v0.6 2026-06-06 amend: 200 → 210 KB) + warning margin
const BUDGET_KB = 210;
const WARNING_MARGIN_KB = 5;

/**
 * Public routes sujeitas a AC3.
 *
 * `routeKey` = chave do __RSC_MANIFEST (ex: "/page", "/[username]/page")
 * `manifestFile` = caminho relativo a .next/server/app/
 */
const PUBLIC_ROUTES = [
  {
    display: '/',
    routeKey: '/page',
    manifestFile: 'page_client-reference-manifest.js',
  },
  {
    display: '/[username]',
    routeKey: '/[username]/page',
    manifestFile: '[username]/page_client-reference-manifest.js',
  },
];

const STRICT = process.argv.includes('--strict');

function gzipBytes(filePath) {
  if (!existsSync(filePath)) return 0;
  return gzipSync(readFileSync(filePath), { level: 9 }).length;
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(2);
}

function extractRscManifest(jsFilePath, routeKey) {
  const content = readFileSync(jsFilePath, 'utf8');
  const keyEscaped = routeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `globalThis\\.__RSC_MANIFEST\\["${keyEscaped}"\\]\\s*=\\s*(\\{[\\s\\S]*\\});?\\s*$`,
    'm'
  );
  const match = content.match(re);
  if (!match) {
    throw new Error(
      `Não foi possível extrair __RSC_MANIFEST["${routeKey}"] de ${jsFilePath}`
    );
  }
  return JSON.parse(match[1]);
}

function collectRouteChunks(manifest) {
  const chunks = new Set();
  // entryJSFiles = chunks de entrypoints INITIAL (page + layout + not-found etc.)
  // Equivalente conceitual ao First Load JS do Next webpack legacy.
  // Fallback para clientModules.*.chunks se entryJSFiles ausente (compat older).
  const entryJSFiles = manifest.entryJSFiles ?? null;
  if (entryJSFiles) {
    for (const entry of Object.values(entryJSFiles)) {
      for (const chunk of entry) {
        const normalized = chunk.startsWith('/_next/')
          ? chunk.slice('/_next/'.length)
          : chunk;
        chunks.add(normalized);
      }
    }
  } else {
    const clientModules = manifest.clientModules ?? {};
    for (const mod of Object.values(clientModules)) {
      for (const chunk of mod.chunks ?? []) {
        const normalized = chunk.startsWith('/_next/')
          ? chunk.slice('/_next/'.length)
          : chunk;
        chunks.add(normalized);
      }
    }
  }
  return chunks;
}

function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error('❌ .next/ não existe. Execute `pnpm build` primeiro.');
    process.exit(2);
  }

  const buildManifestPath = join(NEXT_DIR, 'build-manifest.json');
  if (!existsSync(buildManifestPath)) {
    console.error('❌ .next/build-manifest.json não existe. Build inválido?');
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(buildManifestPath, 'utf8'));
  const sharedChunks = new Set([
    ...(manifest.rootMainFiles ?? []),
    ...(manifest.polyfillFiles ?? []),
  ]);

  // Compute shared baseline
  let sharedBytes = 0;
  for (const file of sharedChunks) {
    sharedBytes += gzipBytes(join(NEXT_DIR, file));
  }

  console.log('━'.repeat(64));
  console.log('Bundle Budget Report (post-build) — AC3 public routes');
  console.log('━'.repeat(64));
  console.log(
    `Shared baseline:    ${fmtKB(sharedBytes).padStart(7)} KB gz  (${sharedChunks.size} chunks)`
  );
  console.log(
    `Budget threshold:   ${BUDGET_KB.toFixed(2).padStart(7)} KB gz  (AC3: < ${BUDGET_KB} KB)`
  );
  console.log(
    `Warning margin:     ${WARNING_MARGIN_KB.toFixed(2).padStart(7)} KB gz`
  );
  console.log(
    `Mode:               ${STRICT ? 'strict (fail on threshold breach)' : 'advisory (warn only)'}`
  );
  console.log('━'.repeat(64));

  let warningCount = 0;
  let failureCount = 0;

  for (const route of PUBLIC_ROUTES) {
    const manifestPath = join(NEXT_DIR, 'server', 'app', route.manifestFile);
    if (!existsSync(manifestPath)) {
      console.warn(
        `⚠ ${route.display.padEnd(15)} → manifest não encontrado: ${manifestPath}`
      );
      continue;
    }

    let rscManifest;
    try {
      rscManifest = extractRscManifest(manifestPath, route.routeKey);
    } catch (err) {
      console.warn(
        `⚠ ${route.display.padEnd(15)} → erro ao parsear manifest: ${err.message}`
      );
      continue;
    }

    const routeChunks = collectRouteChunks(rscManifest);
    const allChunks = new Set([...sharedChunks, ...routeChunks]);

    let firstLoadBytes = 0;
    let chunksFound = 0;
    let chunksMissing = 0;
    for (const file of allChunks) {
      const filePath = join(NEXT_DIR, file);
      if (existsSync(filePath)) {
        firstLoadBytes += gzipBytes(filePath);
        chunksFound++;
      } else {
        chunksMissing++;
      }
    }

    const firstLoadKB = firstLoadBytes / 1024;
    const marginKB = BUDGET_KB - firstLoadKB;

    let status = '✓ PASS';
    if (firstLoadKB >= BUDGET_KB) {
      status = '✗ FAIL';
      failureCount++;
    } else if (marginKB < WARNING_MARGIN_KB) {
      status = '⚠ WARN';
      warningCount++;
    }

    const missing =
      chunksMissing > 0 ? `  (${chunksMissing} chunk(s) missing)` : '';
    console.log(
      `${status}  ${route.display.padEnd(15)} → ${fmtKB(firstLoadBytes).padStart(7)} KB gz` +
        `  (margem ${marginKB.toFixed(2).padStart(6)} KB)` +
        `  [${chunksFound} chunks]${missing}`
    );
  }

  console.log('━'.repeat(64));

  if (failureCount > 0) {
    if (STRICT) {
      console.log(
        `❌ ${failureCount} rota(s) excedem threshold ${BUDGET_KB} KB — strict mode bloqueia.`
      );
    } else {
      console.log(
        `❌ ${failureCount} rota(s) excedem threshold ${BUDGET_KB} KB (advisory).`
      );
      console.log(
        `  Lighthouse CI (.github/workflows/lighthouse.yml) permanece gate de produção via score ≥ 0.85.`
      );
      console.log(
        `  Recomendação: abrir story de mitigação (RSC isolation, code-split, dep replacement).`
      );
    }
    process.exit(STRICT ? 1 : 0);
  }
  if (warningCount > 0) {
    console.log(
      `⚠ ${warningCount} rota(s) com margem < ${WARNING_MARGIN_KB} KB — monitorar.`
    );
    console.log(
      `  Considerar abrir story de mitigação se margem continuar caindo.`
    );
    process.exit(0);
  }
  console.log(`✓ Todas as rotas públicas dentro do budget com margem suficiente.`);
  process.exit(0);
}

main();
