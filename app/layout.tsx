import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { env } from '@/lib/env';
import { DEFAULT_THEME } from '@/lib/theme';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Resolve URLs relativas de openGraph/twitter (ex: /og-image.png da landing,
  // Story 1.9 AC3) para a URL absoluta de produção. Sem isto, Next assume
  // http://localhost:3000. Reusa NEXT_PUBLIC_SITE_URL (lib/env, validado).
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: 'BioLink',
  description: 'Plataforma link-in-bio — sua presença digital em um único endereço.',
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
