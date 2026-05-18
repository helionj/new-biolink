import { describe, expect, it } from 'vitest';

import { CheckUsernameInput, UpdateUsernameInput, usernameSchema } from '@/lib/validators/profile';

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
