import { describe, expect, it } from 'vitest';

import {
  CheckUsernameInput,
  UpdateUsernameInput,
  UploadAvatarInput,
  usernameSchema,
} from '@/lib/validators/profile';

describe('usernameSchema (DP-3 — single source compartilhado)', () => {
  it('aceita username válido', () => {
    expect(usernameSchema.safeParse('alice-1').success).toBe(true);
  });

  it('aceita limites de tamanho 3 e 30', () => {
    expect(usernameSchema.safeParse('abc').success).toBe(true);
    expect(usernameSchema.safeParse('a'.repeat(30)).success).toBe(true);
  });

  it('rejeita tamanho 2 (curto) com mensagem PT-BR', () => {
    const r = usernameSchema.safeParse('ab');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Use 3 a 30 caracteres entre a-z, 0-9 e hífen');
    }
  });

  it('rejeita tamanho 31 (longo)', () => {
    expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('rejeita uppercase (regex)', () => {
    const r = usernameSchema.safeParse('AB-cd');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Use 3 a 30 caracteres entre a-z, 0-9 e hífen');
    }
  });

  it('rejeita caractere inválido (espaço/underscore/acento)', () => {
    expect(usernameSchema.safeParse('foo bar').success).toBe(false);
    expect(usernameSchema.safeParse('foo_bar').success).toBe(false);
    expect(usernameSchema.safeParse('joão').success).toBe(false);
  });

  it('rejeita username reservado com mensagem PT-BR', () => {
    const r = usernameSchema.safeParse('admin');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Este username é reservado');
    }
  });
});

describe('UpdateUsernameInput', () => {
  it('aceita objeto com username válido', () => {
    expect(UpdateUsernameInput.safeParse({ username: 'nova-handle' }).success).toBe(true);
  });

  it('rejeita username reservado no path correto', () => {
    const r = UpdateUsernameInput.safeParse({ username: 'dashboard' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'username');
      expect(issue?.message).toBe('Este username é reservado');
    }
  });

  it('rejeita payload sem username', () => {
    expect(UpdateUsernameInput.safeParse({}).success).toBe(false);
  });
});

describe('CheckUsernameInput', () => {
  it('aceita objeto com username válido', () => {
    expect(CheckUsernameInput.safeParse({ username: 'check-me' }).success).toBe(true);
  });

  it('rejeita username com formato inválido', () => {
    expect(CheckUsernameInput.safeParse({ username: 'X' }).success).toBe(false);
  });
});

describe('UploadAvatarInput (Story 3.4)', () => {
  function pngBlob(size: number): Blob {
    return new Blob([new Uint8Array(size)], { type: 'image/png' });
  }

  it('aceita Blob jpg/png/webp dentro do limite', () => {
    expect(UploadAvatarInput.safeParse({ file: pngBlob(1024) }).success).toBe(true);
    expect(
      UploadAvatarInput.safeParse({
        file: new Blob([new Uint8Array(1024)], { type: 'image/jpeg' }),
      }).success,
    ).toBe(true);
    expect(
      UploadAvatarInput.safeParse({
        file: new Blob([new Uint8Array(1024)], { type: 'image/webp' }),
      }).success,
    ).toBe(true);
  });

  it('aceita Blob exatamente no limite de 1 MB', () => {
    expect(UploadAvatarInput.safeParse({ file: pngBlob(1024 * 1024) }).success).toBe(true);
  });

  it('rejeita Blob > 1 MB com mensagem PT-BR', () => {
    const r = UploadAvatarInput.safeParse({ file: pngBlob(1024 * 1024 + 1) });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'file');
      expect(issue?.message).toBe('Arquivo deve ter no máximo 1 MB');
    }
  });

  it('rejeita Blob vazio', () => {
    const r = UploadAvatarInput.safeParse({
      file: new Blob([], { type: 'image/png' }),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'file');
      expect(issue?.message).toBe('Arquivo vazio');
    }
  });

  it('rejeita mime não permitido (gif)', () => {
    const r = UploadAvatarInput.safeParse({
      file: new Blob([new Uint8Array(1024)], { type: 'image/gif' }),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'file');
      expect(issue?.message).toBe('Use jpg, png ou webp');
    }
  });

  it('rejeita valor não-Blob (string, número, null)', () => {
    expect(UploadAvatarInput.safeParse({ file: 'not-a-blob' }).success).toBe(false);
    expect(UploadAvatarInput.safeParse({ file: 42 }).success).toBe(false);
    expect(UploadAvatarInput.safeParse({ file: null }).success).toBe(false);
  });

  it('rejeita payload sem file', () => {
    expect(UploadAvatarInput.safeParse({}).success).toBe(false);
  });
});
