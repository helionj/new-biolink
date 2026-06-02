'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createElement, useState } from 'react';

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
import { Switch } from '@/components/ui/switch';
import { getLinkIcon } from '@/lib/link-icons';
import type { Tables } from '@/lib/supabase/types';
import { toast } from '@/lib/toast';
import { deleteLink, toggleLinkVisibility, updateLink } from '@/server/links/actions';

type Link = Tables<'links'>;

// Props novas opcionais (default no-op) preservam compatibilidade dos testes
// existentes que renderizam <LinkRow> isolado (sem DndContext / sem LinkList).
interface LinkRowProps {
  link: Link;
  onMove?: (linkId: string, dir: 'up' | 'down') => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function LinkRow({ link, onMove, isFirst = false, isLast = false }: LinkRowProps) {
  const router = useRouter();

  // useSortable funciona dentro de um SortableContext (LinkList) — fora dele,
  // os hooks degradam para um no-op (sem transform/listeners ativos), o que
  // permite o uso isolado em testes/storybook.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [visible, setVisible] = useState(link.is_visible);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [titleDraft, setTitleDraft] = useState(link.title);
  const [urlDraft, setUrlDraft] = useState(link.url);

  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function commitTitle() {
    setEditingTitle(false);
    const next = titleDraft.trim();
    if (!next || next === title) {
      setTitleDraft(title);
      return;
    }
    setPending(true);
    const res = await updateLink({ id: link.id, title: next });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      setTitleDraft(title);
      return;
    }
    setTitle(res.data.title);
    setTitleDraft(res.data.title);
    toast.success('Link atualizado');
    router.refresh();
  }

  async function commitUrl() {
    setEditingUrl(false);
    const next = urlDraft.trim();
    if (!next || next === url) {
      setUrlDraft(url);
      return;
    }
    setPending(true);
    const res = await updateLink({ id: link.id, url: next });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      setUrlDraft(url);
      return;
    }
    setUrl(res.data.url);
    setUrlDraft(res.data.url);
    toast.success('Link atualizado');
    router.refresh();
  }

  // Persistência otimista (arch §1141): aplica a UI imediatamente e reverte se
  // a Server Action falhar.
  async function onToggleVisibility(nextVisible: boolean) {
    setVisible(nextVisible);
    const res = await toggleLinkVisibility({ id: link.id, is_visible: nextVisible });
    if (!res.ok) {
      setVisible(!nextVisible);
      toast.error(res.error);
      return;
    }
    toast.success(nextVisible ? 'Link visível' : 'Link oculto');
  }

  async function onConfirmDelete() {
    setPending(true);
    const res = await deleteLink({ id: link.id });
    setPending(false);
    setConfirmOpen(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Link excluído');
    router.refresh();
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-foreground/5 transition-shadow hover:shadow-md"
    >
      {/* AC1 — handle de drag dedicado (NÃO o <li> inteiro) p/ não interceptar
          cliques de edit/toggle/delete. `touch-none` previne scroll-vs-drag em
          mobile. Ícone GripVertical = glyph ⋮⋮ (lucide, sem marca). */}
      <button
        type="button"
        aria-label="Reordenar link"
        className="-ml-1 touch-none cursor-grab text-muted-foreground transition-opacity hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="size-4" />
      </button>

      {createElement(getLinkIcon(link.icon), {
        'aria-hidden': true,
        className: 'size-5 shrink-0 text-muted-foreground',
      })}

      <div className="min-w-0 flex-1 space-y-1">
        {editingTitle ? (
          <Input
            aria-label="Título do link"
            autoFocus
            value={titleDraft}
            disabled={pending}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitTitle();
              }
              if (e.key === 'Escape') {
                setTitleDraft(title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="block max-w-full truncate text-left text-sm font-medium hover:underline"
            onClick={() => {
              setTitleDraft(title);
              setEditingTitle(true);
            }}
          >
            {title}
          </button>
        )}

        {editingUrl ? (
          <Input
            aria-label="URL do link"
            autoFocus
            value={urlDraft}
            disabled={pending}
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={commitUrl}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitUrl();
              }
              if (e.key === 'Escape') {
                setUrlDraft(url);
                setEditingUrl(false);
              }
            }}
          />
        ) : (
          <div className="flex items-center gap-1">
            <span className="block max-w-full truncate text-xs text-muted-foreground">{url}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Editar URL"
              onClick={() => {
                setUrlDraft(url);
                setEditingUrl(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* AC4 — botões ↑/↓ como alternativa explícita de teclado. Coexistem com
          o KeyboardSensor nativo do dnd-kit (DEV-4). `disabled` nos boundaries
          (DEV-3). `onMove` é opcional; isolated render sem LinkList → no-op. */}
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mover para cima"
          disabled={isFirst || !onMove}
          onClick={() => onMove?.(link.id, 'up')}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mover para baixo"
          disabled={isLast || !onMove}
          onClick={() => onMove?.(link.id, 'down')}
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <Switch
        checked={visible}
        onCheckedChange={onToggleVisibility}
        aria-label={visible ? 'Link visível, ocultar' : 'Link oculto, exibir'}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Excluir link" />}
        >
          <Trash2 className="size-4 text-destructive" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir link?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O link “{title}” será removido da sua página.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
