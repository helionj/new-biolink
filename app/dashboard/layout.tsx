import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { EmailVerificationBanner } from '@/components/dashboard/EmailVerificationBanner';
import { MobileDrawer } from '@/components/dashboard/MobileDrawer';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { UserMenu } from '@/components/dashboard/UserMenu';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <MobileDrawer />
          <div className="ml-auto">
            <UserMenu
              username={profile?.username ?? ''}
              displayName={profile?.display_name ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              siteUrl={env.NEXT_PUBLIC_SITE_URL}
            />
          </div>
        </header>
        <main className="flex-1 space-y-6 px-4 py-6">
          <EmailVerificationBanner emailConfirmedAt={user.email_confirmed_at} />
          {children}
        </main>
      </div>
    </div>
  );
}
