'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { resendVerificationEmail } from '@/server/auth/actions';

export function ResendEmailButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await resendVerificationEmail();
      if (!res) return;
      if (res.ok) {
        toast.success('Email reenviado. Verifique sua caixa de entrada.');
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Reenviando...' : 'Reenviar email'}
    </Button>
  );
}
