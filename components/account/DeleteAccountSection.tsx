'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { DeleteAccountInput } from '@/lib/validators/account';
import { deleteAccount } from '@/server/account/actions';

// Story 4.5 — Task 5 (AC1+AC3+AC4). AlertDialog (Base UI) + RHF + Zod.
// Confirmação por digitação do username (case-insensitive — DEV-5/5.2 mirror
// do server-side em deleteAccount). Sucesso: toast → router.push('/') →
// router.refresh() (DEV-9/DEV-16: sonner persiste 4s across navigation;
// refresh limpa cache RSC autenticado).

type Props = { username: string };

export function DeleteAccountSection({ username }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(DeleteAccountInput),
    defaultValues: { confirmUsername: '' },
    mode: 'onChange',
  });

  // canSubmit mirror do match server-side: case-insensitive contra username.
  // O server (DEV-5) é a fonte canônica — isso é só UX/defesa em profundidade.
  // useWatch (não form.watch) — compatível com React Compiler (pattern do
  // projeto em SignupForm.tsx + UsernameForm.tsx).
  const confirmValue = useWatch({ control: form.control, name: 'confirmUsername' }) ?? '';
  const canSubmit = confirmValue.trim().toLowerCase() === username.toLowerCase() && !isSubmitting;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset({ confirmUsername: '' });
    }
  }

  async function onSubmit(values: DeleteAccountInput) {
    setIsSubmitting(true);
    const result = await deleteAccount(values);
    if (!result.ok) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }
    // DEV-9 / DEV-16: client controla redirect — toast first, then navigate.
    // Sonner persists across navigation (default 4s).
    toast.success('Conta excluída');
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={<Button type="button" variant="destructive" aria-label="Excluir conta" />}
      >
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Excluir conta
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente e irreversível</strong>. Para confirmar, digite seu
              username <code>@{username}</code> abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <Label htmlFor="confirmUsername" className="sr-only">
              Digite seu username para confirmar
            </Label>
            <Input
              id="confirmUsername"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={username}
              {...form.register('confirmUsername')}
              aria-invalid={form.formState.errors.confirmUsername ? 'true' : 'false'}
            />
            {form.formState.errors.confirmUsername ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.confirmUsername.message}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive" disabled={!canSubmit}>
              {isSubmitting ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
