---
title: Story Backlog
description: Follow-up tasks, technical debt e oportunidades de otimização identificadas durante stories, dev e QA
owner: '@po (Pax)'
created: 2026-05-15
last_updated: 2026-05-25 (Story 3.4 drafted)
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

#### [STORY-3.5-F2] UI de edição de `display_name` e `bio` no dashboard

- **Source**: Story 3.5 Task 5 — gap identificado durante criação do perfil `demo` em produção (Dex/dev + reporte do dono do projeto) — 2026-05-25
- **Priority**: 🟡 MEDIUM
- **Effort**: ~0.5-1 story (complexity S/M — form RHF + Zod + Server Action; segue padrão da `UsernameForm`)
- **Status**: 📋 TODO
- **Assignee**: @sm (draft) → @dev (implement) — gate @qa
- **Sprint**: _A definir (`*backlog-schedule`)_
- **Description**: O schema `profiles` (Story 2.2+) tem `display_name TEXT` e `bio TEXT` nullable, e ambos são renderizados em `components/public/PublicPage.tsx` (L33 `displayName = profile.display_name ?? \`@${profile.username}\``; L61 `{profile.bio && <p>...}`). Porém **não há UI** para editar nenhum dos dois: `/dashboard/profile`só edita`username` (`UsernameForm`) + `avatar` (`AvatarUpload`); `SignupForm`só pede email/username/password/terms. Resultado: usuários reais (não-seed) sempre têm h1 =`@username`(sem display name rico) e sem bio. Detectado quando o dono do projeto tentou popular o perfil`demo` em prod para Task 5 da Story 3.5 e descobriu que a bio "não tinha campo para preencher".
- **Success Criteria**:
  - [ ] Adicionar campos `display_name` (max 80 chars sugerido) e `bio` (textarea, max 280 chars sugerido) ao form de `/dashboard/profile`
  - [ ] Validators Zod em `lib/validators/profile.ts` (limites, trim, opcional)
  - [ ] Server Action `updateProfileMeta` em `server/profile/actions.ts` (padrão da `updateUsername`)
  - [ ] UI segue padrão shadcn Form + RHF (precedente: `UsernameForm`)
  - [ ] Persistência respeita RLS `profiles_update_own` (Story 2.2)
  - [ ] Component test cobre validação + submit happy path + erro
  - [ ] Atualizar perfil `demo` em prod (display_name + bio) após implementação
- **Risk if not done**: MEDIUM — gap UX claro (usuários não conseguem se apresentar além do `@handle`). Não bloqueia ACs de outras stories, mas vazaria como "feature incompleta" no produto. Demo profile em prod fica menos rico para Lighthouse measurement realista (h1 sempre `@demo`, sem bio).
- **Acceptance**: Usuário consegue editar `display_name` + `bio` em `/dashboard/profile`; mudanças refletidas em `/@username` após `router.refresh()`; testes verdes.

#### [STORY-1.9-F1] Story de CI dedicada — Lighthouse CI automatizado (`lighthouse.yml`) ✅ DONE

- **Source**: PO validação Story 1.9 (`*validate-story-draft 1.9`, DP-1) — 2026-05-15
- **Priority**: 🟡 MEDIUM
- **Effort**: ~1 story dedicada (complexity M)
- **Status**: ✅ **DONE** — Materializado via Story 3.5 Task 6 (Gage/devops, 2026-05-25). Criados `.github/workflows/lighthouse.yml` + `.lighthouserc.json`. DEV-6 ratificações: `patrickedqvist/wait-for-vercel-preview@v1.3.1` + preset mobile (default) + `minScore: 0.85` 4 categories + `temporaryPublicStorage: true` (sem secret extra, NFR10 preservado). Smoke do workflow será validado quando o primeiro PR pós-merge for aberto.
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

#### [STORY-3.5-F1] Monitorar margem apertada de bundle da página pública (~1-2 KB)

- **Source**: Story 3.5 §1 Bundle Baseline (Task 1 — Dex) — 2026-05-25
- **Priority**: 🟢 LOW
- **Effort**: ~0 (monitor-only; sem código novo)
- **Status**: 📋 TODO
- **Assignee**: @dev (gate manual em PRs que tocam `app/[username]/**` ou `components/public/**`)
- **Sprint**: contínuo (não-bloqueante)
- **Description**: Em Next 16.2.5 / Turbopack, o First Load JS de `/[username]` está em **198.04 KB gz** e o de `/` em **199.06 KB gz** — abaixo do threshold AC3 (< 200 KB) por margem de apenas ~1-2 KB. Qualquer dependência client-side nova na página pública pode quebrar AC3. O workflow Lighthouse CI da Story 3.5 AC6 cobre indiretamente via score de Performance, mas não checa bundle size explicitamente. A medição é feita manualmente via leitura de `.next/build-manifest.json` + `entryJSFiles` por rota + gzip-9 (DEV-1 da 3.5 — Turbopack omite First Load JS por rota no relatório textual do `pnpm build`).
- **Success Criteria**:
  - [ ] Cada PR que toca `app/[username]/**`, `components/public/**` ou adiciona dependência client-side re-mede First Load JS via script ad-hoc descrito em `docs/a11y-audit.md` §1
  - [ ] Caso a margem passe a < 5 KB ou rompa o threshold, abrir story dedicada de mitigação (RSC isolation, code-split, ou substituição de dep)
