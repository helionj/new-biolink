---
title: Story Backlog
description: Follow-up tasks, technical debt e oportunidades de otimização identificadas durante stories, dev e QA
owner: '@po (Pax)'
created: 2026-05-15
last_updated: 2026-05-26 (Story 4.1 merged; STORY-4.1-F1 + STORY-3.5-F3 added)
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

#### [STORY-4.1-F1] Batch fix `auth_rls_initplan` — substituir `auth.uid()` direto por `(select auth.uid())` em 8 policies

- **Source**: Story 4.1 QA Gate PERF-001 (Quinn — `docs/qa/gates/4.1-schema-click-events-tracking.yml`) — 2026-05-26
- **Priority**: 🟢 LOW
- **Effort**: ~0.5 story de tech-debt (complexity S — 1 migration 0008+ companheira reescrevendo 8 policies já existentes; sem mudança de schema/dados)
- **Status**: 📋 TODO
- **Assignee**: @data-engineer (Dara) — gate @qa (regressão de RLS via suítes integration existentes em `tests/integration/rls/`)
- **Sprint**: _A definir (`*backlog-schedule`)_ — não prioritário enquanto volume de cada tabela for < 100K rows (overhead é proporcional ao tamanho do scan)
- **Description**: O Supabase advisor `auth_rls_initplan` detecta que `auth.uid()` é chamado **direto no predicado** das policies em vez de `(select auth.uid())`, causando re-evaluation por linha em scans amplos (overhead linear, não otimizável pelo planner). Story 4.1 adicionou a 8ª policy com esse padrão (`click_events_select_own`) — todas as 7 anteriores herdaram o mesmo de `0002_profiles.sql`, `0003_pages.sql` e `0004_links.sql`: `profiles_update_own`, `pages_select_own`, `pages_update_own`, `links_select_own`, `links_insert_own`, `links_update_own`, `links_delete_own`. **Não é regressão da 4.1** — é coerência arquitetural; o índice composto `idx_click_events_link_id_clicked_at` da 0007 mitiga o custo prático. Fix canônico Supabase: substituir `auth.uid()` por `(select auth.uid())` no `USING`/`WITH CHECK` — o planner converte a subquery em InitPlan (1 execução por scan).
- **Success Criteria**:
  - [ ] Criar `supabase/migrations/0008_rls_initplan_fix.sql` (companheira; sem mudar lógica de autorização)
  - [ ] Reescrever as 8 policies via `DROP POLICY IF EXISTS` + `CREATE POLICY` com `(select auth.uid())` em todos os predicados que hoje usam `auth.uid()` direto
  - [ ] Criar `supabase/rollbacks/0008_rls_initplan_fix_rollback.sql` que restaura as policies originais (idempotente, ordem reversa)
  - [ ] Suítes `tests/integration/rls/*.test.ts` (profiles, pages, links, click_events) continuam 100% verdes — zero mudança de comportamento de autorização esperada
  - [ ] `supabase get_advisors performance` retorna **0 lints** de `auth_rls_initplan` após apply
  - [ ] `pnpm exec supabase db push --linked` aplica limpo; `pnpm db:types` sem diff (policies não mudam tipos)
- **Risk if not done**: LOW — overhead atual é desprezível em volume MVP (< 1K rows por tabela user-data); só vira problema mensurável quando scans amplos sobre `click_events` ultrapassarem ~10K-100K rows por owner. Captura em Lighthouse CI / Vercel Analytics improvável (RLS roda em DB, não no edge). Detecção real só viria via `pg_stat_statements` em produção sob carga.
- **Acceptance**: 8 policies reescritas com `(select auth.uid())`; advisor retorna 0 lints `auth_rls_initplan`; suítes RLS integration verdes; sem rollback necessário.

#### [STORY-3.5-F3] Estabilizar Lighthouse CI — `runs: 1` → `runs: 3` mediana para reduzir flake na landing borderline

