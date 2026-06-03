import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { env } from '@/lib/env';
import { DEFAULT_THEME } from '@/lib/theme';

import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
  weight: 'variable',
});

export const metadata: Metadata = {
  // Resolve URLs relativas de openGraph/twitter (ex: /og-image.png da landing,
  // Story 1.9 AC3) para a URL absoluta de produção. Sem isto, Next assume
  // http://localhost:3000. Reusa NEXT_PUBLIC_SITE_URL (lib/env, validado).
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  // DEV-C ratified user opt-in: PRESERVE PascalCase em metadata.title (SEO
  // title-case convention) + visual wordmark lowercase (Q5 §6 alignment via
  // <Wordmark> component). Split metadata vs visual é convention shipping
  // pattern Story 5.9.
  title: 'BioLink',
  description: 'Plataforma link-in-bio — sua presença digital em um único endereço.',
  // Defense-in-depth: Next 16 auto-detects via `app/icon.tsx` + `app/apple-icon.tsx`
  // mas explicit declaration garante intent + path resolution em edge cases
  // (e.g., bot crawlers que não scan filesystem).
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

// Soft Studio theme color (Story 5.9 Phase 5) — plum primary em light/brand
// + lavender primary em dark (per spec §1.2.1 L26 + §1.2.2 L92 verbatim).
// Tints browser chrome em mobile (Chrome Android status bar; Safari iOS
// tab background); PWA install splash colorido.
// Next 14+ recomenda `viewport` export para themeColor (não em `metadata`).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#5B3A8C' },
    { media: '(prefers-color-scheme: dark)', color: '#B8A1E8' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme={DEFAULT_THEME}
      className={`${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
