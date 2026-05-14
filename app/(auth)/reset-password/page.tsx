import Link from 'next/link';

import { ResetPasswordRequestForm } from '@/components/auth/ResetPasswordRequestForm';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu email para receber um link de redefinição.
        </p>
      </div>
      <ResetPasswordRequestForm initialError={error} />
      <p className="text-sm text-center text-muted-foreground">
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Voltar para login
        </Link>
      </p>
    </div>
  );
}
