---
title: Story Backlog
description: Follow-up tasks, technical debt e oportunidades de otimização identificadas durante stories, dev e QA
owner: '@po (Pax)'
created: 2026-05-15
last_updated: 2026-05-30 (Epic 5 refresh — 8 stories MEDIUM adicionadas via @po *backlog-add pós validate frontend-spec v0.3)
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

> **Refresh visual Epic 5 — Soft Studio** — 8 stories (5.2-5.9) consolidam ratificação PRD v0.5 (2026-05-29) via `docs/frontend-spec.md` v0.3 (PO validate APPROVED 94%). Source-of-truth canônico do refresh: `docs/frontend-spec.md`. Path crítico: **5.2 → 5.3** (sequenciais); 5.4-5.9 paralelizáveis.

#### [EPIC-5-S2] Story 5.2 — Token swap → Soft Studio palette + DM Sans

- **Source**: `docs/frontend-spec.md` §5.1 Phase 1 (ratificado em PRD v0.5 §UX/Branding 2026-05-29)
- **Priority**: 🟡 MEDIUM
- **Effort**: S — ~3 files (`app/globals.css`, `app/layout.tsx`, `scripts/check-contrast.mjs`)
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **path crítico** (5.3-5.9 dependem do swap de tokens)
- **Spec ref**: §1.2 (3 paletas WCAG AA), §1.3 (DM Sans Variable via `next/font`), §1.4.2 (radius scale), §1.4.3 (shadows), §5.1
- **Risk if not done**: bloqueia 8/8 stories do refresh; identidade permanece "tech indie generic" vs "warm creator studio" ratificado
- **Acceptance**: `pnpm check:contrast` PASS 3 temas; Lighthouse CI ≥ 90; smoke seletivo `/` + `/dashboard` + `/@demo` × 3 temas

#### [EPIC-5-S3] Story 5.3 — Primitives audit (13 shadcn)

- **Source**: `docs/frontend-spec.md` §5.2 Phase 2
- **Priority**: 🟡 MEDIUM
- **Effort**: M — 13 files (1 por primitive em `components/ui/`)
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **path crítico** (depende de 5.2; bloqueia 5.4-5.7 visualmente)
- **Spec ref**: §5.2 (matriz de 13 primitives: radius/cor/state targets); §1.5 (motion patterns para switch/dialog)
- **Risk if not done**: surfaces consumidoras (5.4-5.7) vão herdar primitives com radius/cores antigos; cohesion visual quebrada
- **Acceptance**: `pnpm test:components` (194/194 baseline Story 5.1) MANTÉM verde; snapshot updates aceitos como esperado (não regressão); CodeRabbit gate PASS

#### [EPIC-5-S4] Story 5.4 — Landing + Auth pages Soft Studio

- **Source**: `docs/frontend-spec.md` §5.3 Phase 3
- **Priority**: 🟡 MEDIUM
- **Effort**: M — ~5 files (`app/page.tsx`, `app/(auth)/signup`, `/login`, `/reset-password`)
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **paralelizável** com 5.5/5.6/5.7
- **Spec ref**: §2.1 (Landing), §2.2 (Signup), §2.3 (Login), §2.4 (Reset Password); §3.7 (form feedback)
- **Risk if not done**: primeira impressão do produto fica em paleta antiga; landing canary (Story 1.9) mantém branding violet seed
- **Acceptance**: Lighthouse CI ≥ 90; LCP `/` < 2.0s (NFR1); a11y WCAG AA mantida; smoke seletivo

#### [EPIC-5-S5] Story 5.5 — Dashboard core (layout + links)

- **Source**: `docs/frontend-spec.md` §5.3 Phase 3
- **Priority**: 🟡 MEDIUM
- **Effort**: M — ~5 files (`app/dashboard/layout.tsx`, `page.tsx`, `components/links/*`)
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **paralelizável**
- **Spec ref**: §2.5 (Dashboard/Links), §3.1 (drag-drop com spring overshoot), §3.2 (edição inline)
- **Risk if not done**: surface principal autenticada mantém visual antigo
- **Acceptance**: `pnpm test:components` PASS; component tests de `LinkRow`/`AddLinkButton` atualizados; smoke `/dashboard` × 3 temas