- **Risk if not done**: MEDIUM — bundle regression silenciosa quebra AC3 sem ser detectada até o próximo Lighthouse run em prod (que mede score, não bytes).
- **Acceptance**: Convenção respeitada em revisão de PR; documento `docs/a11y-audit.md` §1 mantido atualizado em cada mudança que afete bundle público.

#### [STORY-3.2-F1] Refactor `scripts/check-contrast.mjs` para parser CSS automatizado

- **Source**: @sm DEV-3 da Story 3.2 + execução @dev YOLO Story 3.2 — 2026-05-21
- **Priority**: 🟢 LOW
- **Effort**: ~0.5 story de tech-debt (complexity S — script Node + deps `postcss` ou parser manual)
- **Status**: 📋 TODO
- **Assignee**: @dev — gate @qa (regressão do script)
- **Sprint**: _A definir (`*backlog-schedule`)_ — não prioritário enquanto as 3 paletas forem estáveis
- **Description**: O script `scripts/check-contrast.mjs` (Story 3.2 Task 3) duplica manualmente os hex de `app/globals.css` no objeto `PALETTES`. Qualquer mudança de paleta exige atualização em **dois lugares** — risco de drift silencioso (o gate pode passar com valores stale). Mitigação atual: comentário de header explícito ("MANTER EM SINCRONIA com `app/globals.css`"). Refactor: parser CSS que lê os blocos `[data-theme="..."]` de `globals.css` diretamente e extrai os tokens (`background`, `foreground`, etc.), eliminando duplicação.
- **Success Criteria**:
  - [ ] Script consulta `app/globals.css` (via `postcss` ou parser manual ~150 LOC) em vez de objeto hard-coded
  - [ ] Mantém suporte aos 3 presets sem regressão (27/27 PASS contra a paleta atual)
  - [ ] Detecta automaticamente tokens novos/removidos (não silenciosamente ignora)
  - [ ] `pnpm check:contrast` continua exit 0 quando tudo passa, exit 1 em qualquer FAIL
  - [ ] Comentário de "MANTER EM SINCRONIA" removido do header do script
- **Risk if not done**: LOW — drift entre `globals.css` e `PALETTES` do script é detectável manualmente em code review (diff de PR mostra ambos os arquivos). Risco real só materializa se um PR alterar apenas um dos dois lados sem revisão atenta.
- **Acceptance**: Script lê paletas diretamente do CSS-fonte; mudar uma cor em `globals.css` propaga automaticamente para o gate WCAG sem edit duplicado.

---

## 📊 Statistics

| Métrica                  | Valor      |
| ------------------------ | ---------- |
| Total de itens ativos    | 4          |
| 🔴 HIGH                  | 0          |
| 🟡 MEDIUM                | 1          |
| 🟢 LOW                   | 3          |
| ✅ DONE (não arquivados) | 1          |
| Última atualização       | 2026-05-25 |

---

## 📜 Change Log

| Date       | Action | Item                                                                                                               | Author        |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| 2026-05-15 | ADD    | `[STORY-1.9-F1]` Lighthouse CI automatizado (diferido de Story 1.9 DP-1)                                           | Pax (po)      |
| 2026-05-20 | ADD    | `[STORY-3.1-F1]` Refactor `@custom-variant dark` para eliminar `.dark` (DEV-1 Story 3.1)                           | Pax (po)      |
| 2026-05-21 | ADD    | `[STORY-3.2-F1]` Refactor `scripts/check-contrast.mjs` para parser CSS automatizado (DEV-3 + DEV-5 Story 3.2)      | Dex (dev)     |
| 2026-05-25 | ADD    | `[STORY-3.5-F1]` Monitorar margem apertada de bundle da página pública (Finding MEDIUM Story 3.5 §1)               | Dex (dev)     |
| 2026-05-25 | ADD    | `[STORY-3.5-F2]` UI de edição de `display_name` e `bio` no dashboard (gap funcional Story 3.5 Task 5)              | Dex (dev)     |
| 2026-05-25 | DONE   | `[STORY-1.9-F1]` Lighthouse CI workflow — materializado via Story 3.5 Task 6 (lighthouse.yml + .lighthouserc.json) | Gage (devops) |
