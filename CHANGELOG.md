# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e este projeto adere a [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] — 2026-05-28 — MVP Backbone Complete

**Marco:** Encerramento do escopo PRD (Epics 1-4). Produto entregue cobre todos os
requirements funcionais (FR1-FR16) e não-funcionais (NFR1-NFR13) do MVP.

### Epic 1 — Fundação, Identidade e Página Canary

- **1.1** Bootstrap Next.js 16 + TypeScript + Tailwind 4 + project structure
- **1.2** Setup Supabase clients (`createClient` server.ts + `createAdmin` admin.ts) + `lib/env.ts` Zod-validated facade
- **1.3** Pipeline CI/CD GitHub Actions (lint/typecheck/test/build/gitleaks/audit)
- **1.4** Schema `profiles` + RLS policies + trigger `auth_user_created` (bootstrap 1:1)
- **1.5** UI auth completa: signup, login, logout + shadcn primitives + Sonner toast
- **1.6** Email verification (PKCE callback) + password reset flow
- **1.7** Middleware com matcher amplo + bypass list para rotas públicas
- **1.8** Seed design system — `lib/toast` facade + migração Sonner + component tests baseline
- **1.9** Landing pública SSR (`/`) + canary health-check endpoint

### Epic 2 — Perfil Público e Core de Links

- **2.1** Seleção e validação de slug — username live check + `/dashboard/profile`
- **2.2** Schema `pages` + RLS + trigger bootstrap estendido (1 page por user, UNIQUE)
- **2.3** Schema `links` + RLS composite-JOIN policies + suíte RLS dedicada
- **2.4** Dashboard shell — layout + sidebar + nav-items + user menu + mobile drawer
- **2.5** CRUD de links — UI (RHF + Zod) + 4 Server Actions (`createLink`/`updateLink`/`deleteLink`/`toggleLinkVisibility`)
- **2.6** Drag-and-drop reorder (dnd-kit) + RPC `reorder_links` transacional
- **2.7** Página pública SSR `/@username` — renderiza profile + links visíveis com tema

### Epic 3 — Temas e Refino de UX

- **3.1** Arquitetura tokens e tema — `@custom-variant dark` + design tokens em `app/globals.css`
- **3.2** Três presets de tema (light/dark/brand) + WCAG AA gate via `scripts/check-contrast.mjs`
- **3.3** UI seleção de tema — `ThemePicker` + Server Action `updatePageTheme`
- **3.4** Conclusão design system — todos os primitives shadcn + avatar upload (Storage bucket)
- **3.5** Passada Performance/A11y — Lighthouse CI workflow + Vercel Analytics + smoke a11y

### Epic 4 — Analytics e Insights

- **4.1** Schema `click_events` + `/api/track/click` Route Handler + RLS + pseudonimização SHA-256+salt
- **4.2** Schema `page_views` + `/api/track/view` + `ViewBeacon` client + dedup window 30min
- **4.3** Aggregations SQL — 4 views (link_clicks_7d/30d + page_views_7d/30d) + 2 helper RPCs (`get_page_views_series` + `get_clicks_series`)
- **4.4** UI `/dashboard/analytics` — 4 cards (totais lifetime + 30d) + chart 7d/30d (recharts + URL state toggle) + tabela ordenada
- **4.5** Account Module — `/dashboard/account` page + 2 Server Actions (`exportAccountData` blob JSON + `deleteAccount` cascade 5 tabelas via `auth.users` ON DELETE CASCADE) + Storage cleanup

### Infraestrutura

- **CI/CD:** GitHub Actions workflows (`ci.yml` + `lighthouse.yml` + `pr-automation.yml`)
- **Database:** 9 migrations Postgres (`0001..0009`) + cascade chain cobrindo 5 FKs
- **Storage:** Bucket `avatars` (public, 1MB limit, jpg/png/webp) com RLS owner-only
- **Auth:** Supabase Auth + middleware refresh + 4 auth guard layers (middleware/layout/page/action)
- **Hosting:** Vercel Preview Deployments + Lighthouse CI gate (runs:3 mediana, ≥0.85 em 4 categories)
- **Quality:** typecheck/lint/test-unit/test-components/test-integration/build/gitleaks/audit como required status checks

### Tech Stack

- **Frontend:** Next.js 16.2.5 (Turbopack) + React 19 + TypeScript strict
- **Styling:** Tailwind CSS 4 + design tokens + shadcn/ui + Base UI primitives
- **Forms:** React Hook Form + Zod resolvers
- **Charts:** recharts 3.8.1 (apenas em `/dashboard/analytics`)
- **Toast:** Sonner via `lib/toast` facade
- **Drag-and-drop:** dnd-kit
- **Database/Auth/Storage:** Supabase (Postgres 15 + PostgREST + Auth + Storage)
- **Testing:** Vitest 4 + Testing Library + jsdom + Supabase JS (contra `biolink-dev` substrate)
- **Package manager:** pnpm

### Estatísticas

- **51 commits** (35 features + 16 chores de close-story / docs)
- **22 PRs merged** (#2 a #22)
- **9 migrations** Postgres aplicadas
- **188 component tests** + **160 integration tests** (33 + 18 arquivos)
- **15 pages** geradas no build (3 static + 12 dynamic)
- **22 stories** entregues através de **4 epics**

### LGPD Compliance

- **FR15** (exclusão de conta) — hard-delete em cascade DB-side + Storage cleanup
- **FR16** (exportação de dados) — JSON completo owner-side com warning de pseudonimização

### Backlog Aberto (deferred para Phase 2)

- **[STORY-3.5-F2]** MEDIUM — UI de edição de `display_name`/`bio` em `/dashboard/profile`
- **[STORY-4.1-F1]** LOW — Batch fix `auth_rls_initplan` em 9 policies
- **[STORY-4.3-F1]** LOW — Batch fix `function_search_path_mutable` em 3 funções
- **[STORY-3.5-F1]** LOW — Monitorar margem apertada de bundle da página pública
- **[STORY-3.1-F1]** LOW — Refactor `@custom-variant dark` para eliminar classe `.dark`
- **[STORY-3.2-F1]** LOW — Refactor `scripts/check-contrast.mjs` para parser CSS automatizado

---

[1.0.0]: https://github.com/helionj/new-biolink/releases/tag/v1.0.0