#### [EPIC-5-S6] Story 5.6 — Profile + Theme + Account + rebrand "Brand" → "Vibrante"

- **Source**: `docs/frontend-spec.md` §5.3 Phase 3; resolução Q3 §6
- **Priority**: 🟡 MEDIUM
- **Effort**: M — ~4 files + label-only rebrand
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **paralelizável**
- **Spec ref**: §2.6 (Profile), §2.7 (Theme — incl. label change), §2.9 (Account); Q3 §6 (token `brand` preservado; só UI copy)
- **Risk if not done**: rebrand "Vibrante" não ship; surface Profile refresh de 5.1 mantém char counters em escala antiga
- **Acceptance**: token interno `brand` preservado em `globals.css` + DB enum + `lib/theme.ts`; tests que assertam "Brand" atualizados para "Vibrante"; smoke `/dashboard/theme` cycle 3 temas

#### [EPIC-5-S7] Story 5.7 — Analytics + Public page

- **Source**: `docs/frontend-spec.md` §5.3 Phase 3
- **Priority**: 🟡 MEDIUM
- **Effort**: M — ~3 files
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **paralelizável**
- **Spec ref**: §2.8 (Analytics — 4 stat cards + chart plum line + peach gradient), §2.10 (Public `/@username` — radius 16, avatar 96px)
- **Risk if not done**: público (visitor surface) mantém visual antigo — perde diferenciação "warm creator studio"
- **Acceptance**: LCP `/@username` < 2.0s; bundle público ≤ 180 KB gz; Lighthouse CI público ≥ 90; smoke `/@demo` × 3 temas

#### [EPIC-5-S8] Story 5.8 — Motion + polish (micro-interactions, easing)

- **Source**: `docs/frontend-spec.md` §5.4 Phase 4
- **Priority**: 🟡 MEDIUM
- **Effort**: S — ~6 files (motion tokens + switch + drag-drop spring + toast + dialog scale + skeleton)
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **paralelizável** (depende de 5.3 primitives base)
- **Spec ref**: §1.5 (motion durations + easing + reserved patterns), §3.1-3.9 (interaction refinements)
- **Risk if not done**: feel "warm creator studio" fica em palette-only sem movimento — perde a 4ª princípio "Movement is meaning"
- **Acceptance**: smoke macOS Reduce Motion ON/OFF; 60fps target em motion (DevTools profiler); `prefers-reduced-motion` fallback verificado

#### [EPIC-5-S9] Story 5.9 — Logo + favicon (wordmark "biolink ★")

- **Source**: `docs/frontend-spec.md` §5.5 Phase 5; resoluções Q4 + Q5 §6
- **Priority**: 🟡 MEDIUM
- **Effort**: S — ~5 new files (`favicon.ico` 32+16, `icon.png` 512, `apple-icon.png` 180, `Wordmark.tsx`, `layout.tsx` meta tags)
- **Status**: 📋 TODO
- **Assignee**: TBD via `*backlog-schedule` — **paralelizável**
- **Spec ref**: §1.6 (wordmark `biolink` lowercase + ★ asterisco placeholder); Q4 §6 (logomark real diferido Phase 2); Q5 §6 (all-lowercase)
- **Risk if not done**: tab/share dos perfis públicos mantém favicon Next default; refresh visual "incompleto" sem brand mark
- **Acceptance**: favicon visível em Chrome/Safari/Firefox; OG meta tags atualizados; component test `Wordmark.tsx` cobre PT-BR copy

---

#### [STORY-3.5-F2] UI de edição de `display_name` e `bio` no dashboard ✅ DONE

