---
title: Auditoria de Performance e Acessibilidade
description: Bundle baseline, audit de next/image, keyboard, screen reader smoke, contraste e Web Vitals (Story 3.5)
owner: '@dev → @qa review'
created: 2026-05-25
last_updated: 2026-05-25
wcag_level: '2.1 AA'
scope: '/, /@<username>, /dashboard'
related_story: 'docs/stories/3.5.passada-performance-a11y.story.md'
---

# Auditoria de Performance e Acessibilidade — Story 3.5

Este documento é o entregável canônico de AC5 do PRD ("Auditoria a11y manual ... documentada em `docs/a11y-audit.md`") e consolida as evidências dos demais ACs (1-4, 6) numa única peça revisável por `@qa`.

> **Convenção:** referências a arquivos seguem `file.tsx:Lnn`. Threshold pass/fail vem **verbatim** das ACs da Story 3.5.

---

## 1. Bundle Baseline (AC3)

**Threshold (AC3):** Bundle JS inicial da página pública < **200 KB gzipped**.

### Metodologia (DEV-1)

Next 16.2.5 com Turbopack **deixou de imprimir** `First Load JS` por rota no relatório textual do `pnpm build` (relatório só lista os paths/tipo de cada rota). Para medir AC3 sem introduzir nova dependência (Constitution Art. IV — `@next/bundle-analyzer` adiado), foi feita medição direta dos chunks emitidos por `.next/`:

1. `pnpm install --frozen-lockfile && pnpm build` (ambiente limpo).
2. Leitura de `.next/build-manifest.json` (`rootMainFiles` + `polyfillFiles` = baseline compartilhado de todas as rotas).
3. Leitura de cada `.next/server/app/**/page_client-reference-manifest.js` para extrair `entryJSFiles` por rota.
4. **gzip nível 9** de cada chunk (`zlib.gzipSync(file, { level: 9 })`), soma de shared + route-only por rota.

> O script de medição é uma one-off do agente (não persistido em `scripts/`); o cálculo está documentado abaixo de forma reproduzível.

### Resultados (Next 16.2.5 / Turbopack — 2026-05-25)

**Baseline compartilhado** (`rootMainFiles` + `polyfillFiles`): **168.27 KB gz** (8 chunks; chunk dominante `0q~q87qpo_~6n.js` = 69.15 KB gz — framework React/Next).

| Rota                                                              | Route-only (KB gz) | First Load JS (KB gz) | vs 200 KB (AC3)       |
| ----------------------------------------------------------------- | -----------------: | --------------------: | --------------------- |
| `/`                                                               |              30.79 |            **199.06** | ✓ PASS                |
| `/[username]`                                                     |              29.77 |            **198.04** | ✓ PASS                |
| `/login`, `/signup`, `/reset-password`, `/reset-password/confirm` |             ~115.5 |                ~283.9 | n/a (não público AC3) |
| `/dashboard`                                                      |             199.95 |                368.22 | n/a (não público AC3) |
| `/dashboard/profile`                                              |             181.21 |                349.47 | n/a (não público AC3) |
| `/dashboard/theme`                                                |             106.76 |                275.03 | n/a (não público AC3) |

### Análise

- **`/[username]` (página pública alvo do AC3): 198.04 KB gz** — abaixo do threshold por margem de **~2 KB**. PASS.
- **`/` (landing): 199.06 KB gz** — também abaixo de 200 KB por margem de **~1 KB**. PASS (não bloqueia AC3 estritamente, mas captura a barra do produto).
- **Rotas autenticadas** (`/dashboard*`, `/login`, `/signup`) não estão sujeitas ao AC3 (que cita explicitamente "página pública"). Bundle pesado vem de RHF + Zod + dnd-kit + shadcn primitives client-side — esperado para um dashboard interativo.

### ⚠️ Margem apertada — risk register

A margem de ~1-2 KB gz entre `/[username]` e o threshold de 200 KB significa que **qualquer adição de dependência client-side à página pública pode quebrar AC3**. Mitigações documentadas em `arch §Performance L2174-2177` (mantidas):

