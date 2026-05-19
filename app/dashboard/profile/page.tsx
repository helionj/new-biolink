import { redirect } from 'next/navigation';

import { UsernameForm } from '@/components/profile/UsernameForm';
import { createClient } from '@/lib/supabase/server';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — dashboard/layout.tsx já faz esse guard.
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Seu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Edite o username da sua página pública em <code>/@{profile?.username ?? ''}</code>.
        </p>
      </header>
      <UsernameForm currentUsername={profile?.username ?? ''} />
    </div>
  );
}
