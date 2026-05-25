'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LinkRow } from '@/components/links/LinkRow';
import type { Tables } from '@/lib/supabase/types';
import { toast } from '@/lib/toast';
import { reorderLinks } from '@/server/links/actions';

type Link = Tables<'links'>;

// Story 2.6 — container DnD. Estado local otimista; `reorderLinks` (RPC
// `reorder_links` da migration 0005) persiste a nova ordem em 1 transação
// (DEFERRABLE constraint avalia no COMMIT). Em falha → rollback + toast.
export function LinkList({ links: initialLinks }: { links: Link[] }) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);

  // Sensors:
  // - Pointer (mouse/pen): distance:6 evita capturar cliques de edit/toggle/
  //   delete que vivem no mesmo card.
  // - Touch (mobile): delay:200 + tolerance:6 distingue arrasto vertical de
  //   scroll da página.
  // - Keyboard: paridade nativa do dnd-kit (Space/setas/Space) — coexiste com
  //   os botões ↑/↓ explícitos exigidos pela AC4 (DEV-4).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Helper compartilhado (DRY): aplica a nova ordem otimista, chama a Server
  // Action e faz rollback em caso de falha. Reutilizado por onDragEnd e pelo
  // helper move (botões ↑/↓).
  async function persistOrder(nextLinks: Link[]) {
    const snapshot = links;
    setLinks(nextLinks);
    const res = await reorderLinks({ orderedIds: nextLinks.map((l) => l.id) });
    if (!res.ok) {
      setLinks(snapshot);
      toast.error(res.error);
      return;
    }
    toast.success('Ordem atualizada');
    router.refresh();
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    void persistOrder(arrayMove(links, oldIndex, newIndex));
  }

  function onMove(linkId: string, dir: 'up' | 'down') {
    const idx = links.findIndex((l) => l.id === linkId);
    if (idx === -1) return;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= links.length) return;
    void persistOrder(arrayMove(links, idx, target));
  }

  const ids = links.map((l) => l.id);

  return (
    <DndContext id="links-dnd" sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2" aria-label="Seus links">
          {links.map((link, idx) => (
            <LinkRow
              key={link.id}
              link={link}
              onMove={onMove}
              isFirst={idx === 0}
              isLast={idx === links.length - 1}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
