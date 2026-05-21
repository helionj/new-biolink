/**
 * /dev/themes — Theme tokens showcase (DEV-only, Story 3.1 Task 4).
 *
 * Renderiza os 3 presets de tema side-by-side (light/dark/brand) com swatches
 * de cor, exemplos de radius e amostras tipográficas. Usa exclusivamente HTML
 * puro + Tailwind utilities + CSS vars — evita dependência de
 * `components/ui/*` (Card/Modal/Avatar virão na Story 3.4 e podem mudar
 * tokens; o showcase precisa estar abaixo deles na cadeia).
 *
 * Guard de produção: `notFound()` quando `NODE_ENV === 'production'`. A rota
 * é exclusivamente para PR reviews e onboarding de contribuidores. Evolução
 * futura (Story 3.4): adicionar uma seção mostrando Card/Avatar/Modal em cada
 * preset (component-level visual regression catch).
 */

import { notFound } from 'next/navigation';

import { THEMES, type Theme } from '@/lib/theme';

const COLOR_TOKENS = [
  'background',
  'foreground',
  'primary',
  'primary-foreground',
  'muted',
  'muted-foreground',
  'border',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'input',
  'ring',
] as const;

const RADIUS_TOKENS = ['sm', 'md', 'base', 'lg', 'xl'] as const;

export const metadata = {
  title: 'Theme Tokens — DEV',
  robots: { index: false, follow: false },
};

export default function ThemesShowcasePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Theme Tokens — DEV Showcase</h1>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Referência visual dos 3 presets (light, dark, brand). Rota dev-only — retorna 404 em
          produção. Paletas finais (Story 3.2). Validação WCAG AA: <code>pnpm check:contrast</code>.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {THEMES.map((theme) => (
          <ThemeSection key={theme} theme={theme} />
        ))}
      </div>
    </main>
  );
}

function ThemeSection({ theme }: { theme: Theme }) {
  return (
    <section
      data-theme={theme}
      className="rounded-lg border p-6"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        borderColor: 'var(--border)',
      }}
    >
      <h2 className="mb-4 text-xl font-semibold capitalize">{theme}</h2>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-70">Colors</h3>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_TOKENS.map((token) => (
              <ColorSwatch key={token} token={token} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-70">Radius</h3>
          <div className="flex flex-wrap gap-3">
            {RADIUS_TOKENS.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                <div
                  className="size-12"
                  style={{
                    background: 'var(--primary)',
                    borderRadius: `var(--radius-${size})`,
                  }}
                  aria-label={`Radius token --radius-${size}`}
                />
                <code className="text-xs opacity-70">--radius-{size}</code>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-70">
            Typography
          </h3>
          <div className="space-y-1">
            <p className="font-sans text-base">Aa Bb Cc 123 — sans (var(--font-sans))</p>
            <code className="block font-mono text-sm">monospace 0OIl — var(--font-mono)</code>
          </div>
        </div>
      </div>
    </section>
  );
}

function ColorSwatch({ token }: { token: (typeof COLOR_TOKENS)[number] }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="size-8 shrink-0 rounded border"
        style={{
          background: `var(--${token})`,
          borderColor: 'var(--border)',
        }}
        aria-label={`Color token --${token}`}
      />
      <code className="truncate text-xs opacity-80">--{token}</code>
    </div>
  );
}
