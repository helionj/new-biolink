'use server';

import { redirect } from 'next/navigation';

import type { ActionResult } from '@/lib/result';
import { createClient } from '@/lib/supabase/server';
import { SignInInput, SignUpInput } from '@/lib/validators/auth';

function flattenFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const out: Record<string, string> = {};
  const flat = error.flatten().fieldErrors;
  for (const [field, messages] of Object.entries(flat)) {
    const first = messages?.[0];
    if (first) out[field] = first;
  }
  return out;
}

export async function signUp(raw: unknown): Promise<ActionResult<void>> {
  const parsed = SignUpInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Entrada inválida',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const { email, password, username } = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: 'Este username já está em uso',
      fieldErrors: { username: 'Este username já está em uso' },
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    const message = error.message ?? '';
    if (/already registered|already exists/i.test(message)) {
      return {
        ok: false,
        error: 'Este email já está cadastrado',
        fieldErrors: { email: 'Este email já está cadastrado' },
      };
    }
    if (/23505|duplicate key/i.test(message)) {
      return {
        ok: false,
        error: 'Este username já está em uso',
        fieldErrors: { username: 'Este username já está em uso' },
      };
    }
    return { ok: false, error: 'Erro ao criar conta. Tente novamente' };
  }

  redirect('/dashboard');
}

export async function signIn(raw: unknown): Promise<ActionResult<void>> {
  const parsed = SignInInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Entrada inválida',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: 'Email ou senha incorretos' };
  }

  redirect('/dashboard');
}

export async function signOut(): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, error: 'Erro ao sair. Tente novamente' };
  }
  redirect('/');
}
