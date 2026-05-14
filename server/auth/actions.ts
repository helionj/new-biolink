'use server';

import { redirect } from 'next/navigation';

import { env } from '@/lib/env';
import type { ActionResult } from '@/lib/result';
import { createClient } from '@/lib/supabase/server';
import {
  ResetPasswordConfirmInput,
  ResetPasswordRequestInput,
  SignInInput,
  SignUpInput,
} from '@/lib/validators/auth';

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

  // Com `mailer_autoconfirm: false` (Story 1.6), signUp retorna `session: null`
  // — usuário precisa clicar no link do email antes de ter session ativa.
  // Form do signup faz router.push('/login?message=verify_email') client-side
  // exibindo toast PT-BR no /login.
  return { ok: true, data: undefined };
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

export async function requestPasswordReset(raw: unknown): Promise<ActionResult<void>> {
  const parsed = ResetPasswordRequestInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Entrada inválida',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password/confirm`,
  });

  // Anti-enumeration (arch §Security linha 2147): sempre sucesso ao client.
  // Log server-side para investigação interna de anomalias.
  if (error) {
    console.error('[requestPasswordReset] supabase error:', error.message);
  }
  return { ok: true, data: undefined };
}

export async function confirmPasswordReset(raw: unknown): Promise<ActionResult<void>> {
  const parsed = ResetPasswordConfirmInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Entrada inválida',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — a Server Component da page também faz esse check.
  if (!user) {
    return {
      ok: false,
      error: 'Sessão expirada. Solicite um novo link de redefinição.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    const message = error.message ?? '';
    if (/same.?password|new.?password/i.test(message)) {
      return { ok: false, error: 'A nova senha deve ser diferente da anterior' };
    }
    return { ok: false, error: 'Erro ao atualizar senha. Tente novamente' };
  }

  redirect('/dashboard');
}

export async function resendVerificationEmail(): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Não autenticado' };
  }

  // No-op UX-friendly: email já confirmado, nada a fazer.
  if (user.email_confirmed_at) {
    return { ok: true, data: undefined };
  }

  const email = user.email;
  if (!email) {
    return { ok: false, error: 'Usuário sem email cadastrado' };
  }

  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) {
    const message = error.message ?? '';
    if (/rate.?limit|over_email_send_rate_limit|429/i.test(message)) {
      return { ok: false, error: 'Aguarde um minuto antes de reenviar' };
    }
    return { ok: false, error: 'Erro ao reenviar email. Tente novamente' };
  }

  return { ok: true, data: undefined };
}
