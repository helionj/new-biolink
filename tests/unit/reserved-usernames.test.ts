import { describe, expect, it } from 'vitest';

import { RESERVED_USERNAMES, isReservedUsername } from '@/lib/reserved-usernames';

describe('RESERVED_USERNAMES', () => {
  it('contém keys obrigatórios para rotas reservadas do Next.js', () => {
    const required = [
      'admin',
      'api',
      'dashboard',
      'login',
      'signup',
      'reset-password',
      'auth',
      'www',
      'public',
    ];
    for (const key of required) {
      expect(RESERVED_USERNAMES).toContain(key);
    }
  });
});

describe('isReservedUsername', () => {
  it('retorna true para username reservado em lowercase', () => {
    expect(isReservedUsername('admin')).toBe(true);
  });

  it('retorna true para username reservado com case mixado (case-insensitive)', () => {
    expect(isReservedUsername('Admin')).toBe(true);
    expect(isReservedUsername('DASHBOARD')).toBe(true);
  });

  it('retorna false para username não-reservado', () => {
    expect(isReservedUsername('alice')).toBe(false);
    expect(isReservedUsername('biolink-user')).toBe(false);
  });
});
