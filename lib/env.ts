import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  HASH_SALT: z
    .string()
    .min(32, 'HASH_SALT must be at least 32 hex chars; generate with `openssl rand -hex 32`'),
});

export const env = EnvSchema.parse(process.env);
