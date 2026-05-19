'use client';

// Client Component: interactive dropdown, clipboard write and logout transition.
import { Copy, LogOut } from 'lucide-react';
import { useTransition } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';
import { signOut } from '@/server/auth/actions';

interface Props {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  siteUrl: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function UserMenu({ username, displayName, avatarUrl, siteUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const label = displayName ?? username;
  const initials = getInitials(label);

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(`${siteUrl}/@${username}`);
      toast.success('URL pública copiada');
    } catch {
      toast.error('Não foi possível copiar a URL');
    }
  }

  function handleSignOut() {
    startTransition(async () => {
      const res = await signOut();
      if (res && !res.ok) {
        toast.error(res.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu da conta de ${label}`}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyUrl}>
          <Copy aria-hidden="true" />
          Copiar URL pública
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleSignOut}>
          <LogOut aria-hidden="true" />
          {isPending ? 'Saindo...' : 'Sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
