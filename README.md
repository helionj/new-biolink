# BioLink

> Plataforma link-in-bio focada em performance, theming controlado e analytics first-party — construída sobre Next.js 16 (App Router), Supabase e Tailwind 4.

## Getting Started

Pré-requisitos: **Node.js ≥ 20** e **pnpm 9+** (ativável via `corepack enable`).

```bash
pnpm install
cp .env.example .env.local      # popule com chaves do Supabase de dev
pnpm dev
```

A aplicação fica disponível em [http://localhost:3000](http://localhost:3000).

Setup completo (criar projeto Supabase de dev, gerar tipos, gerar `HASH_SALT`): veja [`docs/dev-setup.md`](docs/dev-setup.md).

### Scripts úteis

| Script              | Descrição                               |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Dev server (Turbopack)                  |
| `pnpm build`        | Build de produção                       |
| `pnpm start`        | Start de produção                       |
| `pnpm lint`         | ESLint (Next + import/order + Prettier) |
| `pnpm typecheck`    | TypeScript (`tsc --noEmit`)             |
| `pnpm format`       | Prettier write                          |
| `pnpm format:check` | Prettier check                          |
| `pnpm db:types`     | Gera `lib/supabase/types.ts` do projeto |

## Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, RSC, Turbopack)
- **Linguagem:** TypeScript 5 (strict + `noUncheckedIndexedAccess`)
- **Estilo:** [Tailwind CSS 4](https://tailwindcss.com/) com design tokens via CSS variables
- **Backend:** Supabase (Postgres + Auth + Storage) — Story 1.2+
- **Testes:** Vitest + Testing Library — Story 1.2+

Detalhes completos em [`docs/architecture.md`](docs/architecture.md) §Tech Stack.

## Estrutura

```
biolink/
├── app/               # Next.js App Router (rotas + layouts)
├── components/        # Design system (ui/) + features
├── lib/               # Helpers (supabase clients, validators, env, theme)
├── server/            # Server Actions agrupadas por domínio
├── supabase/          # migrations + seed.sql + RLS tests
├── tests/             # unit + integration + components
├── public/            # static assets
└── docs/              # PRD, architecture, stories, guides
```

## Documentação

- [PRD](docs/prd.md)
- [Architecture](docs/architecture.md)
- [Stories](docs/stories/)

## Licença

[MIT](LICENSE) © 2026 Helion Porto
