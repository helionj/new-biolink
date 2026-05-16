import type { NextConfig } from 'next';

import './lib/env';

const nextConfig: NextConfig = {
  // Canary build indicator (Story 1.9 / DP-2, default aprovado pelo PO):
  // timestamp ISO do build + short SHA do commit (Vercel injeta
  // VERCEL_GIT_COMMIT_SHA automaticamente). Inlined em build time;
  // consumido por app/page.tsx no footer (AC5).
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  },
};

export default nextConfig;