- **Source**: Story 3.5 Task 5 — gap identificado durante criação do perfil `demo` em produção (Dex/dev + reporte do dono do projeto) — 2026-05-25
- **Priority**: 🟡 MEDIUM
- **Effort**: ~0.5-1 story (complexity S/M — form RHF + Zod + Server Action; segue padrão da `UsernameForm`)
- **Status**: ✅ **DONE** — Implementada como **Story 5.1** (Epic 5 — Polish & Gaps Pós-MVP) por @dev em 2026-05-29. Limites finais reconciliados ao PRD §FR13: `display_name ≤ 50` (não 80 como sugerido aqui) + `bio ≤ 280`. Padrão de implementação idêntico à `updateUsername`/`UsernameForm` (REUSE). Sem mudança de schema (colunas + CHECK constraints já existiam em `0002_profiles.sql:68-69` desde Story 1.4).
- **Assignee**: ~~@pm (formalizar Epic 5 + Story 5.1 no PRD)~~ ✅ → ~~@sm (draft)~~ ✅ → ~~@po (validate-story-draft)~~ ✅ → ~~@dev (implement)~~ ✅ — gate @qa pendente
- **Sprint**: **v1.1** (primeira story pós-v1.0.0 release)
- **Description**: O schema `profiles` (Story 2.2+) tem `display_name TEXT` e `bio TEXT` nullable, e ambos são renderizados em `components/public/PublicPage.tsx` (L33 `displayName = profile.display_name ?? \`@${profile.username}\``; L61 `{profile.bio && <p>...}`). Porém **não há UI** para editar nenhum dos dois: `/dashboard/profile`só edita`username` (`UsernameForm`) + `avatar` (`AvatarUpload`); `SignupForm`só pede email/username/password/terms. Resultado: usuários reais (não-seed) sempre têm h1 =`@username`(sem display name rico) e sem bio. Detectado quando o dono do projeto tentou popular o perfil`demo` em prod para Task 5 da Story 3.5 e descobriu que a bio "não tinha campo para preencher".
- **Success Criteria**:
  - [x] Adicionar campos `display_name` (max **50** chars per FR13) e `bio` (textarea, max 280 chars) ao form de `/dashboard/profile`
  - [x] Validators Zod em `lib/validators/profile.ts` (limites, trim, opcional; helper `emptyToNull` normaliza `''` → `null`)
  - [x] Server Action `updateProfileMeta` em `server/profile/actions.ts` (padrão da `updateUsername` + `revalidateUserSurface`)
  - [x] UI segue padrão shadcn Form + RHF (precedente: `UsernameForm`); nova primitive `components/ui/textarea.tsx`
  - [x] Persistência respeita RLS `profiles_update_own` (Story 2.2)
  - [x] Component test cobre validação + submit happy path + erro (6 testes)
  - [x] Atualizar perfil `demo` em prod (display_name + bio) após implementação — concluído 2026-05-29: `display_name="Demostenes"` + `bio="Meu nome é Demostenes"` validado via REST + SSR `/@demo` (Gage/devops)
- **Risk if not done**: MEDIUM — gap UX claro (usuários não conseguem se apresentar além do `@handle`). Não bloqueia ACs de outras stories, mas vazaria como "feature incompleta" no produto. Demo profile em prod fica menos rico para Lighthouse measurement realista (h1 sempre `@demo`, sem bio).
- **Acceptance**: Usuário consegue editar `display_name` + `bio` em `/dashboard/profile`; mudanças refletidas em `/@username` após `router.refresh()` + `revalidateUserSurface`; testes verdes.

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

#### [EPIC-5-PHASE2-LOGO] Logomark real (substitui ★ asterisco placeholder)

- **Source**: `docs/frontend-spec.md` resolução Q4 §6 (2026-05-29) — placeholder ★ aprovado para Story 5.9 (MVP refresh); logomark customizado diferido
- **Priority**: 🟢 LOW
- **Effort**: TBD — investigação de brand (design exploratório + iterações + validação owner)
- **Status**: 📋 TODO (Phase 2, post v1.x stabilization)
- **Assignee**: @ux-design-expert (Uma) quando Phase 2 ativada
- **Description**: Story 5.9 ship ★ asterisco como wordmark companion para MVP refresh (placeholder coerente com mood "indie/friendly"). Logomark real (espiral, fita, marca-página, monograma, etc.) é investimento de brand que requer exploração dedicada — fora do escopo do refresh visual incremental. Produto é open-source MVP, audiência inicial = 5+ amigos/conhecidos (escala íntima), sinal de marca não é gate de adoção.
- **Risk if not done**: zero — ★ é coerente com mood até reavaliação Phase 2; sem impacto funcional ou de a11y.
- **Acceptance**: TBD quando Phase 2 ativada — exploração ≥ 3 direções + validação owner + ratificação PRD amend.

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

