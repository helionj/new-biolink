import { LinkRow } from '@/components/links/LinkRow';
import type { Tables } from '@/lib/supabase/types';

type Link = Tables<'links'>;

// Lista simples ordenada por position (já vem ordenada do RSC). Sem drag-drop
// — reorder é Story 2.6 (DEV-7).
export function LinkList({ links }: { links: Link[] }) {
  return (
    <ul className="space-y-2" aria-label="Seus links">
      {links.map((link) => (
        <LinkRow key={link.id} link={link} />
      ))}
    </ul>
  );
}
