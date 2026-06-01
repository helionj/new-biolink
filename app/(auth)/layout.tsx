import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-sm">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← voltar
          </Link>
          <Link href="/" className="text-h3 lowercase">
            biolink
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