#### [STORY-4.1-F1] Batch fix `auth_rls_initplan` — substituir `auth.uid()` direto por `(select auth.uid())` em 9 policies

- **Source**: Story 4.1 QA Gate PERF-001 (Quinn — `docs/qa/gates/4.1-schema-click-events-tracking.yml`) — 2026-05-26. **Expandido em 2026-05-27** ao close-story 4.2: Story 4.2 QA Gate PERF-001 (Quinn — `docs/qa/gates/4.2-schema-page-views-tracking.yml`) adicionou a 9ª policy ao escopo (`page_views_select_own`).
- **Priority**: 🟢 LOW
- **Effort**: ~0.5 story de tech-debt (complexity S — 1 migration 0009+ companheira reescrevendo 9 policies já existentes; sem mudança de schema/dados)
- **Status**: 📋 TODO
- **Assignee**: @data-engineer (Dara) — gate @qa (regressão de RLS via suítes integration existentes em `tests/integration/rls/`)
- **Sprint**: _A definir (`*backlog-schedule`)_ — não prioritário enquanto volume de cada tabela for < 100K rows (overhead é proporcional ao tamanho do scan)
- **Description**: O Supabase advisor `auth_rls_initplan` detecta que `auth.uid()` é chamado **direto no predicado** das policies em vez de `(select auth.uid())`, causando re-evaluation por linha em scans amplos (overhead linear, não otimizável pelo planner). Story 4.1 adicionou a 8ª policy com esse padrão (`click_events_select_own`); Story 4.2 adicionou a 9ª (`page_views_select_own`, ratificada como DEV-3 pelo PO em v0.2 da story 4.2 — coerência arquitetural deliberada). Todas as 7 anteriores herdaram o mesmo de `0002_profiles.sql`, `0003_pages.sql` e `0004_links.sql`: `profiles_update_own`, `pages_select_own`, `pages_update_own`, `links_select_own`, `links_insert_own`, `links_update_own`, `links_delete_own`. **Não é regressão de 4.1 nem de 4.2** — é coerência arquitetural; os índices compostos `idx_click_events_link_id_clicked_at` (0007) e `idx_page_views_page_id_viewed_at` (0008) mitigam o custo prático. Fix canônico Supabase: substituir `auth.uid()` por `(select auth.uid())` no `USING`/`WITH CHECK` — o planner converte a subquery em InitPlan (1 execução por scan).
- **Success Criteria**:
  - [ ] Criar `supabase/migrations/0009_rls_initplan_fix.sql` (companheira; sem mudar lógica de autorização)
  - [ ] Reescrever as 9 policies via `DROP POLICY IF EXISTS` + `CREATE POLICY` com `(select auth.uid())` em todos os predicados que hoje usam `auth.uid()` direto (inclui `page_views_select_own`)
  - [ ] Criar `supabase/rollbacks/0009_rls_initplan_fix_rollback.sql` que restaura as policies originais (idempotente, ordem reversa)
  - [ ] Suítes `tests/integration/rls/*.test.ts` (profiles, pages, links, click_events, page_views) continuam 100% verdes — zero mudança de comportamento de autorização esperada
  - [ ] `supabase get_advisors performance` retorna **0 lints** de `auth_rls_initplan` após apply
  - [ ] `pnpm exec supabase db push --linked` aplica limpo; `pnpm db:types` sem diff (policies não mudam tipos)
- **Risk if not done**: LOW — overhead atual é desprezível em volume MVP (< 1K rows por tabela user-data); só vira problema mensurável quando scans amplos sobre `click_events`/`page_views` ultrapassarem ~10K-100K rows por owner. Captura em Lighthouse CI / Vercel Analytics improvável (RLS roda em DB, não no edge). Detecção real só viria via `pg_stat_statements` em produção sob carga.
- **Acceptance**: 9 policies reescritas com `(select auth.uid())`; advisor retorna 0 lints `auth_rls_initplan`; suítes RLS integration verdes; sem rollback necessário.

#### [STORY-4.3-F1] Batch fix `function_search_path_mutable` — adicionar `SET search_path = public, pg_temp` em 3 funções