- **Source**: Story 4.1 PR #18 — lighthouse falhou no 1º run (Performance `/` = 0.80, threshold 0.85) e passou no rerun com config idêntica + mesmo deploy Vercel — 2026-05-26
- **Priority**: 🟢 LOW
- **Effort**: ~0 (1-line edit em `.lighthouserc.json` + 1 mudança de assertion strategy; sem código novo)
- **Status**: 📋 TODO
- **Assignee**: @devops (Gage) — gate @qa (regressão de gate quality em PRs subsequentes)
- **Sprint**: contínuo (não-bloqueante; race condition manifesta esporadicamente)
- **Description**: O workflow `.github/workflows/lighthouse.yml` (Story 3.5 Task 6) usa `.lighthouserc.json` com `runs: 1` — single-run Lighthouse é **conhecidamente flaky** em scores borderline. Durante o PR #18 da Story 4.1, o 1º run reportou `categories.performance = 0.80` na landing `/` (5 pontos abaixo do threshold 0.85 do Story 3.5); o rerun manual passou com config idêntica — confirmando flake (não regressão). Causa raiz: combinação de (a) bundle baseline da landing em 199.06 KB gz (margem de ~1 KB do threshold AC3 — `[STORY-3.5-F1]`), (b) cold-start variável do deploy Vercel preview, (c) CPU contention no GitHub Actions runner, (d) single-run sem estatística agregada. Lighthouse oficialmente recomenda `runs: 3` com asserção sobre **median** para reduzir desvio padrão de score em ~60-70%.
- **Success Criteria**:
  - [ ] Editar `.lighthouserc.json`: `"ci": { "collect": { "numberOfRuns": 3 }, "assert": { "assertMatrix": [{ "matchingUrlPattern": ".*", "assertions": { ... }, "aggregationMethod": "median" }] } }` (ou equivalente Lighthouse CI 0.13+)
  - [ ] Manter os mesmos thresholds (`minScore: 0.85` em 4 categorias) — o ajuste é estatístico, não relaxa o gate
  - [ ] Documentar o motivo no header do `.lighthouserc.json` (`// runs: 3 + median — reduz flake em scores borderline (PR #18 evidência)`)
  - [ ] Tempo de execução do job sobe de ~1m → ~3m (3× runs sequenciais) — aceitável vs. ruído de retries manuais
  - [ ] Próximo PR que toque `app/**` ou `components/**` valida o novo comportamento (não regredir scores nem mascarar regressões reais)
- **Risk if not done**: LOW (incômodo, não-bloqueante) — Lighthouse continua advisory check (não está em `required_status_checks` do branch protection da `main`); flakes futuros vão requerer `gh run rerun` manual por @devops em cada incidência. Para PRs que tocam `app/[username]/**` ou `components/public/**` (gate efetivo do bundle), cada flake "cria" um falso alarme que custa ~1-2 min de investigação + 1m de rerun.
- **Acceptance**: `.lighthouserc.json` configurado com 3 runs + mediana; PR subsequente passa no 1º run consistentemente (3 PRs consecutivos sem rerun manual confirma fix); falsos alarmes de flake desaparecem dos relatórios de CI.

---

## 📊 Statistics

| Métrica                  | Valor      |
| ------------------------ | ---------- |
| Total de itens ativos    | 6          |
| 🔴 HIGH                  | 0          |
| 🟡 MEDIUM                | 1          |
| 🟢 LOW                   | 5          |
| ✅ DONE (não arquivados) | 1          |
| Última atualização       | 2026-05-26 |

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
| 2026-05-26 | ADD    | `[STORY-4.1-F1]` Batch fix `auth_rls_initplan` em 8 policies (PERF-001 do QA gate Story 4.1)                       | Pax (po)      |
| 2026-05-26 | ADD    | `[STORY-3.5-F3]` Estabilizar Lighthouse CI (`runs: 1` → 3 + mediana) — evidência de flake no PR #18                | Gage (devops) |
| 2026-05-26 | NOTE   | Story 4.2 `[STORY-4.2-prep]` — AC5 forward-looking: schema `page_views` habilita agregações 4.3 + dashboard 4.4    | Dex (dev)     |
