/**
 * Integration test setup — loads .env.local for local dev runs +
 * polyfills WebSocket for Node < 22.
 *
 * Env loading:
 *   In CI (GitHub Actions), env vars come from `env:` block in the
 *   test-integration job (mapped from GH Secrets). This loader detects
 *   an absent .env.local gracefully and is a no-op in CI.
 *   Variables already present in process.env take precedence — so CI vars
 *   always win over .env.local even if both exist.
 *
 *   Required vars for tests/integration/helpers/test-users.ts:
 *     - NEXT_PUBLIC_SUPABASE_URL
 *     - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *     - SUPABASE_SERVICE_ROLE_KEY
 *
 * WebSocket polyfill:
 *   @supabase/realtime-js (transitive of @supabase/supabase-js) instantiates
 *   a RealtimeClient eagerly in `createClient()`, even if Realtime is never
 *   used. Node < 22 lacks native WebSocket — boot fails with:
 *     "Node.js 20 detected without native WebSocket support."
 *   We polyfill globalThis.WebSocket with `ws` package (devDep). The check
 *   is conditional, so it's a no-op when running on Node 22+ (e.g., local
 *   dev with newer Node) where the native WebSocket already exists.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { WebSocket as NodeWebSocket } from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  // ws's WebSocket is API-compatible with the browser WebSocket interface
  // that Supabase Realtime expects. Cast through `unknown` to silence the
  // slight constructor signature mismatch (TS narrowing); runtime works.
  globalThis.WebSocket = NodeWebSocket as unknown as typeof globalThis.WebSocket;
}

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