- **Source**: Story 4.3 QA Gate SEC-001 (Aria — `docs/qa/gates/4.3-agregacoes-sql-views-7d-30d.yml`) — 2026-05-27. Lint 0011 do Supabase advisor introduzido em `public.get_link_clicks_series(uuid, integer)` e `public.get_page_views_series(uuid, integer)`; lint idêntico em `public.set_updated_at` herdado desde Story 1.4. Total: 3 funções afetadas.
- **Priority**: 🟢 LOW
- **Effort**: ~0.25 story de tech-debt (complexity XS — 1 migration `0010_function_search_path_fix.sql` com 3 `ALTER FUNCTION` statements; sem mudança de lógica; sem novo teste — apenas verificação via `get_advisors security` post-apply). Pode ser **consolidado com `[STORY-4.1-F1]`** numa migration única `0010_db_hardening.sql` (12 `DROP POLICY/CREATE POLICY` + 3 `ALTER FUNCTION` — ambos batch fixes de hardening advisor-driven sem mudança de comportamento).
- **Status**: 📋 TODO
- **Assignee**: @data-engineer (Dara) — gate @qa (regressão zero esperada; suítes integration existentes confirmam comportamento preservado)
- **Sprint**: _A definir (`*backlog-schedule`)_ — não prioritário; advisor é WARN não ERROR; sem impact mensurável em prod MVP
- **Description**: O Supabase advisor `function_search_path_mutable` (lint 0011) detecta funções `public.*` sem `search_path` definido explicitamente — risco teórico de schema-shadowing attacks (atacante cria `pg_catalog.now()` ou similar no schema do user e a função vulnerável invoca a versão errada). Severidade real LOW nas 3 funções afetadas: (a) **`set_updated_at`** (Story 1.4) é trigger function de manutenção — só roda via `UPDATE` em tabelas user-owned, atacante já tem acesso de write; (b/c) **`get_link_clicks_series`** e **`get_page_views_series`** (Story 4.3) são `LANGUAGE sql SECURITY INVOKER STABLE` — atacante só ataca próprio schema (sem elevação de privilégio); Postgres inline-otimiza one-liners com search_path do caller; tabelas referenciadas (`page_views`, `click_events`) qualificadas implicitamente como `public`. Fix canônico Supabase: `ALTER FUNCTION ... SET search_path = public, pg_temp` — fixa o search_path no contexto da função sem mudar lógica nem comportamento observable.
- **Success Criteria**:
  - [ ] Criar `supabase/migrations/0010_function_search_path_fix.sql` (ou consolidar em `0010_db_hardening.sql` com `[STORY-4.1-F1]`) com 3 statements `ALTER FUNCTION public.<name>(args) SET search_path = public, pg_temp;` para `set_updated_at()`, `get_link_clicks_series(uuid, integer)` e `get_page_views_series(uuid, integer)`.
  - [ ] Criar `supabase/rollbacks/0010_function_search_path_fix_rollback.sql` que executa `ALTER FUNCTION ... RESET search_path` em todas as 3 funções (idempotente).
  - [ ] Avaliar empiricamente se `reorder_links` (0005, mesmo modelo SECURITY INVOKER STABLE) é flagged pelo advisor — se sim, incluir no batch (atualizar count para 4 funções).
  - [ ] `supabase get_advisors security` retorna **0 lints** `function_search_path_mutable` após apply.
  - [ ] Suítes integration `tests/integration/db/aggregations.test.ts` + `tests/integration/rls/aggregations.test.ts` + `tests/integration/profiles.test.ts` (que invoca `set_updated_at` via trigger) continuam 100% verdes — zero mudança de comportamento.
  - [ ] `pnpm exec supabase db push --linked` aplica limpo; `pnpm db:types` sem diff (search_path não afeta tipos PostgREST).
- **Risk if not done**: LOW — schema-shadowing attack exige (a) atacante com privilégio CREATE em algum schema acessível ao caller (não há), (b) função vulnerável invocando builtin sem qualificar schema (one-liners SQL são robustos) e (c) flag de WARN não ERROR no advisor. Detectável apenas via review manual de advisor; sem impact em CI/Lighthouse/Vercel Analytics; sem regressão de UX/perf.
- **Acceptance**: 3 funções com `search_path` fixado; advisor retorna 0 lints `function_search_path_mutable`; suítes integration verdes; tipos sem diff; rollback testado.

