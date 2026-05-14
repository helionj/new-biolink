import Link from 'next/link';
import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta para gerenciar sua página.</p>
      </div>
      {/* Suspense é exigido pelo Next 16 quando o Client Component usa
          useSearchParams() — sem ele, o prerender bail-out falha o build. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-center text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
