import { describe, expect, it } from 'vitest';

import {
  CreateLinkInput,
  DeleteLinkInput,
  ReorderLinksInput,
  ToggleLinkVisibilityInput,
  UpdateLinkInput,
} from '@/lib/validators/link';

// v4 UUID válido (RFC 9562) — links.id é gen_random_uuid() (sempre v4).
const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('CreateLinkInput', () => {
  it('aceita payload válido (com e sem icon)', () => {
    expect(
      CreateLinkInput.safeParse({ title: 'Meu site', url: 'https://example.com' }).success,
    ).toBe(true);
    expect(
      CreateLinkInput.safeParse({
        title: 'Instagram',
        url: 'http://insta.gram',
        icon: 'instagram',
      }).success,
    ).toBe(true);
  });

  it('faz trim do title e rejeita título vazio/somente espaços', () => {
    const trimmed = CreateLinkInput.safeParse({ title: '  Meu site  ', url: 'https://x.com' });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.title).toBe('Meu site');

    const empty = CreateLinkInput.safeParse({ title: '   ', url: 'https://x.com' });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      const issue = empty.error.issues.find((i) => i.path.join('.') === 'title');
      expect(issue?.message).toBe('O título é obrigatório');
    }
  });

  it('rejeita title acima de 100 chars', () => {
    const r = CreateLinkInput.safeParse({ title: 'a'.repeat(101), url: 'https://x.com' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'title');
      expect(issue?.message).toBe('O título deve ter no máximo 100 caracteres');
    }
  });

  it('aceita title nos limites 1 e 100', () => {
    expect(CreateLinkInput.safeParse({ title: 'a', url: 'https://x.com' }).success).toBe(true);
    expect(
      CreateLinkInput.safeParse({ title: 'a'.repeat(100), url: 'https://x.com' }).success,
    ).toBe(true);
  });

  it('rejeita url sem http(s) e bloqueia javascript: (segurança)', () => {
    const noScheme = CreateLinkInput.safeParse({ title: 'x', url: 'example.com' });
    expect(noScheme.success).toBe(false);
    if (!noScheme.success) {
      const issue = noScheme.error.issues.find((i) => i.path.join('.') === 'url');
      expect(issue?.message).toBe('A URL deve começar com http:// ou https://');
    }
    expect(CreateLinkInput.safeParse({ title: 'x', url: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(CreateLinkInput.safeParse({ title: 'x', url: 'ftp://example.com' }).success).toBe(false);
  });

  it('aceita url http e https (case-insensitive)', () => {
    expect(CreateLinkInput.safeParse({ title: 'x', url: 'HTTPS://EXAMPLE.COM' }).success).toBe(
      true,
    );
    expect(CreateLinkInput.safeParse({ title: 'x', url: 'http://example.com' }).success).toBe(true);
  });

  it('rejeita icon com maiúscula, espaço ou acima de 40 chars', () => {
    expect(
      CreateLinkInput.safeParse({ title: 'x', url: 'https://x.com', icon: 'Instagram' }).success,
    ).toBe(false);
    expect(
      CreateLinkInput.safeParse({ title: 'x', url: 'https://x.com', icon: 'two words' }).success,
    ).toBe(false);
    expect(
      CreateLinkInput.safeParse({ title: 'x', url: 'https://x.com', icon: 'a'.repeat(41) }).success,
    ).toBe(false);
    expect(CreateLinkInput.safeParse({ title: 'x', url: 'https://x.com', icon: '' }).success).toBe(
      false,
    );
  });
});

describe('UpdateLinkInput', () => {
  it('aceita id válido com title e/ou url opcionais', () => {
    expect(UpdateLinkInput.safeParse({ id: VALID_UUID }).success).toBe(true);
    expect(UpdateLinkInput.safeParse({ id: VALID_UUID, title: 'Novo' }).success).toBe(true);
    expect(UpdateLinkInput.safeParse({ id: VALID_UUID, url: 'https://novo.com' }).success).toBe(
      true,
    );
  });

  it('rejeita id que não é uuid', () => {
    const r = UpdateLinkInput.safeParse({ id: 'not-a-uuid', title: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'id');
      expect(issue?.message).toBe('Identificador inválido');
    }
  });

  it('rejeita title/url inválidos mesmo sendo opcionais', () => {
    expect(UpdateLinkInput.safeParse({ id: VALID_UUID, title: '   ' }).success).toBe(false);
    expect(UpdateLinkInput.safeParse({ id: VALID_UUID, url: 'nope' }).success).toBe(false);
  });
});

describe('DeleteLinkInput', () => {
  it('aceita uuid válido e rejeita inválido', () => {
    expect(DeleteLinkInput.safeParse({ id: VALID_UUID }).success).toBe(true);
    expect(DeleteLinkInput.safeParse({ id: '123' }).success).toBe(false);
    expect(DeleteLinkInput.safeParse({}).success).toBe(false);
  });
});

describe('ToggleLinkVisibilityInput', () => {
  it('aceita uuid + boolean', () => {
    expect(ToggleLinkVisibilityInput.safeParse({ id: VALID_UUID, is_visible: true }).success).toBe(
      true,
    );
    expect(ToggleLinkVisibilityInput.safeParse({ id: VALID_UUID, is_visible: false }).success).toBe(
      true,
    );
  });

  it('rejeita is_visible ausente ou não-boolean', () => {
    expect(ToggleLinkVisibilityInput.safeParse({ id: VALID_UUID }).success).toBe(false);
    expect(ToggleLinkVisibilityInput.safeParse({ id: VALID_UUID, is_visible: 'yes' }).success).toBe(
      false,
    );
  });
});

describe('ReorderLinksInput', () => {
  // 5 UUIDs v4 reais (RFC 9562 — versão `4` no 13º char + variant `8/9/a/b` no 17º).
  // Espelham o que `gen_random_uuid()` gera em runtime para `links.id`.
  const UUIDS_V4 = [
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    'd4e5f6a7-b8c9-4d8e-9f2a-3b4c5d6e7f80',
    'e5f6a7b8-c9d0-4e9f-8a3b-4c5d6e7f8091',
  ];

  it('aceita array de 5 uuids v4 válidos', () => {
    const r = ReorderLinksInput.safeParse({ orderedIds: UUIDS_V4 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.orderedIds).toHaveLength(5);
  });

  it('aceita array com 1 uuid (mínimo)', () => {
    expect(ReorderLinksInput.safeParse({ orderedIds: [UUIDS_V4[0]] }).success).toBe(true);
  });

  it('rejeita array vazio com mensagem "Lista vazia"', () => {
    const r = ReorderLinksInput.safeParse({ orderedIds: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'orderedIds');
      expect(issue?.message).toBe('Lista vazia');
    }
  });

  it('rejeita array contendo não-uuid', () => {
    const r = ReorderLinksInput.safeParse({ orderedIds: [UUIDS_V4[0], 'not-a-uuid'] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'orderedIds.1');
      expect(issue?.message).toBe('Identificador inválido');
    }
  });

  it('rejeita orderedIds ausente ou não-array', () => {
    expect(ReorderLinksInput.safeParse({}).success).toBe(false);
    expect(ReorderLinksInput.safeParse({ orderedIds: 'abc' }).success).toBe(false);
  });
});
