import { redirect } from 'next/navigation';

import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';
import { ExportButton } from '@/components/account/ExportButton';
import { createClient } from '@/lib/supabase/server';

// Story 4.5 — Task 2 (AC1). Server Component leve (apenas 1 query —
// profiles.username — para alimentar o context da modal de delete).
// Auth guard é defense-in-depth: middleware (Story 1.7) + dashboard/layout.tsx
// (Story 2.4) já garantem que rotas /dashboard/* exigem sessão.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  // Edge case — trigger auth_user_created (Story 1.4) garante 1:1 profile/user,
  // mas se algum dia faltar a row, redireciona para login (UI quebraria sem o
  // username de confirmação).
  if (!profile?.username) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-h1">Conta</h1>
        <p className="text-body text-muted-foreground">
          Gerencie seus dados pessoais — exporte tudo em JSON ou exclua sua conta permanentemente.
        </p>
      </header>

      <section
        aria-labelledby="export-heading"
        className="space-y-3 rounded-xl border border-border bg-card p-6"
      >
        <h2 id="export-heading" className="text-h3 font-medium">
          Exportar dados
        </h2>
        <p className="text-body text-muted-foreground">
          Baixe um JSON com seu perfil, página, links e analytics (LGPD-mindful — pseudonimização
          preservada).
        </p>
        <ExportButton />
      </section>

      <section
        aria-labelledby="delete-heading"
        className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
      >
        <h2 id="delete-heading" className="text-h3 font-medium text-destructive">
          Excluir conta
        </h2>
        <p className="text-body text-muted-foreground">
          Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados serão apagados
          imediatamente — perfil, página pública, links, cliques registrados e visualizações.
        </p>
        <DeleteAccountSection username={profile.username} />
      </section>
    </div>
  );
}
