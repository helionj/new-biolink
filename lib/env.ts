import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Base URL absoluta consumida por redirectTo de emails Supabase Auth (Story 1.6).
  // Ex: http://localhost:3000 em dev, https://<preview>.vercel.app em preview,
  // https://new-biolink.vercel.app em prod.
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  HASH_SALT: z
    .string()
    .min(32, 'HASH_SALT must be at least 32 hex chars; generate with `openssl rand -hex 32`'),
});

export const env = EnvSchema.parse(process.env);
