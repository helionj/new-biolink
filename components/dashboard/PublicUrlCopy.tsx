'use client';

import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

interface Props {
  username: string;
  siteUrl: string;
}

export function PublicUrlCopy({ username, siteUrl }: Props) {
  const url = username ? `${siteUrl}/@${username}` : `${siteUrl}/@`;

  async function handleCopy() {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL pública copiada');
    } catch {
      toast.error('Não foi possível copiar a URL');
    }
  }

  return (
    <div className="text-body text-muted-foreground flex items-center gap-2">
      <span className="font-mono text-sm">{url}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Copiar URL pública"
        onClick={handleCopy}
        disabled={!username}
      >
        <Copy className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
