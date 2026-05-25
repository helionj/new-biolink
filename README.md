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

| Script                  | Descrição                                                          |
| ----------------------- | ------------------------------------------------------------------ |
| `pnpm dev`              | Dev server (Turbopack)                                             |
| `pnpm build`            | Build de produção                                                  |
| `pnpm start`            | Start de produção                                                  |
| `pnpm lint`             | ESLint (Next + import/order + Prettier)                            |
| `pnpm typecheck`        | TypeScript (`tsc --noEmit`)                                        |
| `pnpm format`           | Prettier write                                                     |
| `pnpm format:check`     | Prettier check                                                     |
| `pnpm test`             | Roda todos os Vitest projects (unit + components + integration)    |
| `pnpm test:unit`        | Apenas unit tests (env `node`)                                     |
| `pnpm test:components`  | Apenas component tests (env `jsdom` + Testing Library)             |
| `pnpm test:integration` | Apenas integration tests (requer `SUPABASE_DB_URL` em CI ou local) |
| `pnpm test:watch`       | Watch mode                                                         |
| `pnpm test:coverage`    | Roda testes com coverage (Vitest + v8)                             |
| `pnpm db:types`         | Gera `lib/supabase/types.ts` do projeto                            |

> Todos os scripts `test:*` aceitam exit `0` com `passWithNoTests` até que stories futuras populem cada project — esta é a configuração default em CI.

## Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, RSC, Turbopack)
- **Linguagem:** TypeScript 5 (strict + `noUncheckedIndexedAccess`)
- **Estilo:** [Tailwind CSS 4](https://tailwindcss.com/) com design tokens via CSS variables
- **Backend:** Supabase (Postgres + Auth + Storage) — Story 1.2+
- **Testes:** Vitest + Testing Library + jsdom — scaffold em Story 1.3 (`vitest.config.ts` com 3 projects)
- **CI/CD:** GitHub Actions + Vercel + Husky + Supabase Branching — Story 1.3

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

## Como contribuir

1. **Setup local:** siga [`docs/dev-setup.md`](docs/dev-setup.md) (Supabase de dev + env vars + Husky/gitleaks).
2. **Branches & PRs:** crie uma feature branch a partir de `main`, abra PR — o pipeline de CI valida lint/typecheck/test/build/secrets/audit automaticamente, e a Vercel publica um preview clicável no comentário do PR.
3. **Hooks locais (Husky):** `pre-commit` roda `lint-staged` + `gitleaks protect` (se gitleaks instalado); `pre-push` roda `pnpm typecheck`. Veja seção "Husky" em `docs/dev-setup.md`.
4. **Secrets necessários** (já configurados pelo @devops — apenas para referência): GitHub Actions e Vercel env vars estão documentados em `docs/dev-setup.md` §9-10.

## Documentação

- [PRD](docs/prd.md)
- [Architecture](docs/architecture.md)
- [Design System](docs/design-system.md)
- [Stories](docs/stories/)
- [Dev Setup](docs/dev-setup.md)

## Licença

[MIT](LICENSE) © 2026 Helion Porto
