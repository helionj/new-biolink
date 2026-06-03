'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';
import * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Soft Studio Toaster — Story 5.3 Task 8 + Story 5.8 motion opt-in extension.
 * - Position responsiva: `top-right` desktop (≥ 768px), `top-center` mobile.
 * - Border-left 4px por type (per frontend-spec.md §1.5 L1132 "success green /
 *   warning amber / destructive red / info plum"): success/warning consomem
 *   tokens `--success` / `--warning` (Task 8.0 pré-flight); error consome
 *   `--destructive`; info consome `--primary` plum.
 * - Toast entry/exit animations: sonner@2.x defaults (~250ms ease-out
 *   semanticamente equivalente a spec §1.5.2 --ease-out); Story 5.8 expõe CSS
 *   vars custom (--toast-animation-duration + --toast-animation-timing-function)
 *   para futuro override consistente com motion tokens canônicos.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [position, setPosition] = React.useState<ToasterProps['position']>('top-right');

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setPosition(mq.matches ? 'top-right' : 'top-center');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <Sonner
      theme="system"
      position={position}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--toast-animation-duration': 'var(--duration-250)',
          '--toast-animation-timing-function': 'var(--ease-out)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast border-l-4',
          success: 'border-l-[var(--success)]',
          error: 'border-l-destructive',
          warning: 'border-l-[var(--warning)]',
          info: 'border-l-primary',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