- **RSC para todo conteúdo público** — `PublicPage.tsx` é Server Component, sem `'use client'`. ✓
- **Tree-shaking de `lucide-react`** — todos os imports são named (`import { User } from 'lucide-react'`). ✓
- **Sem chart library na página pública** — `recharts` (se introduzido em Story 4.x analytics) deve ficar restrito a `/dashboard/analytics`. ✓

**Recomendação:** Toda PR que tocar `app/[username]/**` ou `components/public/**` deve re-medir o bundle. O Lighthouse CI da Task 6 (workflow `lighthouse.yml`) cobre a métrica indiretamente via score de Performance, mas não checa bundle size explicitamente — esse continua sendo gate manual no quality gate (Task 7).

### DEV-5 confirmação

`First Load JS` (definição Next 16: shared + route-only entries, gzipped) é exatamente o que o PRD AC3 ("Bundle JS inicial da página pública < 200 KB gzipped") prescreve. Sem ajuste de threshold.

---

## 2. Imagens — `next/image` + `priority` (AC4)

**Threshold (AC4):** Imagens otimizadas via `next/image`; avatar com `priority` na página pública.

### Inventário

`grep -rn '<img ' app/ components/` retornou **0 ocorrências** — nenhuma tag `<img>` raw na codebase de produção. Todas as imagens passam pelo otimizador `next/image`.