#### [STORY-3.5-F3] Estabilizar Lighthouse CI — `runs: 1` → `runs: 3` mediana para reduzir flake na landing borderline ✅ DONE

- **Source**: Story 4.1 PR #18 — lighthouse falhou no 1º run (Performance `/` = 0.80, threshold 0.85) e passou no rerun com config idêntica + mesmo deploy Vercel — 2026-05-26
- **Priority**: 🟢 LOW
- **Effort**: ~0 (1-line edit em `.lighthouserc.json` + 1 mudança de assertion strategy; sem código novo)
- **Status**: ✅ DONE — aplicado no PR #19 (Story 4.2) após evidência adicional de flake severo (run 1: perf `/` = 0.81; rerun: 0.66 — variance 0.15 em 8min, código idêntico, mesmo deploy). Materializado em `.lighthouserc.json` (`collect.numberOfRuns: 3` + `assert.assertMatrix[0].aggregationMethod: "median"`) + `.github/workflows/lighthouse.yml` (`runs: 3` explícito para garantir override do default 1 da action). Validação no próximo PR.
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
| Total de itens ativos    | 15         |
| 🔴 HIGH                  | 0          |
| 🟡 MEDIUM                | 8          |
| 🟢 LOW                   | 7          |
| ✅ DONE (não arquivados) | 2          |
| Última atualização       | 2026-05-30 |

---

## 📜 Change Log

