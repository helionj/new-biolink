import { redirect } from 'next/navigation';

import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileMetaForm } from '@/components/profile/ProfileMetaForm';
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
    .select('username, display_name, bio, avatar_url')
    .eq('id', user.id)
    .single();

  const username = profile?.username ?? '';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-h1">Seu perfil</h1>
        <p className="text-body text-muted-foreground">
          Edite as informações que aparecem na sua página pública <code>/@{username}</code>.
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-h3 font-medium">Foto</h2>
        <AvatarUpload
          currentAvatarUrl={profile?.avatar_url ?? null}
          displayName={profile?.display_name ?? null}
          username={username}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-h3 font-medium">Identidade</h2>
        <ProfileMetaForm
          currentDisplayName={profile?.display_name ?? null}
          currentBio={profile?.bio ?? null}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-h3 font-medium">URL pública</h2>
        <UsernameForm currentUsername={username} />
      </section>
    </div>
  );
}