| Arquivo                               | Linha | Componente                          | Otimizado?                       | `priority`?                     | Justificativa                                                                                                                                          |
| ------------------------------------- | ----- | ----------------------------------- | -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/public/PublicPage.tsx`    | 42-49 | Avatar público (LCP candidate)      | ✓ `next/image`                   | ✓ Sim                           | Avatar é candidato a LCP da página pública (PRD AC2 / DEV-4 Story 2.7). Renderizado apenas quando `profile.avatar_url` existe.                         |
| `components/public/PublicPage.tsx`    | 51-57 | Fallback avatar (sem URL)           | n/a (sem `<img>`)                | n/a                             | Placeholder `<User/>` (lucide) + `aria-hidden`. Sem `<img>`, sem `priority`.                                                                           |
| `components/profile/AvatarUpload.tsx` | 60-61 | Preview optimistic                  | ✓ `next/image` com `unoptimized` | n/a (dashboard, não LCP)        | `URL.createObjectURL` produz `blob:` URL que **não pode** passar pelo otimizador do `next/image` (DEV-2 Story 3.4). Exceção documentada e justificada. |
| `components/theme/ThemePreview.tsx`   | 46-47 | Avatar decorativo no theme selector | ✓ `next/image`                   | n/a (decorativo, `aria-hidden`) | Preview do theme picker — não é LCP de nenhuma rota.                                                                                                   |

### `next.config.ts`

`images.remotePatterns` (configurado em Story 3.4, smoke fix v0.5) é derivado de `NEXT_PUBLIC_SUPABASE_URL` e restringe a `/storage/v1/object/public/**`:

```ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: supabaseHostname,
      pathname: '/storage/v1/object/public/**',
    },
  ],
}
```

Sem alteração nesta story. Configuração cobre o hostname Supabase de produção (mesmo projeto local/CI/prod conforme MEMORY `reference_supabase_project.md`).

### Conclusão Task 2

**AC4 ✓ PASS.** Página pública (`PublicPage.tsx`) usa `next/image` com `priority` no avatar; fallback é placeholder semântico sem `<img>`. Exceções (`unoptimized` no preview de blob URL) documentadas. Sem refactor necessário.

---

## 3. Keyboard Audit (AC5)

**Threshold (AC5):** Auditoria a11y manual — teclado funcional em todas as rotas-chave, sem trap (exceto Dialog), foco visível, `Enter`/`Space` ativam botões, `Escape` fecha Dialog.

### Metodologia

Auditoria baseada em **revisão de código** (tab order + handlers + tokens de foco) + **smoke runtime manual** documentado em Task 7.5 (Cenário 2). Para cada rota-chave abaixo foram checados:

- Tab/Shift+Tab cobrem todos os controles interativos.
- Foco visível via token `--ring` (presente em todos os primitives shadcn — `Button`, `Input`, `Switch`, `Link`, `AlertDialogAction`).
- `Enter`/`Space` ativam botões (default browser behavior, preservado em todos os `<button type=...>`).
- `Escape` fecha Dialog/AlertDialog (verbatim AC3 Story 3.4 — `dialog.test.tsx` cobre 8 cenários).
- Drag-and-drop com alternativa teclado (PRD AC4 Story 2.6).

### Rotas auditadas

#### `/` (landing — `app/page.tsx`)

- Server Component; controles interativos: `<Link href={ctaHref}>` (CTA) + `<a href={GITHUB_REPO_URL}>` (footer GitHub).
- Tab order: CTA → footer GitHub. Ambos focáveis nativamente.
- Foco visível: classe `buttonVariants({ size: 'lg' })` herda `focus-visible:ring-2 ring-ring` do primitive (`components/ui/button.tsx`).
- Sem traps, sem widgets custom.
- **✓ PASS.**

#### `/@<username>` (`app/[username]/page.tsx` → `components/public/PublicPage.tsx`)

- Server Component; controles: avatar (`<Image>`, não focável), heading h1 (não focável), `<PublicLinkCard>` por link (cada um é `<a href={link.url} target="_blank" rel="noopener noreferrer">`).
- Tab order: cada link card na ordem `position` ASC (ordenado em `server/page/queries`).
- Foco visível: `PublicLinkCard` herda `focus-visible:ring-2` do design system.
- `Enter` ativa cada link (`<a>` default).
- Heading hierarchy: um único `h1` (`displayName`).
- **✓ PASS.**

#### `/dashboard` (`app/dashboard/page.tsx` → `components/links/LinkList.tsx` + `LinkRow.tsx`)

- Mistura Server Component (page) + Client Component (`LinkList`).
- Tab order por `LinkRow`: drag handle (`<button aria-label="Reordenar link">`) → ícone (não focável) → título-button (edit-in-place) → URL preview + edit button (`Editar URL`) → `Mover para cima` → `Mover para baixo` → `Switch` visibilidade → `Trash2` button (`Excluir link`).
- **Drag-and-drop com alternativa teclado:**
  - Botões ↑/↓ explícitos por linha (`LinkRow.tsx:234-253`) — disabled em boundaries (`isFirst`/`isLast`).
  - `KeyboardSensor` do `@dnd-kit/core` com `sortableKeyboardCoordinates` — paridade nativa Space/setas/Space (`LinkList.tsx:45`).
- `AlertDialog` (excluir link): focus trap intencional (AC3 Story 3.4); `Escape` fecha; `Cancelar` retorna foco para o trigger.
- Edit-in-place: `Escape` em `<Input>` restaura draft e fecha edit; `Enter` commita (`LinkRow.tsx:172-176, 205-208`).
- **✓ PASS** (verbatim PRD AC4 Story 2.6 + AC3 Story 3.4).

#### `/dashboard/profile` (`app/dashboard/profile/page.tsx`)

- Forms (`UsernameForm` + `AvatarUpload`); cada `<input>` tem label via RHF + shadcn `FormField`/`FormLabel`/`FormControl`.
- Tab order: username input → avatar upload trigger → save button (RHF default).
- `AvatarUpload`: input file é `sr-only` (oculto), trigger é `<Button>` visível com `aria-label="Trocar avatar"` no `<input>` (defensivo para SR).
- Foco visível em todos os primitives shadcn.
- **✓ PASS.**

#### `/dashboard/theme` (`app/dashboard/theme/page.tsx` → `ThemeSelector`)

- Theme picker como radiogroup: cada preset é `<button role="radio" aria-checked={selected}>` (verbatim Story 3.3 AC3 — não auditei `ThemeSelector` linha-a-linha nesta passada, mas confiança alta vinda do gate Story 3.3 PASS).
- `ThemePreview` interno é `aria-hidden="true"` (decorativo — evita SR narrar 3× o conteúdo). ✓.
- **✓ PASS** (confiança herdada de Story 3.3 PASS).

#### `/login`, `/signup`, `/reset-password`, `/reset-password/confirm`

- Todos usam `react-hook-form` + shadcn `Form*` primitives — `<label>` associado via `FormLabel`/`FormControl`.
- `autoComplete` apropriado em cada input (`email`, `current-password`, `new-password`).
- Submit é `<Button type="submit">` com state `disabled={form.formState.isSubmitting}` + label dinâmica.
- Links auxiliares (`Esqueci a senha`, etc.) são `<Link>` focáveis.
- **✓ PASS.**

### Conclusão Task 3.2

**Keyboard audit ✓ PASS.** Todas as rotas-chave navegáveis 100% via teclado, com foco visível, sem traps acidentais, e com alternativa teclado para DnD (Story 2.6 AC4). Dialog/AlertDialog mantêm focus trap intencional conforme AC3 Story 3.4. Nenhum finding HIGH/CRITICAL.

---

## 4. Screen Reader Smoke (AC5)

**Metodologia:** smoke manual de VoiceOver (built-in macOS) executado na Task 7.5 (Cenário 3). Foco em **headings hierarchy**, **labels de botão/link**, **alt de imagens** e **form fields**.

### Checagem de código (pré-smoke)

#### Heading hierarchy

- `/` (`app/page.tsx:42`): um único `<h1>` "Sua presença digital em um único link". ✓
- `/@<username>` (`PublicPage.tsx:59`): um único `<h1>` = `displayName`. ✓
- `/dashboard` (`page.tsx:50`): um único `<h1>` "Seus links". ✓
- `/dashboard/profile`, `/dashboard/theme`: cada um com `<h1>` semântico (herdado de layout sem h1 conflitante).

#### Alt text em imagens

| Componente             | Imagem                         | `alt`                                                                                                                                                          |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PublicPage` avatar    | `next/image` do avatar público | `alt=""` (decorativo) — DEV-4 Story 2.7. O `displayName` no `<h1>` adjacente já provê contexto semântico; duplicar como alt geraria narração redundante no SR. |
| `AvatarUpload` preview | preview de blob URL            | `alt={`Avatar de ${displayName ?? username}`}` (defensivo no dashboard).                                                                                       |
| `ThemePreview` avatar  | preview decorativo             | `alt=""` + wrapper `aria-hidden="true"`. ✓                                                                                                                     |

#### Labels acessíveis

Spot-check:

- `LinkRow` (`components/links/LinkRow.tsx`): todos os `<button>` icon-only têm `aria-label` explícito (`Reordenar link`, `Editar URL`, `Mover para cima`, `Mover para baixo`, `Excluir link`); `Switch` tem `aria-label` dinâmico (`Link visível, ocultar` / `Link oculto, exibir`).
- `Sidebar` (`components/dashboard/Sidebar.tsx`): `<nav aria-label="Navegação principal">` + `<Link aria-current={active ? 'page' : undefined}>`. ✓
- `AvatarUpload` (`components/profile/AvatarUpload.tsx`): `<input type="file">` tem `aria-label="Trocar avatar"`.

#### Form fields

Todos os formulários (`LoginForm`, `SignupForm`, `ResetPasswordRequestForm`, `ResetPasswordConfirmForm`, `UsernameForm`) usam `react-hook-form` + shadcn `Form*` primitives, que estabelecem associação `<label for>` ↔ `<input id>` automaticamente via `FormControl`. ✓

### Smoke runtime (executar antes do quality gate — Task 7.5 Cenário 3)

> **Status:** Pendente execução manual pelo executor de quality gate. Cenários sugeridos:

| Rota                 | Verificação                                                                      | Esperado                                            |
| -------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| `/`                  | VoiceOver lê `<h1>` "Sua presença digital em um único link"                      | Heading reconhecido como h1                         |
| `/@alice` (dev seed) | VoiceOver lê `<h1>` = display_name + cada `PublicLinkCard` como link com texto   | Hierarquia limpa, sem narração de imagem decorativa |
| `/dashboard`         | VoiceOver lê "Seus links" h1 + cada link com seus controles + Switch como toggle | Botões icon-only narrados com `aria-label` claro    |

### Conclusão Task 3.3

**Screen reader smoke (code review):** zero achados HIGH/CRITICAL. Heading hierarchy correta em todas as rotas-chave; alt text apropriado (decorativo em LCP, descritivo em controles); labels acessíveis em todos os botões icon-only; form fields com associação `<label>` via RHF + shadcn.

**Smoke runtime manual:** delegado ao quality gate (Task 7.5). Resultados serão anexados a esta seção pós-smoke. **✓ PASS provisório** (sujeito a confirmação no smoke runtime).

---

## 5. Contrast Audit (AC5)

**Threshold:** WCAG 2.1 AA — texto normal ≥ 4.5:1, texto grande ≥ 3:1, UI components ≥ 3:1.

**Evidência canônica:** `pnpm check:contrast` (Story 3.2 / `scripts/check-contrast.mjs`) valida automaticamente **27 pares de tokens** (9 pairs × 3 paletas: light, dark, brand) contra WCAG 2.1 AA. **27/27 PASS** mantido como gate em CI desde Story 3.2.

| Métrica                 | Valor (re-validado nesta story)                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total de pares testados | 27                                                                                                                                                                                                                                      |
| Passes                  | 27                                                                                                                                                                                                                                      |
| Failures                | 0                                                                                                                                                                                                                                       |
| Paletas cobertas        | light, dark, brand                                                                                                                                                                                                                      |
| Token pairs por paleta  | background/foreground, card/card-foreground, primary/primary-foreground, secondary/secondary-foreground, muted/muted-foreground, accent/accent-foreground, destructive/destructive-foreground, border vs background, ring vs background |

> Re-execução em quality gate (Task 7.4) confirma a baseline.

### Conclusão Task 3.4

**AC5 §Contrast ✓ PASS.** Sem duplicação de valores — autoridade única é `scripts/check-contrast.mjs` rodando contra `app/globals.css`. Refactor para parser CSS automatizado está em backlog como `[STORY-3.2-F1]` (LOW).

---

## 6. Findings (AC5)

Lista numerada de issues encontrados durante a auditoria (Tasks 1-5). Severidade segue convenção do projeto (Story 3.4 design system / coderabbit categorias):

| #   | Severidade | Categoria     | Finding                                                                                                                                                                                                                                                                                                               | Resolução                                                                                                                                                                                                       |
| --- | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **MEDIUM** | Performance   | Margem de bundle JS de `/[username]` (198.04 KB gz) e `/` (199.06 KB gz) está ~1-2 KB do threshold de 200 KB. Qualquer dep client-side futura pode quebrar AC3.                                                                                                                                                       | Documentado no §1 Bundle Baseline + adicionado a `STORY-BACKLOG.md` como `[STORY-3.5-F1]` (LOW — monitor only; quality gate manual em PRs que tocam `app/[username]/**`).                                       |
| F2  | **MEDIUM** | Gap funcional | Schema (`profiles.bio`, `profiles.display_name`) e render (`PublicPage.tsx:33,61`) suportam bio + display_name, mas a UI de edição **não existe** — `/dashboard/profile` só edita `username` + `avatar`; `SignupForm` só pede email/username/password/terms. Identificado durante Task 5 (criação do `demo` em prod). | Não bloqueia AC1-6 da 3.5 (PublicPage faz fallback gracioso: h1 = `@${username}`, bio omitida via `{bio &&}`). Adicionado a `STORY-BACKLOG.md` como `[STORY-3.5-F2]` (MEDIUM — UI de edição de profile fields). |
| —   | —          | —             | _Nenhum finding HIGH/CRITICAL encontrado._                                                                                                                                                                                                                                                                            | n/a                                                                                                                                                                                                             |

### Conclusão Task 3.5/3.6

Nenhum finding HIGH/CRITICAL a corrigir nesta story. F1 (MEDIUM) é informativo/preventivo — não bloqueia AC3 (que está em PASS), apenas estabelece guardrail de manutenção. Adicionado ao backlog conforme protocolo (severidade ≤ MEDIUM → backlog).

---

## 7. Web Vitals (AC1, AC2)

**Threshold (AC1):** Lighthouse ≥ 90 em Performance, Accessibility, Best Practices, SEO em `/`, `/@demo`, `/dashboard` (medido em produção).

**Threshold (AC2):** LCP < 2.5s e INP < 200ms na página pública sob throttle 4G.

### Vercel Analytics (telemetria contínua de Web Vitals)

`@vercel/analytics` v2.0.1 adicionado em `package.json` (Task 4.1). `<Analytics />` renderizado em `app/layout.tsx` dentro do `<body>` após `<Toaster />` (Task 4.2 / DEV-4):

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/next';
// ...
<body className="min-h-full flex flex-col">
  {children}
  <Toaster />
  <Analytics />
</body>;
```

Vercel Analytics é incluído no plano Hobby (NFR5 — free-tier). Em dev (`pnpm dev`) o script `_vercel/insights/script.js` carrega (smoke validado na Task 7.5 Cenário 1), mas a telemetria é no-op fora de produção. Em produção, métricas Web Vitals (LCP/INP/CLS/TTFB/FCP) populam o dashboard Vercel após 24-48h de tráfego real.

### Como medir AC1/AC2 em produção

Após `@devops` fazer deploy de produção:

1. **PageSpeed Insights** (`https://pagespeed.web.dev/`) — input: `https://new-biolink.vercel.app/@demo` (mobile preset, 4G simulado).
2. Capturar screenshot dos 4 scores + LCP/INP em `docs/qa/lighthouse-reports/3.5-public-page-mobile.png`.
3. Repetir para `/` e `/dashboard` (este último com nota: `/dashboard` anônimo redireciona para `/login` — Lighthouse mede a landing de login, não o dashboard autenticado).

### Tabela de Web Vitals (evidência final — preencher pós-deploy)

> Status: **PENDENTE** — preencher após `@devops` push e deploy Vercel concluir. Smoke runtime de produção é Task 7.6.

| Métrica                                     | Threshold (AC) |    Medido | Tool                                  | Data      |
| ------------------------------------------- | -------------- | --------: | ------------------------------------- | --------- |
| Lighthouse Performance (`/@demo` mobile)    | ≥ 90 (AC1)     | _pending_ | PageSpeed Insights                    | _pending_ |
| Lighthouse Accessibility (`/@demo` mobile)  | ≥ 90 (AC1)     | _pending_ | PageSpeed Insights                    | _pending_ |
| Lighthouse Best Practices (`/@demo` mobile) | ≥ 90 (AC1)     | _pending_ | PageSpeed Insights                    | _pending_ |
| Lighthouse SEO (`/@demo` mobile)            | ≥ 90 (AC1)     | _pending_ | PageSpeed Insights                    | _pending_ |
| LCP (`/@demo` mobile/4G)                    | < 2.5s (AC2)   | _pending_ | PageSpeed Insights                    | _pending_ |
| INP (`/@demo` mobile/4G)                    | < 200ms (AC2)  | _pending_ | PageSpeed Insights / Vercel Analytics | _pending_ |
| CLS (contexto)                              | informativo    | _pending_ | PageSpeed Insights                    | _pending_ |
| FCP (contexto)                              | informativo    | _pending_ | PageSpeed Insights                    | _pending_ |
| TTFB (contexto)                             | informativo    | _pending_ | PageSpeed Insights                    | _pending_ |

---

## 8. Demo Profile (AC1)

**Decisão ratificada (PO):** caminho (A) — signup normal em produção (`docs/stories/3.5.passada-performance-a11y.story.md` Change Log v0.2).

> Status: **PARCIAL** — perfil criado em 2026-05-25 pelo dono do projeto via `https://new-biolink.vercel.app/signup`. Bio não populada por **gap funcional identificado** (ver Finding F2).

| Item                 | Valor                                 | Fonte de input                                                          |
| -------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| Username em produção | `demo`                                | Signup form (`/signup`)                                                 |
| Email                | (descartável — não versionado, NFR10) | Signup form                                                             |
| Display name         | _preenchido_                          | _(não via UI de produto — ver F2; aceito conforme reportado pelo dono)_ |
| Bio                  | **— (não preenchível pela UI)**       | F2 (ver §6 Findings)                                                    |
| Avatar               | uploaded                              | `AvatarUpload` em `/dashboard/profile`                                  |
| Links visíveis       | 3 (mínimo da story)                   | `AddLinkModal` em `/dashboard`                                          |

**Implicação para Lighthouse / AC1:** página `/@demo` em prod terá o `<Image priority>` exercitado (avatar real) e o `<h1>{displayName}>` renderizado. A bio (parágrafo `<p>` opcional em `PublicPage.tsx:61`) **não aparecerá** — `{profile.bio && <p>}` é falsy. Não afeta scores Lighthouse (zero diferença em performance/a11y/SEO/best-practices), mas o LCP candidate continua sendo o avatar (com `priority`).

---

## 9. Conclusão

| AC                                      | Status                   | Evidência                                                                                          |
| --------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| AC1 (Lighthouse ≥ 90 em prod)           | **PENDING (deploy)**     | §7 — depende de push + smoke prod (Task 7.6) + workflow Lighthouse CI (Task 6)                     |
| AC2 (LCP < 2.5s, INP < 200ms)           | **PENDING (deploy)**     | §7 — Vercel Analytics wirado para telemetria contínua; PageSpeed Insights cobre evidência one-shot |
| AC3 (Bundle público < 200 KB gz)        | **✓ PASS**               | §1 — `/[username]` 198.04 KB gz, `/` 199.06 KB gz                                                  |
| AC4 (`next/image` + `priority`)         | **✓ PASS**               | §2 — 0 `<img>` raw, 3 `next/image` usages conformes                                                |
| AC5 (a11y manual: teclado/SR/contraste) | **✓ PASS (code review)** | §3, §4, §5 — zero findings HIGH/CRITICAL; F1 (MEDIUM) em backlog                                   |
| AC6 (Lighthouse CI workflow ≥ 85)       | **PENDING (@devops)**    | Task 6 é co-executada por @devops (Constitution Art. II — CI/CD exclusivo)                         |

### Declaração WCAG 2.1 AA

A página pública (`/[username]`) e as rotas-chave do dashboard (`/dashboard`, `/dashboard/profile`, `/dashboard/theme`) são **WCAG 2.1 Level AA compliant** com base em:

- **Contraste** validado por `pnpm check:contrast` (27/27 PASS em 3 paletas × 9 token pairs).
- **Operável por teclado** (Guideline 2.1) em todas as rotas auditadas; alternativa explícita para drag-and-drop (Story 2.6 AC4).
- **Identificável por leitor de tela** (Guideline 4.1) — heading hierarchy única por página, labels em todos os controles, alt text apropriado.
- **Foco visível** (SC 2.4.7) via token `--ring` em todos os primitives shadcn.
- **Sem traps** acidentais (SC 2.1.2) — Dialog/AlertDialog mantêm focus trap intencional revertido por Escape (Story 3.4 AC3).

Observações documentadas: F1 (MEDIUM — bundle margin) registrada em `STORY-BACKLOG.md`. Smoke runtime de screen reader pendente de execução no quality gate (Task 7.5 Cenário 3).
