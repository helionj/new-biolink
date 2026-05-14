import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/auth/LogoutButton';
import { EmailVerificationBanner } from '@/components/dashboard/EmailVerificationBanner';
import { createClient } from '@/lib/supabase/server';

// Placeholder Story 1.5 — substituído em Stories 2.x (Links Module) e 3.x (Dashboard Shell).
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Olá, {user.email}</h1>
        <LogoutButton />
      </header>
      <EmailVerificationBanner emailConfirmedAt={user.email_confirmed_at} />
      <section className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Seu dashboard ainda está em construção. Em breve, você poderá configurar sua página pública
        em <code>/@{`{seu-username}`}</code> e adicionar links.
      </section>
    </main>
  );
}
