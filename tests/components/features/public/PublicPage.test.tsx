/**
 * Component tests — <PublicPage> theme wrapper (Story 3.2 AC5 + [STORY-3.1-F1] refactor).
 *
 * Cobre:
 *   (a) AC5 — 3 snapshots HTML-only (light/dark/brand) confirmando que o
 *       `page.theme` se propaga para o wrapper top-level via `data-theme`.
 *   (b) Anti-regressão [STORY-3.1-F1] 2026-06-08: classe `.dark` foi eliminada
 *       da codebase; o `@custom-variant dark (&:is([data-theme='dark'] *))`
 *       (globals.css L10) agora alimenta o `dark:` Tailwind variant a partir
 *       do mesmo wrapper `data-theme`, sem precisar de classe separada.
 *
 * Snapshots são HTML-only — jsdom 29 + Tailwind 4 não resolve CSS vars de
 * stylesheets externas de forma confiável (DEV-1 da 3.1; DEV-4 desta story).
 * Validação visual real fica para `pnpm check:contrast` (Task 3) +
 * showcase `/dev/themes`.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicPage } from '@/components/public/PublicPage';
import { THEMES } from '@/lib/theme';
import type { PublicPageData } from '@/server/page/queries';

type Theme = PublicPageData['page']['theme'];

function makeFixture(theme: Theme): PublicPageData {
  return {
    profile: {
      username: 'demo',
      display_name: 'Demo',
      bio: 'Bio teste',
      avatar_url: null,
    },
    page: { id: 'pg-1', theme },
    links: [
      {
        id: 'lnk-1',
        title: 'Instagram',
        url: 'https://instagram.com/demo',
        icon: 'instagram',
        position: 0,
      },
    ],
  };
}

describe('<PublicPage> theme wrapper', () => {
  it.each(THEMES)('aplica data-theme="%s" no wrapper top-level', (theme) => {
    const { container } = render(<PublicPage data={makeFixture(theme)} />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveAttribute('data-theme', theme);

    // Anti-regressão [STORY-3.1-F1]: classe .dark nunca deve aparecer no wrapper
    // (eliminada da codebase; @custom-variant agora consume data-theme direto).
    expect(wrapper.className).not.toMatch(/\bdark\b/);

    expect(container).toMatchSnapshot();
  });
});
