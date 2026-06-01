import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-h1">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta para gerenciar sua página.</p>
      </div>
      {/* Suspense é exigido pelo Next 16 quando o Client Component usa
          useSearchParams() — sem ele, o prerender bail-out falha o build. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
