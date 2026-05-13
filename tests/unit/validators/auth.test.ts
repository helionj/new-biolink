import { describe, expect, it } from 'vitest';

import { SignInInput, SignUpInput } from '@/lib/validators/auth';

const validSignUp = {
  email: 'alice@biolink.dev',
  password: 'password123',
  confirmPassword: 'password123',
  username: 'alice-1',
  acceptTerms: true as const,
};

function firstMessage(result: ReturnType<typeof SignUpInput.safeParse>, path: string) {
  if (result.success) throw new Error('expected failure');
  return result.error.issues.find((i) => i.path.join('.') === path)?.message;
}

describe('SignUpInput', () => {
  it('aceita payload válido', () => {
    const r = SignUpInput.safeParse(validSignUp);
    expect(r.success).toBe(true);
  });

  it('rejeita email inválido com mensagem PT-BR', () => {
    const r = SignUpInput.safeParse({ ...validSignUp, email: 'foo' });
    expect(firstMessage(r, 'email')).toBe('Informe um email válido');
  });

  it('rejeita password < 8 chars', () => {
    const r = SignUpInput.safeParse({
      ...validSignUp,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(firstMessage(r, 'password')).toBe('A senha precisa ter no mínimo 8 caracteres');
  });

  it('rejeita confirmPassword diferente no path correto', () => {
    const r = SignUpInput.safeParse({ ...validSignUp, confirmPassword: 'mismatched1' });
    expect(firstMessage(r, 'confirmPassword')).toBe('As senhas não coincidem');
  });

  it('rejeita username curto', () => {
    const r = SignUpInput.safeParse({ ...validSignUp, username: 'ad' });
    expect(firstMessage(r, 'username')).toBe('Use 3 a 30 caracteres entre a-z, 0-9 e hífen');
  });

  it('rejeita username com uppercase', () => {
    const r = SignUpInput.safeParse({ ...validSignUp, username: 'AB-cd' });
    expect(firstMessage(r, 'username')).toBe('Use 3 a 30 caracteres entre a-z, 0-9 e hífen');
  });

  it('rejeita username reservado', () => {
    const r = SignUpInput.safeParse({ ...validSignUp, username: 'admin' });
    expect(firstMessage(r, 'username')).toBe('Este username é reservado');
  });

  it('rejeita acceptTerms=false', () => {
    const r = SignUpInput.safeParse({ ...validSignUp, acceptTerms: false as unknown as true });
    expect(firstMessage(r, 'acceptTerms')).toBe('Aceite os termos para continuar');
  });
});

describe('SignInInput', () => {
  it('aceita payload válido', () => {
    const r = SignInInput.safeParse({ email: 'alice@biolink.dev', password: 'x' });
    expect(r.success).toBe(true);
  });

  it('rejeita password vazia', () => {
    const r = SignInInput.safeParse({ email: 'alice@biolink.dev', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find((i) => i.path.join('.') === 'password')?.message;
      expect(msg).toBe('Informe sua senha');
    }
  });

  it('rejeita email inválido', () => {
    const r = SignInInput.safeParse({ email: 'bad', password: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find((i) => i.path.join('.') === 'email')?.message;
      expect(msg).toBe('Informe um email válido');
    }
  });
});
