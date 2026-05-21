---
title: Story Backlog
description: Follow-up tasks, technical debt e oportunidades de otimização identificadas durante stories, dev e QA
owner: '@po (Pax)'
created: 2026-05-15
last_updated: 2026-05-20
---

# Story Backlog

Rastreio centralizado de trabalho diferido: follow-ups, dívida técnica e otimizações.
Itens são adicionados via `@po *backlog-add` e priorizados em `*backlog-review`.

**Tipos:** `F` = follow-up · `O` = optimization · `T` = technical-debt
**Status:** 📋 TODO · 🔄 IN PROGRESS · ✅ DONE · 🗄️ ARCHIVED

---

## 🔴 HIGH Priority

_Nenhum item._

---

## 🟡 MEDIUM Priority

#### [STORY-1.9-F1] Story de CI dedicada — Lighthouse CI automatizado (`lighthouse.yml`)

- **Source**: PO validação Story 1.9 (`*validate-story-draft 1.9`, DP-1) — 2026-05-15
- **Priority**: 🟡 MEDIUM
- **Effort**: ~1 story dedicada (complexity M)
- **Status**: 📋 TODO
- **Assignee**: @devops (Gage) / @dev — gate @architect (infra CI)
- **Sprint**: _A definir (`*backlog-schedule`)_
- **Description**: A Story 1.9 satisfez AC4 ("Lighthouse ≥ 90 nas 4 categorias na URL de produção") por **evidência manual** registrada no Dev Agent Record (padrão handoff 1.5–1.8). A automação via `.github/workflows/lighthouse.yml` foi **diferida** desta story (DP-1) porque: (1) AC4 diz "na URL de produção", não "automatizado no CI" (≠ AC6); (2) workflow Lighthouse com tratamento do timing assíncrono do deploy Vercel é trabalho de infra CI não-trivial; (3) manter 1.9 em complexity M e focada na landing/canary. A Story 1.3 (pipeline CI/CD, **Done**) escopou CI sem Lighthouse; arch §Unified Project Structure (~L1580) + §CI/CD Pipeline (~L598) preveem "Lighthouse CI em rotas-chave" — esta é a story que materializa esse componente.
- **Success Criteria**:
  - [ ] `.github/workflows/lighthouse.yml` criado (`treosh/lighthouse-ci-action` ou `@lhci/cli`) com asserts ≥ 0.9 para Performance, Accessibility, Best Practices e SEO
  - [ ] Trigger trata o timing assíncrono do deploy Vercel (ex.: `deployment_status` da Vercel, ou poll/retry contra a URL de prod)
  - [ ] Roda contra `https://new-biolink.vercel.app` (URL de prod, NFR18)
  - [ ] Sem secrets versionados (NFR10); job não bloqueia merge se Vercel ainda não deployou (graceful)
  - [ ] @devops revisa o workflow antes do PR; `git push`/`gh pr create` permanecem @devops-exclusivos
- **Risk if not done**: LOW — AC4 coberto por evidência manual em cada handoff; sem automação, regressões de performance/SEO entre deploys não são detectadas automaticamente (detecção manual depende do owner rodar Lighthouse).
- **Acceptance**: Workflow Lighthouse verde em `main` validando os 4 scores ≥ 90 na URL de produção, com tratamento robusto do deploy assíncrono.

---

## 🟢 LOW Priority

#### [STORY-3.1-F1] Refactor `@custom-variant dark` para eliminar a classe `.dark`

- **Source**: @sm DEV-1 da Story 3.1 + endosso PO v0.2 + QA gate PASS Story 3.1 (OBS-003) — 2026-05-20
- **Priority**: 🟢 LOW
- **Effort**: ~1 story de tech-debt (complexity M — toca todos os primitives shadcn)
- **Status**: 📋 TODO
- **Assignee**: @dev — gate @architect (decisão de design system) + @qa (regressão de primitives)
- **Sprint**: _A definir (`*backlog-schedule`)_ — não prioritário até primitives shadcn estabilizarem (post Story 3.4)
- **Description**: Hoje a Story 3.1 reconciliou `[data-theme="dark"]` e `.dark` via seletor composto `[data-theme="dark"], .dark { … }` em `app/globals.css:63-64`. Funciona sem drift de valores (DEV-1), mas mantém a dualidade — duas formas de ativar dark mode coexistindo. Razão pragmática: o `@custom-variant dark (&:is(.dark *))` em `app/globals.css:4` alimenta o `dark:` variant do Tailwind 4 a partir da **classe `.dark`**, e os primitives shadcn copiados em Story 1.5 (`button.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, etc.) podem usar `dark:` variants internamente. Redefinir o `@custom-variant dark (&:is([data-theme="dark"] *))` elimina a classe `.dark` completamente, mas requer regressão em todos os primitives.
- **Success Criteria**:
  - [ ] `@custom-variant dark` redefinido para `(&:is([data-theme="dark"] *))` em `app/globals.css`
  - [ ] Bloco `.dark` removido do seletor composto (`[data-theme="dark"], .dark` → `[data-theme="dark"]`)
  - [ ] Regressão visual em todos os primitives shadcn em ambos os temas (light/dark) — Card, Button, Input, Dialog, DropdownMenu, Tooltip, Sheet, etc.
  - [ ] `pnpm test` mantém baseline (zero regressão em components/integration)
  - [ ] `pnpm build` success; `/dev/themes` continua renderizando os 3 presets
- **Risk if not done**: LOW — dualidade `.dark` ↔ `[data-theme="dark"]` é cosmética; ambos os ativadores apontam para o mesmo bloco de tokens (zero drift). Apenas implementação fica mais elegante e reduz superfície cognitiva para novos contribuidores.
- **Acceptance**: Primitives shadcn renderizam idênticos pré-pós refactor em ambos os temas; `.dark` removida da codebase (apenas `[data-theme="dark"]` aciona dark mode).

---

## 📊 Statistics

| Métrica                  | Valor      |
| ------------------------ | ---------- |
| Total de itens ativos    | 2          |
| 🔴 HIGH                  | 0          |
| 🟡 MEDIUM                | 1          |
| 🟢 LOW                   | 1          |
| ✅ DONE (não arquivados) | 0          |
| Última atualização       | 2026-05-20 |

---

## 📜 Change Log

| Date       | Action | Item                                                                                     | Author   |
| ---------- | ------ | ---------------------------------------------------------------------------------------- | -------- |
| 2026-05-15 | ADD    | `[STORY-1.9-F1]` Lighthouse CI automatizado (diferido de Story 1.9 DP-1)                 | Pax (po) |
| 2026-05-20 | ADD    | `[STORY-3.1-F1]` Refactor `@custom-variant dark` para eliminar `.dark` (DEV-1 Story 3.1) | Pax (po) |
