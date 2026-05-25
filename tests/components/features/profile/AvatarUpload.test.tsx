import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockedRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mockedRefresh }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; [k: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} />
  ),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/profile/actions', () => ({
  uploadAvatar: vi.fn(),
}));

import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { toast } from '@/lib/toast';
import * as profileActions from '@/server/profile/actions';

const mockedUpload = vi.mocked(profileActions.uploadAvatar);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

// jsdom: URL.createObjectURL não existe por padrão.
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock-preview'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  mockedUpload.mockReset();
  mockedRefresh.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
});

function makeJpgFile(name = 'avatar.jpg'): File {
  return new File([new Uint8Array(1024)], name, { type: 'image/jpeg' });
}

describe('<AvatarUpload>', () => {
  it('renderiza AvatarFallback (initials) quando currentAvatarUrl é null', () => {
    const { container } = render(
      <AvatarUpload currentAvatarUrl={null} displayName="Alice Silva" username="alice" />,
    );
    const fallback = container.querySelector('[data-slot=avatar-fallback]');
    expect(fallback).not.toBeNull();
    expect(fallback).toHaveTextContent('AL'); // 2 primeiros caracteres do displayName
  });

  it('usa username quando displayName é null para os initials', () => {
    const { container } = render(
      <AvatarUpload currentAvatarUrl={null} displayName={null} username="bob-z" />,
    );
    expect(container.querySelector('[data-slot=avatar-fallback]')).toHaveTextContent('BO');
  });

  it('NÃO renderiza AvatarFallback quando currentAvatarUrl está presente', () => {
    // Quando currentAvatarUrl está set, o conditional do componente escolhe
    // AvatarImage e o fallback NÃO é renderizado no JSX. (O elemento <img>
    // interno do base-ui só aparece após load real — não testável em jsdom;
    // a negação do fallback é o sinal observável correto.)
    const { container } = render(
      <AvatarUpload
        currentAvatarUrl="https://example.com/me.png"
        displayName="Alice"
        username="alice"
      />,
    );
    expect(container.querySelector('[data-slot=avatar-fallback]')).toBeNull();
    expect(container.querySelector('[data-slot=avatar]')).not.toBeNull();
  });

  it('botão "Trocar avatar" dispara click programático no input file', async () => {
    const { container } = render(
      <AvatarUpload currentAvatarUrl={null} displayName="Alice" username="alice" />,
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await userEvent.click(screen.getByRole('button', { name: /trocar avatar/i }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('upload bem-sucedido: chama uploadAvatar(FormData), exibe toast.success e refresh', async () => {
    mockedUpload.mockResolvedValue({
      ok: true,
      data: { avatar_url: 'https://cdn.example.com/avatars/uid/avatar.jpg' },
    });

    const { container } = render(
      <AvatarUpload currentAvatarUrl={null} displayName="Alice" username="alice" />,
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input, makeJpgFile());

    await waitFor(() => {
      expect(mockedUpload).toHaveBeenCalled();
      const fd = mockedUpload.mock.calls[0]?.[0];
      expect(fd).toBeInstanceOf(FormData);
      expect((fd as FormData).get('avatar')).toBeTruthy();
    });

    expect(mockedToastSuccess).toHaveBeenCalledWith('Avatar atualizado');
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it('upload com erro: reverte preview para currentAvatarUrl e exibe toast.error', async () => {
    mockedUpload.mockResolvedValue({
      ok: false,
      error: 'Erro ao enviar avatar. Tente novamente',
    });

    const { container } = render(
      <AvatarUpload
        currentAvatarUrl="https://example.com/before.png"
        displayName="Alice"
        username="alice"
      />,
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input, makeJpgFile());

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Erro ao enviar avatar. Tente novamente');
    });

    // Após o rollback, o conditional render volta para AvatarImage (não
    // fallback) porque previewUrl foi revertido para currentAvatarUrl.
    expect(container.querySelector('[data-slot=avatar-fallback]')).toBeNull();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it('botão e input ficam disabled enquanto isPending é true', async () => {
    // Resolver de upload travado para podermos observar isPending=true.
    let resolveUpload: (v: { ok: false; error: string }) => void;
    const pending = new Promise<{ ok: false; error: string }>((resolve) => {
      resolveUpload = resolve;
    });
    mockedUpload.mockReturnValue(pending);

    const { container } = render(
      <AvatarUpload currentAvatarUrl={null} displayName="Alice" username="alice" />,
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input, makeJpgFile());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
    });
    expect(input).toBeDisabled();

    // Liberar a promise para garantir cleanup.
    resolveUpload!({ ok: false, error: 'noop' });
  });
});
