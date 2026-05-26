/**
 * Unit tests — `lib/rate-limit.ts` (Story 4.1 AC5).
 *
 * Cobre: first/middle/over-limit, window reset, key isolation, resetAt
 * monotônico. Usa `vi.useFakeTimers()` para controle determinístico do
 * tempo (sem `sleep`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetRateLimit, checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimit();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1ª chamada com max=2 → allowed: true, remaining: 1', () => {
    const result = checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('2ª chamada com max=2 → allowed: true, remaining: 0 (consome último slot)', () => {
    checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    const result = checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('3ª chamada com max=2 → allowed: false (over limit)', () => {
    checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    const result = checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('reseta após janela expirar (vi.advanceTimersByTime > windowMs)', () => {
    // Consome todo o orçamento
    checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    expect(checkRateLimit('key-a', { max: 2, windowMs: 1000 }).allowed).toBe(false);

    // Avança 1.5s — janela expira
    vi.advanceTimersByTime(1500);

    const result = checkRateLimit('key-a', { max: 2, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('keys diferentes têm contadores independentes', () => {
    checkRateLimit('key-a', { max: 1, windowMs: 1000 });
    expect(checkRateLimit('key-a', { max: 1, windowMs: 1000 }).allowed).toBe(false);

    // key-b nunca foi tocada — deve ter 1 slot livre
    expect(checkRateLimit('key-b', { max: 1, windowMs: 1000 }).allowed).toBe(true);
  });

  it('resetAt é monotônico dentro da janela (não muda entre chamadas)', () => {
    const a = checkRateLimit('key-a', { max: 5, windowMs: 60_000 });
    vi.advanceTimersByTime(100);
    const b = checkRateLimit('key-a', { max: 5, windowMs: 60_000 });
    expect(b.resetAt).toBe(a.resetAt);
  });

  it('resetAt avança quando a janela é renovada', () => {
    const a = checkRateLimit('key-a', { max: 1, windowMs: 1000 });
    vi.advanceTimersByTime(2000);
    const b = checkRateLimit('key-a', { max: 1, windowMs: 1000 });
    expect(b.resetAt).toBeGreaterThan(a.resetAt);
  });

  it('cenário canônico AC5 — 60/min: 60 allowed, 61º negado', () => {
    const opts = { max: 60, windowMs: 60_000 };
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit('ip-x', opts).allowed).toBe(true);
    }
    const blocked = checkRateLimit('ip-x', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
