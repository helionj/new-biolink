/**
 * Integration test setup — loads .env.local for local dev runs.
 *
 * In CI (GitHub Actions), env vars come from `env:` block in the
 * test-integration job (mapped from GH Secrets). This loader detects
 * an absent .env.local gracefully and is a no-op in CI.
 *
 * Variables already present in process.env take precedence — so CI vars
 * always win over .env.local even if both exist.
 *
 * Required vars for tests/integration/helpers/test-users.ts:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_LOCAL_PATH = resolve(process.cwd(), '.env.local');

if (existsSync(ENV_LOCAL_PATH)) {
  const content = readFileSync(ENV_LOCAL_PATH, 'utf-8');
  const lineRe = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(lineRe);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (key === undefined || rawValue === undefined) continue;
    if (process.env[key] !== undefined) continue; // CI wins

    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}
