import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ResetPasswordConfirmForm } from '@/components/auth/ResetPasswordConfirmForm';
import { createClient } from '@/lib/supabase/server';

export default async function ResetPasswordConfirmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/reset-password?error=session_expired');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-h1">Nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </div>
      <ResetPasswordConfirmForm />
      <p className="text-sm text-center text-muted-foreground">
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Voltar para login
        </Link>
      </p>
    </div>
  );
}