| Date       | Action    | Item                                                                                                                                                                                                                                                                                                                                               | Author           |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 2026-05-15 | ADD       | `[STORY-1.9-F1]` Lighthouse CI automatizado (diferido de Story 1.9 DP-1)                                                                                                                                                                                                                                                                           | Pax (po)         |
| 2026-05-20 | ADD       | `[STORY-3.1-F1]` Refactor `@custom-variant dark` para eliminar `.dark` (DEV-1 Story 3.1)                                                                                                                                                                                                                                                           | Pax (po)         |
| 2026-05-21 | ADD       | `[STORY-3.2-F1]` Refactor `scripts/check-contrast.mjs` para parser CSS automatizado (DEV-3 + DEV-5 Story 3.2)                                                                                                                                                                                                                                      | Dex (dev)        |
| 2026-05-25 | ADD       | `[STORY-3.5-F1]` Monitorar margem apertada de bundle da página pública (Finding MEDIUM Story 3.5 §1)                                                                                                                                                                                                                                               | Dex (dev)        |
| 2026-05-25 | ADD       | `[STORY-3.5-F2]` UI de edição de `display_name` e `bio` no dashboard (gap funcional Story 3.5 Task 5)                                                                                                                                                                                                                                              | Dex (dev)        |
| 2026-05-25 | DONE      | `[STORY-1.9-F1]` Lighthouse CI workflow — materializado via Story 3.5 Task 6 (lighthouse.yml + .lighthouserc.json)                                                                                                                                                                                                                                 | Gage (devops)    |
| 2026-05-26 | ADD       | `[STORY-4.1-F1]` Batch fix `auth_rls_initplan` em 8 policies (PERF-001 do QA gate Story 4.1)                                                                                                                                                                                                                                                       | Pax (po)         |
| 2026-05-26 | ADD       | `[STORY-3.5-F3]` Estabilizar Lighthouse CI (`runs: 1` → 3 + mediana) — evidência de flake no PR #18                                                                                                                                                                                                                                                | Gage (devops)    |
| 2026-05-26 | NOTE      | Story 4.2 `[STORY-4.2-prep]` — AC5 forward-looking: schema `page_views` habilita agregações 4.3 + dashboard 4.4                                                                                                                                                                                                                                    | Dex (dev)        |
| 2026-05-27 | UPDATE    | `[STORY-4.1-F1]` expandido de 8 → 9 policies (inclui `page_views_select_own`) ao close-story 4.2 — PERF-001 gate                                                                                                                                                                                                                                   | Pax (po)         |
| 2026-05-27 | ADD       | `[STORY-4.3-F1]` Batch fix `function_search_path_mutable` em 3 funções (SEC-001 do QA gate Story 4.3 — set_updated_at + 2 helpers novas) — consolidar com STORY-4.1-F1                                                                                                                                                                             | Aria (architect) |
| 2026-05-27 | NOTE      | Story 4.3 AC2 — estratégia "regular views + materialized deferida" registrada por referência a arch.md §L356-365 + schema-design.md §4 L655-657 (não duplica decisão; DEV-6)                                                                                                                                                                       | Dex (dev)        |
| 2026-05-27 | NOTE      | Story 4.4 implementada — UI `/dashboard/analytics` (Frontend-only) consome views 4.3 + queries lifetime; Epic 4 backbone analítico (4.1+4.2+4.3+4.4) fechado, exceto 4.5 (Conta)                                                                                                                                                                   | Dex (dev)        |
| 2026-05-28 | NOTE      | Story 4.5 implementada — Account Module (FR15+FR16): page `/dashboard/account` + 2 Server Actions (`exportAccountData` + `deleteAccount`) + 2 Client Components + cascade delete em 5 tabelas via `auth.users` ON DELETE CASCADE (zero migration nova) + Storage cleanup `avatars/{uid}/`. Epic 4 fechado; MVP backbone completo                   | Dex (dev)        |
| 2026-05-28 | NOTE      | **v1.0.0 released** — tag + GitHub Release publicados (https://github.com/helionj/new-biolink/releases/tag/v1.0.0). CHANGELOG.md criado. Marco: encerramento do escopo PRD (Epics 1-4). 22 stories, 51 commits, 22 PRs                                                                                                                             | Gage (devops)    |
| 2026-05-28 | SCHEDULE  | `[STORY-3.5-F2]` agendado como **Story 5.1** (Epic 5 — Polish & Gaps Pós-MVP) — única story MEDIUM no backlog pós-v1.0.0; gap UX (usuários reais não editam display_name/bio). **Pré-requisito de processo:** @pm precisa formalizar Epic 5 no PRD antes do @sm draftar (Constitution Art. IV — No Invention)                                      | Pax (po)         |
| 2026-05-28 | FORMALIZE | **Epic 5 formalizado** em `docs/prd.md` v0.4 (Change Log + Lista de Epics + nova seção §Epic 5 com Story 5.1). AC1 ancorado em FR13 (≤50/≤280) — sugestão "80 chars" do backlog reconciliada como advisory. Pré-requisito atendido; pronto para `@sm *draft 5.1`                                                                                   | Morgan (pm)      |
| 2026-05-29 | DONE      | `[STORY-3.5-F2]` ✅ implementada como **Story 5.1** (display_name + bio editáveis em `/dashboard/profile`): nova primitive `Textarea`, `UpdateProfileMetaInput` Zod schema, Server Action `updateProfileMeta` + `revalidateUserSurface`, Client Component `ProfileMetaForm` (RHF), 6 component tests verdes. Limites reconciliados a FR13 (50/280) | Dex (dev)        |
| 2026-05-30 | VALIDATE  | `docs/frontend-spec.md` v0.3 (amend §0.5 Personas/IA/Flows + §9 Handoff Checklist) — PO validate APPROVED 94% (GO); zero blocking issues; Constitution Art. IV preservado (todo elemento rastreia para PRD v0.5/FRs/stories shipped)                                                                                                               | Pax (po)         |
| 2026-05-30 | ADD       | `[EPIC-5-S2..S9]` 8 stories MEDIUM consolidam refresh Soft Studio ratificado em PRD v0.5 — path crítico 5.2 → 5.3 (tokens swap + primitives audit); 5.4-5.9 paralelizáveis; source-of-truth canônico = `docs/frontend-spec.md`                                                                                                                     | Pax (po)         |
| 2026-05-30 | ADD       | `[EPIC-5-PHASE2-LOGO]` LOW — logomark real diferido para Phase 2 post v1.x stabilization (resolução Q4 §6 do spec; ★ asterisco placeholder OK para MVP refresh em Story 5.9)                                                                                                                                                                       | Pax (po)         |
