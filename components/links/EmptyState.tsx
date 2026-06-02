import { AddLinkButton } from '@/components/links/AddLinkButton';

// Soft Studio refresh (Story 5.5): blob SVG inline (peach → plum gradient) +
// H2 CTA copy + helper text + AddLinkButton dashed wrapper. Extraído da page
// p/ ser testável em jsdom (a page é RSC async + supabase).
export function EmptyState() {
  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-12 text-center">
      <svg viewBox="0 0 200 200" aria-hidden="true" className="h-32 w-32">
        <defs>
          <linearGradient id="empty-blob-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M40,100 Q40,40 100,40 Q160,40 160,100 Q160,160 100,160 Q40,160 40,100 Z"
          fill="url(#empty-blob-gradient)"
          opacity="0.6"
        />
      </svg>
      <div className="space-y-2">
        <p className="text-h2 font-medium">Adicione seu primeiro link →</p>
        <p className="text-body max-w-md text-muted-foreground">
          Seus links aparecerão aqui para o público em /@username. Comece adicionando o primeiro.
        </p>
      </div>
      <AddLinkButton />
    </section>
  );
}
