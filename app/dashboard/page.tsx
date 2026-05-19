import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// Placeholder da aba Links — o CRUD real de links chega na Story 2.5.
// O shell (dashboard/layout.tsx) provê guard, header, banner e o único <main>.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — dashboard/layout.tsx já faz esse guard.
  if (!user) {
    redirect('/login');
  }

  return (
    <section className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
      Seus links aparecerão aqui. O gerenciamento de links está em construção e chega na próxima
      etapa.
    </section>
  );
}
