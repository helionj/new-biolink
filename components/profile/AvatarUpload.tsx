'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { uploadAvatar } from '@/server/profile/actions';

type Props = {
  currentAvatarUrl: string | null;
  displayName: string | null;
  username: string;
};

export function AvatarUpload({ currentAvatarUrl, displayName, username }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview (DEV-2 — pattern verbatim Story 3.3 <ThemeSelector>).
    // URL.createObjectURL precisa de revoke para evitar memory leak.
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.append('avatar', file);

    startTransition(async () => {
      const res = await uploadAvatar(formData);
      URL.revokeObjectURL(localUrl);
      if (!res.ok) {
        setPreviewUrl(currentAvatarUrl); // rollback
        toast.error(res.error);
        return;
      }
      setPreviewUrl(res.data.avatar_url);
      toast.success('Avatar atualizado');
      router.refresh(); // RSC re-fetch profile no parent
    });

    // Reset o input para permitir re-selecionar o mesmo arquivo após erro.
    if (inputRef.current) inputRef.current.value = '';
  }

  const initials = (displayName ?? username).slice(0, 2).toUpperCase();
  const altText = `Avatar de ${displayName ?? username}`;

  return (
    <div className="flex items-center gap-4">
      {/* Override 96×96 [Source: docs/frontend-spec.md §2.6 L638-641 — "AVATAR 96x96 circle"]. */}
      {/* Avatar primitive Story 5.3 expõe apenas size-8/sm/lg=size-10 (40px); className size-24 */}
      {/* via tailwind-merge final-wins evita refactor de primitive (escopo Story 5.3 fechado). */}
      <Avatar size="lg" className="size-24">
        {previewUrl ? (
          <AvatarImage
            render={<Image src={previewUrl} alt={altText} width={96} height={96} unoptimized />}
          />
        ) : (
          <AvatarFallback>{initials}</AvatarFallback>
        )}
      </Avatar>
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isPending}
          aria-label="Trocar avatar"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          {isPending ? 'Enviando…' : 'Trocar avatar'}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — máx 1 MB</p>
      </div>
    </div>
  );
}
