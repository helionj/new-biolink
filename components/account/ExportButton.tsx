'use client';

import { Download } from 'lucide-react';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { exportAccountData } from '@/server/account/actions';

// Story 4.5 — Task 4 (AC2). Client Component dispara `exportAccountData` via
// useTransition (DEV-11 — pattern Next 16 RSC; mesmo de AddLinkModal.tsx),
// recebe `AccountExport`, serializa como JSON e força download via Blob +
// <a download> (DEV-7). Filename `biolink-export-{username}-{YYYY-MM-DD}.json`
// (DEV-10): identificável + ordenável + sem hora (privacidade).
export function ExportButton() {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportAccountData();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const json = JSON.stringify(result.data, null, 2); // DEV-10 — pretty-print
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const username = result.data.profile?.username ?? 'user';
      const filename = `biolink-export-${username}-${date}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso');
    });
  }

  return (
    <Button onClick={handleExport} disabled={isPending} variant="outline">
      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      {isPending ? 'Gerando...' : 'Exportar dados'}
    </Button>
  );
}
