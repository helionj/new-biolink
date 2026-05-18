'use client';

import type { UsernameAvailability } from '@/lib/hooks/use-username-availability';
import { cn } from '@/lib/utils';

const MESSAGES: Record<
  Exclude<UsernameAvailability, 'idle'>,
  { text: string; className: string }
> = {
  checking: { text: 'Verificando disponibilidade...', className: 'text-muted-foreground' },
  available: { text: 'Username disponível', className: 'text-foreground' },
  taken: { text: 'Este username já está em uso', className: 'text-destructive' },
};

export function UsernameAvailabilityHint({ status }: { status: UsernameAvailability }) {
  if (status === 'idle') return null;
  const message = MESSAGES[status];
  return (
    <p role="status" aria-live="polite" className={cn('text-sm font-medium', message.className)}>
      {message.text}
    </p>
  );
}
