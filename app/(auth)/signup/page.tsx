import Link from 'next/link';

import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-h1">Criar conta</h1>
        <p className="text-sm text-muted-foreground">Comece agora — escolha seu @ público.</p>
      </div>
      <SignupForm />
      <p className="text-sm text-center text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
