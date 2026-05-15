import { toast as sonnerToast, type ExternalToast } from 'sonner';

// Stable toast facade — feature code imports from here, not `sonner` (Story 1.8 §Drift).
export const toast = {
  success: (message: string, data?: ExternalToast) => sonnerToast.success(message, data),
  error: (message: string, data?: ExternalToast) => sonnerToast.error(message, data),
  info: (message: string, data?: ExternalToast) => sonnerToast.info(message, data),
};

export type NotifyVariant = 'default' | 'success' | 'destructive';

export interface NotifyOptions {
  title: string;
  description?: string;
  variant?: NotifyVariant;
}

// Adapter for the `{ title, description, variant }` shape in older architecture.md examples.
export function notify({ title, description, variant = 'default' }: NotifyOptions) {
  const data: ExternalToast | undefined = description ? { description } : undefined;
  if (variant === 'destructive') return sonnerToast.error(title, data);
  if (variant === 'success') return sonnerToast.success(title, data);
  return sonnerToast(title, data);
}
