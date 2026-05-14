'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { signOut } from '@/server/auth/actions';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await signOut();
      if (res && !res.ok) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Saindo...' : 'Sair'}
    </Button>
  );
}
