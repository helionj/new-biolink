import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Story 4.5 — Task 7.2. Cobre ExportButton:
//   1) Render com texto "Exportar dados" + ícone Download.
//   2) Click → invoca action mock → URL.createObjectURL chamado com Blob
//      application/json + filename `biolink-export-{username}-{YYYY-MM-DD}.json`.
//   3) Error state → toast.error com mensagem do ActionResult.

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/server/account/actions', () => ({
  exportAccountData: vi.fn(),
  deleteAccount: vi.fn(),
}));

import { ExportButton } from '@/components/account/ExportButton';
import { toast } from '@/lib/toast';
import * as accountActions from '@/server/account/actions';

const mockedExport = vi.mocked(accountActions.exportAccountData);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

const mockedCreateObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(() => 'blob:mock-url');
const mockedRevokeObjectURL = vi.fn<(url: string) => void>();
let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;

beforeEach(() => {
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;
  Object.assign(URL, {
    createObjectURL: mockedCreateObjectURL,
    revokeObjectURL: mockedRevokeObjectURL,
  });
});

afterEach(() => {
  if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
  if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
  mockedExport.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
  mockedCreateObjectURL.mockClear();
  mockedRevokeObjectURL.mockClear();
});

function buildExportPayload(username = 'cifx-alice') {
  return {
    _meta: {
      exported_at: '2026-05-28T12:00:00.000Z',
      warning: 'ip_hash e user_agent_hash são pseudonimização SHA-256 + salt',
    },
    profile: {
      id: '00000000-0000-0000-0000-000000001001',
      username,
      display_name: null,
      avatar_url: null,
      bio: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    },
    page: null,
    links: [],
    click_events: [],
    page_views: [],
  };
}

describe('<ExportButton>', () => {
  it('renderiza com texto "Exportar dados" e ícone (AC2)', () => {
    render(<ExportButton />);
    expect(screen.getByRole('button', { name: /exportar dados/i })).toBeInTheDocument();
  });

  it('click → action mock + createObjectURL com Blob application/json + toast.success (AC2)', async () => {
    const user = userEvent.setup();
    mockedExport.mockResolvedValue({
      ok: true,
      data: buildExportPayload('cifx-alice') as unknown as Awaited<
        ReturnType<typeof import('@/server/account/actions').exportAccountData>
      > extends { ok: true; data: infer D }
        ? D
        : never,
    });

    render(<ExportButton />);
    await user.click(screen.getByRole('button', { name: /exportar dados/i }));

    await waitFor(() => {
      expect(mockedExport).toHaveBeenCalledTimes(1);
    });

    expect(mockedCreateObjectURL).toHaveBeenCalledTimes(1);
    const firstCall = mockedCreateObjectURL.mock.calls[0];
    expect(firstCall).toBeDefined();
    const blobArg = firstCall![0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect((blobArg as Blob).type).toBe('application/json');

    expect(mockedRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(mockedToastSuccess).toHaveBeenCalledWith('Dados exportados com sucesso');
  });

  it('error state: action retorna ok:false → toast.error com mensagem (AC2)', async () => {
    const user = userEvent.setup();
    mockedExport.mockResolvedValue({ ok: false, error: 'Sessão expirada. Faça login novamente.' });

    render(<ExportButton />);
    await user.click(screen.getByRole('button', { name: /exportar dados/i }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.');
    });
    expect(mockedCreateObjectURL).not.toHaveBeenCalled();
    expect(mockedToastSuccess).not.toHaveBeenCalled();
  });
});
