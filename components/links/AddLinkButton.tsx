'use client';

import { Plus } from 'lucide-react';

import { AddLinkModal } from '@/components/links/AddLinkModal';

export function AddLinkButton() {
  return (
    <AddLinkModal
      trigger={
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-transparent px-4 py-4 text-body-sm font-medium text-muted-foreground transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" /> Adicionar link
        </button>
      }
    />
  );
}
