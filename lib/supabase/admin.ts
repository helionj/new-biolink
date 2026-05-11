import { createClient as createAdminClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

export function createAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('admin client cannot be used in the browser');
  }

  return createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
