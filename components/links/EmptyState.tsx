import { Link2 } from 'lucide-react';

import { AddLinkModal } from '@/components/links/AddLinkModal';
import { Button } from '@/components/ui/button';

// AC8 — DEV-8: ilustração (ícone lucide) + texto + CTA que abre o AddLinkModal.
// Tailwind puro, sem primitivo Card (não existe no design system ainda).
// Extraído da page p/ ser testável em jsdom (a page é RSC async + supabase).
export function EmptyState() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-md border border-border bg-card p-6 text-center">
      <Link2 aria-hidden className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Nenhum link ainda</p>
        <p className="text-sm text-muted-foreground">
          Adicione seu primeiro link para começar a montar sua página.
        </p>
      </div>
      <AddLinkModal trigger={<Button type="button">Adicione seu primeiro link</Button>} />
    </section>
  );
}
