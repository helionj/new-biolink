import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function ControlledDialog({
  defaultOpen = false,
  onOpenChange,
}: {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
    >
      <DialogTrigger render={<button type="button">Abrir</button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título do diálogo</DialogTitle>
          <DialogDescription>Descrição acessível</DialogDescription>
        </DialogHeader>
        <p>Corpo do diálogo</p>
        <DialogFooter>
          <DialogClose render={<button type="button">Cancelar</button>} />
          <button type="button">Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('<Dialog> (AC3 — Story 3.4)', () => {
  it('controlado: abre via prop "open"', () => {
    render(<ControlledDialog defaultOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Título do diálogo')).toBeInTheDocument();
    expect(screen.getByText('Corpo do diálogo')).toBeInTheDocument();
  });

  it('Trigger abre o dialog ao clicar', async () => {
    render(<ControlledDialog />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('AC3 — ESC fecha o dialog (chama onOpenChange(false))', async () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog defaultOpen={true} onOpenChange={onOpenChange} />);

    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC3 — click no overlay fecha (default dismissible)', async () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <ControlledDialog defaultOpen={true} onOpenChange={onOpenChange} />,
    );

    const overlay = container.ownerDocument.querySelector('[data-slot=dialog-overlay]');
    expect(overlay).not.toBeNull();
    await userEvent.click(overlay as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('AC3 — botão de close ("X") fecha o dialog', async () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog defaultOpen={true} onOpenChange={onOpenChange} />);

    // O DialogContent renderiza um close button com aria-label "Close" (sr-only span).
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    await userEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('AC3 — ARIA: role="dialog" + aria-labelledby ↔ DialogTitle + aria-describedby ↔ DialogDescription', () => {
    render(<ControlledDialog defaultOpen={true} />);
    const dialog = screen.getByRole('dialog');

    const labelledById = dialog.getAttribute('aria-labelledby');
    const describedById = dialog.getAttribute('aria-describedby');
    expect(labelledById).toBeTruthy();
    expect(describedById).toBeTruthy();

    const titleEl = dialog.ownerDocument.getElementById(labelledById!);
    const descEl = dialog.ownerDocument.getElementById(describedById!);
    expect(titleEl).toHaveTextContent('Título do diálogo');
    expect(descEl).toHaveTextContent('Descrição acessível');
  });

  it('DialogClose (Cancelar) chama onOpenChange(false)', async () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog defaultOpen={true} onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('snapshot do DialogContent aberto com header/footer', () => {
    render(<ControlledDialog defaultOpen={true} />);
    const dialog = screen.getByRole('dialog');
    // Snapshot do conteúdo (sem o portal pai para reduzir ruído de classes
    // do overlay/animation).
    expect(within(dialog).getByText('Título do diálogo')).toBeInTheDocument();
    expect(dialog).toMatchSnapshot();
  });
});
