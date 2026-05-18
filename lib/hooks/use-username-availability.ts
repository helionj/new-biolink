'use client';

import { useEffect, useState } from 'react';

import { usernameSchema } from '@/lib/validators/profile';
import { checkUsernameAvailability } from '@/server/profile/actions';

export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken';

type ResolvedResult = { username: string; status: Exclude<UsernameAvailability, 'checking'> };

/**
 * Checagem live de disponibilidade de username, debounced em 300ms (AC1 / DP-1).
 * Só dispara a Server Action quando o valor passa no `usernameSchema`
 * (formato/tamanho/reservado) — feedback desses casos vem do `<FormMessage />`.
 * `skip` evita checar quando o valor é o próprio username atual (form de troca).
 *
 * O status visível é derivado no render (sem setState síncrono no effect); o
 * effect só agenda o debounce e resolve o resultado no callback assíncrono.
 */
export function useUsernameAvailability(username: string, skip = false): UsernameAvailability {
  const [resolved, setResolved] = useState<ResolvedResult | null>(null);

  const isCheckable = !skip && usernameSchema.safeParse(username).success;

  useEffect(() => {
    if (!isCheckable) return;

    let active = true;
    const handle = setTimeout(async () => {
      const res = await checkUsernameAvailability({ username });
      if (!active) return;
      const status = res.ok ? (res.data.available ? 'available' : 'taken') : 'idle';
      setResolved({ username, status });
    }, 300);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [username, isCheckable]);

  if (!isCheckable) return 'idle';
  if (resolved && resolved.username === username) return resolved.status;
  return 'checking';
}
