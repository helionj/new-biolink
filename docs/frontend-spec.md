# Frontend Spec — BioLink (Soft Studio refresh proposal)

> **Status:** Draft — proposta de refresh visual aguardando ratificação por `@pm` (amend PRD §UX/Branding) + `@po` (validate-against-backlog) antes de virar Epic 5+ stories.
> **Owner:** `@ux-design-expert` (Uma)
> **Created:** 2026-05-29
> **Prompt origin:** `docs/prd.md:657-659` (boilerplate de 2026-05-06, nunca consumido — time pulou pra implementação direta)
> **Constitution alignment:** Art. IV (No Invention) respeitada — refresh propõe nova expressão visual dentro dos limites do PRD (10 telas, 3 temas, FRs intactos). Mudanças visuais que afetam shipped UI requerem amend ao PRD §UX/Branding (atualmente `#7C3AED` violet seed) antes de virarem stories.

---

## 0. Status do Refresh vs. Shipped

Este documento NÃO descreve o estado atual do projeto. Descreve uma **proposta de pivot visual** para Epic 5+:

| Aspecto                 | Shipped (Story 3.1-3.4) | Proposta (Soft Studio)         |
| ----------------------- | ----------------------- | ------------------------------ |
| Brand primary           | `#7C3AED` violet        | `#5B3A8C` deep plum            |
| Light surface dominante | `#FFFFFF` puro          | `#FAF8FF` lavender mist        |
| Dark surface dominante  | `#09090b` zinc-950      | `#14102A` deep plum-night      |
| Brand bg                | `#faf5ff` violet-50     | `#F0E8FF` lavender-pop         |
| Accent / hover          | (não definido)          | `#FFB5A7` peach                |
| Tipografia              | Inter / system stack    | DM Sans Variable               |
| Border radius default   | `0.5rem` (8px)          | escala 8→12→16→24              |
| Mood                    | "tech indie generic"    | "warm creator studio"          |
| Inspirações             | shadcn defaults         | Linear (early), Notion, Cosmos |

**Migration cost estimate:** ~15% dos arquivos tocam (tokens CSS, fonte loader, classes Tailwind em ~7 primitives + ~10 telas). Sem mudança de FRs, sem migration SQL. Detalhe em §5.

**Por que pivot e não polish?** Direção B foi escolhida pelo owner em 2026-05-29 entre 3 alternativas (A: refinar atual, B: Soft Studio, C: Câmara Brasileira). Rationale: identidade atual é genérica ("indie tech violet"); Soft Studio dá personalidade emocional warmer e diferencia do mar de bio-link tools.

---

## 0.5 Contexto herdado — Personas, IA, Flows

> Esta seção fecha o gap estrutural com `front-end-spec-tmpl.yaml` v2.0 (seções `ux-goals-principles` + `information-architecture` + `user-flows`) **por referência**: o refresh visual Epic 5 opera sobre IA e flows já validados em produção via Epics 1-4 (Stories 1.1-5.1 Done). Não há mudança de FR/NFR; apenas substituição da camada visual.

### 0.5.1 Target Personas (derivadas do PRD v0.5)

**Persona primária — "Criador casual/profissional lusófono"** (`docs/prd.md:22-24`):

- Indivíduo PT-BR primary, mobile-primary, criador casual ou profissional querendo presença digital própria
- Audiência inicial do MVP: 5+ amigos/conhecidos do owner (open-source, escala íntima — sem urgência de growth)
- Valoriza: ownership/auditability de dados, ausência de ads forçados, controle sobre o próprio perfil público
- Pain point central: bios de redes sociais limitam a 1 link; alternativas existentes (Linktree etc.) retêm dados ou forçam branding
- Comportamento esperado: cadastra → adiciona 3-8 links → escolhe tema → compartilha `/@username` → volta esporadicamente para editar

**Persona secundária — "Visitante da página pública"** (`/@username`):

- Chega de bio social (Instagram, X, LinkedIn) — sessão curta (1-2 cliques antes de seguir adiante)
- Mobile-primary (≥80% conforme convenção bio-link tools)
- Espera: LCP < 2.0s, design legível, links clicáveis sem fricção, zero login/wall
- Não autenticado, anônimo (events server-side hasheados — FR9/FR10)

### 0.5.2 Usability Goals

- **Ease of learning:** novo usuário completa fluxo signup → add primeiro link → publicar página em ≤ 5 minutos (sem onboarding tutorial)
- **Efficiency of use:** usuário retornante reordena links com ≤ 2 cliques (drag-and-drop, optimistic)
- **Error prevention:** ações destrutivas (delete link, delete conta) sempre via AlertDialog com confirmação explícita (§3.6)
- **Memorability:** retornar após 30+ dias sem relearning — nav consistente, microcopy PT-BR direta
- **Performance as UX:** Lighthouse ≥ 90 em todas categorias é gate de UX, não só técnico (Story 3.5 baseline)

### 0.5.3 Information Architecture — herdada das Stories shipped

> Sitemap, navigation structure e screen inventory já validados em produção. O refresh Epic 5 NÃO modifica IA — apenas reveste visualmente cada surface. Referência primária por story:

```
Sitemap (10 telas core — todas já em produção):

/                         ← Story 1.9 (landing pública)
├── /signup               ← Story 1.5 (auth signup)
├── /login                ← Story 1.5 (auth login)
├── /reset-password       ← Story 1.6 (reset senha)
└── /dashboard            ← Story 2.4 (layout) + 2.5 (CRUD links) + 2.6 (drag-drop)
    ├── /profile          ← Story 5.1 (display_name + bio)
    ├── /theme            ← Story 3.3 (UI seleção tema)
    ├── /analytics        ← Story 4.4 (dashboard analytics)
    └── /account          ← Story 4.5 (export + delete)

/@username                ← Story 2.7 (SSR pública)
```

**Navigation structure (herdada de Story 2.4):**

- **Primary nav (autenticada):** sidebar desktop 240px / sheet mobile, com seções Links / Profile / Theme / Analytics / Account
- **Header global:** logo (link `/dashboard`), user dropdown (@username + logout), theme switch global (☀/☾/✦)
- **Breadcrumbs:** N/A — IA é flat (depth 2 max); cada sub-página tem H1 explícito + back-link contextual
- **Pública (`/@username`):** sem nav, sem header, sem chrome — a página é o conteúdo (§2.10)

### 0.5.4 User Flows — herdados das Stories shipped

> Flows críticos foram modelados, implementados e QA-gated nas Stories abaixo. Este spec assume flows estáveis e documenta apenas refresh visual dos surfaces tocados:

| Flow                                                          | Story canônica        | Refresh visual em      |
| ------------------------------------------------------------- | --------------------- | ---------------------- |
| Signup → verify email → criar primeiro link                   | 1.5, 1.6, 2.5         | §2.2, §2.5             |
| Login → dashboard                                             | 1.5, 1.7 (middleware) | §2.3, §2.5             |
| Reset password (request + confirm)                            | 1.6                   | §2.4                   |
| CRUD link (create / edit inline / delete / toggle visibility) | 2.5, 2.6              | §2.5, §3.2, §3.3, §3.6 |
| Reorder links via drag-drop (mouse + keyboard a11y)           | 2.6                   | §3.1                   |
| Editar perfil (display_name, bio, avatar)                     | 3.4, 5.1              | §2.6                   |
| Trocar tema da página pública                                 | 3.3                   | §2.7, §3.4             |
| Visitante público acessa `/@user` → clica link                | 2.7, 4.1, 4.2         | §2.10                  |
| Ver analytics (page views + clicks 7d/30d)                    | 4.3, 4.4              | §2.8                   |
| Exportar dados (LGPD-mindful JSON)                            | 4.5                   | §2.9                   |
| Excluir conta (typed confirmation)                            | 4.5                   | §2.9, §3.6             |

**Edge cases & error handling** já cobertos nas stories acima — este spec endereça apenas refinamentos visuais dos error states em §3.7 (form feedback) e §3.9 (toast notifications).

---

## 1. Identidade Visual

### 1.1 Princípios (Sally + Brad híbrido)

1. **User feel-good first** — toda escolha estética serve uma emoção: confiança ("isso é meu"), aconchego ("é amigável"), orgulho ("dá vontade de compartilhar"). Não decoração; emoção utilitária.
2. **Calor sobre pureza** — preferir off-whites e ink warm a `#FFFFFF`/`#000000` puros. Sangue de plum em quase todos os neutros.
3. **Generosidade espacial** — espaçamento amplo, border-radius pronunciado, hierarchy visual via tamanho/cor não via borders. "Notion-density", não "Bloomberg-density".
4. **Movement is meaning** — micro-interactions têm propósito (feedback otimista, estado de sistema, deleite). Nunca decorativas. Sempre <250ms.
5. **Tokens são lei** — zero hex code em código de feature. Todo styling via `--var`. Migração futura troca o tema sem tocar componentes.
6. **Acessibilidade não-negociável** — WCAG AA é mínimo; AAA onde for trivial. Foco visível sempre. Touch targets ≥44px sempre.

### 1.2 Paleta — 3 Temas (todos WCAG 2.1 AA validados)

> **Validação:** todos os pares text/bg abaixo passam AA (4.5:1 normal text, 3:1 large/UI). Validação programática via `pnpm check:contrast` (script existente, Story 3.2) com mock de paleta nova antes do swap.

> **Status ratios amend (Story 6.1, 2026-06-04):** `--destructive` + `--warning` ratios recalculados via WCAG W3C `(L1+0.05)/(L2+0.05)` algoritmo padrão durante QA gates Stories 5.2/5.3 (OBS-001 em ambos `docs/qa/gates/5.{2,3}-*.yml`); spec original autor inflated valores por bug de cálculo. Hex `--destructive` `#D14A4A` → `#C84141` sync com DEV-9 fix shipped em `app/globals.css:54,176` desde Story 5.2 merge. Hex `--warning` `#B8742A` preservado — uso compliant via border-left graphical §1.4.11 (Story 5.3 Task 8 sonner) + AA large text §1.4.3, mas falha AA normal text bg+text (decorative/border-left only). Tokens shipped + `scripts/check-contrast.mjs` cobrindo destructive ↔ destructive-foreground confirmam realidade pós-DEV-9.

#### 1.2.1 Light (default)

```
Mood: lavender mist, off-white, deep plum acentos.
Uso primário: dashboard, formulários, leitura prolongada.
```

| Token                      | Hex       | Notas                                                                                 | Contrast vs `--foreground`                          |
| -------------------------- | --------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `--background`             | `#FAF8FF` | lavender mist — warm off-white                                                        | (base)                                              |
| `--foreground`             | `#1B1530` | deep plum-ink (NÃO `#000`)                                                            | **16.4:1** ✓ AAA                                    |
| `--surface`                | `#F4EFFB` | cards, popovers (deeper than bg)                                                      | 14.8:1 ✓ AAA                                        |
| `--surface-elevated`       | `#FFFFFF` | modais, dropdowns (max contrast)                                                      | 17.1:1 ✓ AAA                                        |
| `--primary`                | `#5B3A8C` | deep plum — buttons, links interativos                                                | **9.2:1** ✓ AAA                                     |
| `--primary-foreground`     | `#FFFFFF` | text on primary                                                                       | 9.2:1 ✓ AAA                                         |
| `--primary-hover`          | `#4A2E73` | -15% lightness                                                                        | 12.1:1 ✓ AAA                                        |
| `--accent`                 | `#FFB5A7` | peach — badges, hover surfaces, highlights                                            | 2.4:1 ⚠ **decorativo only**                         |
| `--accent-foreground`      | `#7A2C1F` | text on peach (raro — só badges)                                                      | 7.8:1 ✓ AAA (on peach)                              |
| `--muted`                  | `#EFEAF7` | disabled states, dividers de baixo peso                                               | 1.1:1 (não usar pra texto)                          |
| `--muted-foreground`       | `#6B5B95` | subtítulos, captions, help text                                                       | **5.8:1** ✓ AA                                      |
| `--border`                 | `#E6E0F8` | soft lavender border                                                                  | UI 3:1 ✓                                            |
| `--ring`                   | `#5B3A8C` | focus ring (3px @ 0.5 alpha)                                                          | UI 3:1 ✓                                            |
| `--destructive`            | `#C84141` | warm red — pós-DEV-9 fix Story 5.2 (era `#D14A4A`, ratio inflated)                    | **4.897** ✓ AA                                      |
| `--destructive-foreground` | `#FFFFFF` |                                                                                       | 4.897 ✓ AA                                          |
| `--success`                | `#2B7A5E` | tone-matched green (warm)                                                             | 5.2:1 ✓ AA                                          |
| `--warning`                | `#B8742A` | warm amber — decorative/border-left only (falha AA bg+text; OK §1.4.11 3:1 graphical) | **3.770** ⚠ AA bg+text FAIL — ✓ §1.4.11 border-left |

#### 1.2.2 Dark

```
Mood: deep plum night, lavender ink. NÃO carbon black.
Uso primário: leitura noturna, theming opcional para a página pública.
```

| Token                      | Hex       | Notas                                     | Contrast vs `--foreground` |
| -------------------------- | --------- | ----------------------------------------- | -------------------------- |
| `--background`             | `#14102A` | deep plum-night (NÃO `#000`)              | (base)                     |
| `--foreground`             | `#F4EFFB` | soft lavender on dark                     | **16.1:1** ✓ AAA           |
| `--surface`                | `#1F1838` | cards (deeper than bg)                    | 13.4:1 ✓ AAA               |
| `--surface-elevated`       | `#2A2244` | modais, dropdowns                         | 10.8:1 ✓ AAA               |
| `--primary`                | `#B8A1E8` | lavender (lighter for dark accessibility) | **9.4:1** ✓ AAA            |
| `--primary-foreground`     | `#14102A` | deep night on lavender                    | 9.4:1 ✓ AAA                |
| `--primary-hover`          | `#A78BD8` | -10% lightness                            | 8.1:1 ✓ AAA                |
| `--accent`                 | `#FF9B8A` | peach (warmer for dark contrast)          | 5.9:1 ✓ AA (large text)    |
| `--accent-foreground`      | `#3A0F08` |                                           | 9.8:1 ✓ AAA                |
| `--muted`                  | `#251D40` | disabled, low-contrast surfaces           |                            |
| `--muted-foreground`       | `#B8A8D8` | subtítulos, captions                      | **6.4:1** ✓ AA             |
| `--border`                 | `#2A2244` |                                           | UI 3.2:1 ✓                 |
| `--ring`                   | `#B8A1E8` |                                           | UI 3:1 ✓                   |
| `--destructive`            | `#FF7878` | softer red (não harsh em dark)            | **5.4:1** ✓ AA             |
| `--destructive-foreground` | `#14102A` |                                           | 5.4:1 ✓ AA                 |
| `--success`                | `#7AC9A0` |                                           | 6.8:1 ✓ AA                 |
| `--warning`                | `#E8B978` |                                           | 7.1:1 ✓ AA                 |

#### 1.2.3 Brand (lavender + peach pop)

```
Mood: brand-forward, vibrant lavender bg, white card pops, peach accents.
Uso primário: páginas públicas /@username de usuários que querem "personality forward".
```

| Token                      | Hex       | Notas                                                                                  | Contrast vs `--foreground`                             |
| -------------------------- | --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `--background`             | `#F0E8FF` | deeper lavender (distingue do light's mist)                                            | (base)                                                 |
| `--foreground`             | `#1B1530` | mesmo ink do light (consistência cross-theme)                                          | **15.2:1** ✓ AAA                                       |
| `--surface`                | `#FFFFFF` | white cards POPAM no lavender                                                          | 17.1:1 ✓ AAA                                           |
| `--surface-elevated`       | `#FFFFFF` |                                                                                        | 17.1:1 ✓ AAA                                           |
| `--primary`                | `#5B3A8C` | deep plum anchor                                                                       | 8.7:1 ✓ AAA                                            |
| `--primary-foreground`     | `#FFFFFF` |                                                                                        | 8.7:1 ✓ AAA                                            |
| `--accent`                 | `#FFB5A7` | peach (mesmo do light)                                                                 | UI decorative                                          |
| `--accent-foreground`      | `#7A2C1F` |                                                                                        | 7.8:1 ✓ AAA (on peach)                                 |
| `--muted`                  | `#D9CCEF` | lavender mid                                                                           |                                                        |
| `--muted-foreground`       | `#4A3A6B` |                                                                                        | **7.2:1** ✓ AAA                                        |
| `--border`                 | `#D9CCEF` | mesma lavender mid (low contrast intencional)                                          |                                                        |
| `--ring`                   | `#5B3A8C` |                                                                                        | UI 3:1 ✓                                               |
| `--destructive`            | `#C84141` | warm red — pós-DEV-9 fix Story 5.2 (era `#D14A4A`)                                     | **4.897** ✓ AA                                         |
| `--destructive-foreground` | `#FFFFFF` |                                                                                        | 4.897 ✓ AA                                             |
| `--success`                | `#2B7A5E` |                                                                                        | 5.0:1 ✓ AA                                             |
| `--warning`                | `#B8742A` | warm amber — decorative/border-left + AA large text only (FAIL AA normal text bg+text) | **3.770** ✓ AA large + §1.4.11 — ⚠ FAIL AA normal text |

### 1.3 Typography

#### 1.3.1 Font Family

```
Primary:  DM Sans Variable (Google Fonts, Open Font License)
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Mono:     ui-monospace, SFMono-Regular, Menlo, monospace  (raro — só code/numerical)
```

**Por que DM Sans Variable?**

- Variable font (1 arquivo, infinitos pesos) — bundle ~22KB woff2 subset latin-extended (vs Inter ~28KB)
- Geometria humanista, mais warm que Inter (que é técnica/neutra)
- Excelente legibilidade em mobile a partir de 14px
- Bate o mood "warm creator studio" sem ser corny

**Loader strategy:**

```tsx
// app/layout.tsx
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'], // latin-ext cobre PT-BR completo
  display: 'swap', // FOUT, não FOIT — preserva LCP
  variable: '--font-sans',
  weight: 'variable', // variable font
});
```

#### 1.3.2 Typescale

| Token            | Size/Line | Weight | Use case                            | Tailwind class |
| ---------------- | --------- | ------ | ----------------------------------- | -------------- |
| `--text-display` | 40/48 px  | 500    | Hero landing, h1 marketing          | `text-display` |
| `--text-h1`      | 32/40 px  | 500    | Page title (dashboard, public page) | `text-h1`      |
| `--text-h2`      | 24/32 px  | 500    | Section title                       | `text-h2`      |
| `--text-h3`      | 20/28 px  | 500    | Card title, modal title             | `text-h3`      |
| `--text-body-lg` | 18/28 px  | 400    | Lead paragraph, large body          | `text-body-lg` |
| `--text-body`    | 16/24 px  | 400    | **Default** body text               | `text-base`    |
| `--text-body-sm` | 14/20 px  | 400    | Secondary body, labels              | `text-sm`      |
| `--text-caption` | 12/16 px  | 400    | Captions, timestamps, micro-copy    | `text-xs`      |
| `--text-button`  | 14/20 px  | 500    | Buttons, CTAs                       | `text-button`  |

**Tracking:**

- Display + H1: `-0.02em` (tighter for confidence)
- H2-H3: `-0.01em`
- Body: `0` (default)
- Caption: `+0.01em` (slightly looser para legibilidade pequena)

### 1.4 Spacing & Layout

#### 1.4.1 Spacing scale (4px base)

```
4 → 8 → 12 → 16 → 24 → 32 → 48 → 64 → 96 → 128
```

Mapeamento Tailwind: `space-1, space-2, space-3, space-4, space-6, space-8, space-12, space-16, space-24, space-32` (sem mudança vs default).

**Padrões canônicos:**

- Inner padding de Card: `24` (px)
- Gap entre Cards numa lista: `12`
- Gap entre seções de uma page: `48`
- Container max-width:
  - Mobile-first: `100%` com `padding-x: 16`
  - Tablet (≥ 640px): `max-width: 480px`
  - Desktop (≥ 1024px): `max-width: 720px` (single column) ou `1200px` (analytics/dashboard)
- Touch target mínimo: `44 × 44` (Apple HIG)

#### 1.4.2 Border radius scale

```
4   → micro (small badges, inline tags)
8   → inputs, small buttons
12  → standard buttons, cards aninhados
16  → cards default ★
24  → modais, sheets, panels grandes
9999 → avatars, pills, fully-rounded
```

**Default canônico:** `16` (cards). Tudo "default" se for surface ≥ 200px². Reservar `24` para superfícies de destaque (modals, hero blocks).

#### 1.4.3 Elevation / Shadows

Sombras sutis warm-tinted (lavender hint), nunca neutral-gray. 3 níveis:

| Nível         | Token       | CSS                                        | Use                      |
| ------------- | ----------- | ------------------------------------------ | ------------------------ |
| `--shadow-sm` | sutil       | `0 1px 2px 0 rgba(91, 58, 140, 0.05)`      | Cards default            |
| `--shadow-md` | hover/focus | `0 4px 12px -2px rgba(91, 58, 140, 0.10)`  | Card hover, dropdowns    |
| `--shadow-lg` | modais      | `0 16px 32px -4px rgba(91, 58, 140, 0.18)` | Modals, sheets, popovers |

Dark theme: substituir RGB para preto puro `(0, 0, 0)` mantendo alphas (tone shift natural).

### 1.5 Motion

#### 1.5.1 Durations

```
75ms  → micro-feedback (toggle, switch flip)
150ms → micro-interactions (hover, focus rings)
250ms → default (most transitions, modals open) ★
350ms → page transitions, large surfaces
500ms → orchestrated (multi-element entry, hero animations) — raro
```

#### 1.5.2 Easing curves

```
--ease-out:     cubic-bezier(0.2, 0.8, 0.2, 1)   ← default entries (panels, toasts)
--ease-in-out:  cubic-bezier(0.4, 0.0, 0.2, 1)   ← bidirectional (toggles, theme switch)
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1) ← playful overshoot (drag-drop drop, success toasts)
```

**Princípio:** `--ease-out` para entradas (perdoa um pouco de delay), `--ease-in` para saídas (some rápido). Spring só pra surfaces que precisam de "personalidade" (drop confirm, success state).

#### 1.5.3 Patterns reservados

- **Reduced motion:** TODA animação envelopada em `@media (prefers-reduced-motion: no-preference)`. Default sem motion para acessibilidade.
- **No bouncing on scroll:** sem parallax, sem sticky-on-scroll que não seja navegação.
- **Skeleton > Spinner:** loading states usam skeleton shimmer (`@keyframes shimmer 1.5s ease-in-out infinite`), não spinners (exceto botões em-flight).

### 1.6 Logo Seed

**Status:** wordmark proposal, sem logomark (símbolo) no MVP. Refresh para Phase 2 se necessário.

```
PROPOSTA:
                                    ★
   ▙▖▘▘▌▌▘▌▌▖     ←  wordmark      Símbolo (Phase 2):
   ▙▖▌▌▌▌▘▌▌▌                       espiral aberta inspirada
                                     em fita/marca-página
   "biolink" all-lowercase, DM Sans Bold (700),
   tracking -0.04em, plum primary.
   Asterisco ★ ou ponto • como pivô final (futuro logomark hook).
```

**Specs:**

- Wordmark: "biolink" all-lowercase, DM Sans Bold (700), tracking `-0.04em`
- Cor: `var(--primary)` (deep plum em light/brand, lavender em dark)
- Tamanhos: 16px header, 24px sidebar dashboard, 40px footer landing
- Spacing reservado: 8px de padding ao redor em qualquer container

**Favicon:** asterisco ★ em peach `#FFB5A7` sobre lavender `#F4EFFB`, 32×32 + 16×16 + maskable 512×512. Próximo arquivo: `public/favicon.ico` + `public/icon.png` (Phase migração).

---

## 2. Wireframes — 10 Telas Core

> **Convenção:** ASCII wireframes em mobile (375px viewport) como representação canônica. Desktop notas em texto. Componentes em CAIXA ALTA (ex.: `BUTTON`, `INPUT`); copy em "aspas duplas"; estados condicionais entre `[colchetes]`.

### 2.1 Landing `/`

**Propósito:** explicar produto em <3s, capturar CTA primário (signup).

```
┌─────────────────────────────────┐
│ [LOGO biolink]      [LOGIN] [→] │ ← Header sticky (transparent on scroll-top)
├─────────────────────────────────┤
│                                 │
│      ★ Seu link na bio,        │ ← Display 40, plum
│        do seu jeito.            │
│                                 │
│      Crie sua página            │ ← Body-lg 18, muted-fg
│      pública gratuita —          │
│      seus links, seus dados.    │
│                                 │
│   ╭─────────────────────────╮   │
│   │   Criar minha página →  │   │ ← BUTTON primary, h-12, full-width mobile
│   ╰─────────────────────────╯   │
│                                 │
│   ╭──── Já tem conta? Entrar ╮  │ ← BUTTON ghost (text-only secondary CTA)
│                                 │
│   ─────────────────────────     │
│                                 │
│   3 motivos:                    │ ← Body-sm uppercase muted
│                                 │
│   ┌───────────────────────┐    │
│   │ ◐  Sem ads forçados   │    │ ← 3 cards stack, h2 + body
│   │     Seu perfil 100%   │    │
│   │     seu, sempre.      │    │
│   └───────────────────────┘    │
│                                 │
│   ┌───────────────────────┐    │
│   │ ▦  Analytics próprios │    │
│   │     7d e 30d, sem     │    │
│   │     terceiros.        │    │
│   └───────────────────────┘    │
│                                 │
│   ┌───────────────────────┐    │
│   │ ⚙  Open source        │    │
│   │     Código auditável  │    │
│   │     no GitHub.        │    │
│   └───────────────────────┘    │
│                                 │
│   ─────────────────────────     │
│                                 │
│   [github icon] open-source     │ ← Footer minimal
│   gratuito • LGPD-mindful       │
│                                 │
└─────────────────────────────────┘
```

**Estados:**

- **Usuário autenticado:** CTA primário troca para "Ir para meu dashboard →" (FR3); restante da página igual.
- **Loading:** Server Component, sem skeleton (SSR direto).

**Desktop (≥1024px):** hero ocupa viewport-height (vh100), CTAs lado a lado, 3 cards lado a lado em grid de 3. Container max-width: 1024px, centered.

**Tokens-chave:** `--background` (lavender mist), `--primary` button, `--accent` (peach) hover dos cards 3-motivos.

---

### 2.2 Signup `/signup`

```
┌─────────────────────────────────┐
│ [← voltar]    [logo biolink]    │ ← Header minimal
├─────────────────────────────────┤
│                                 │
│   Criar conta                   │ ← H1 32
│                                 │
│   E-mail                        │ ← Body-sm label
│   ╭─────────────────────────╮  │
│   │ seu@email.com           │  │ ← INPUT h-12, radius 12
│   ╰─────────────────────────╯  │
│                                 │
│   Senha                         │
│   ╭─────────────────────────╮  │
│   │ ••••••••           [👁] │  │ ← INPUT + show/hide toggle
│   ╰─────────────────────────╯  │
│   Mínimo 8 caracteres.          │ ← Caption muted
│                                 │
│   Confirmar senha               │
│   ╭─────────────────────────╮  │
│   │ ••••••••                │  │
│   ╰─────────────────────────╯  │
│                                 │
│   Username                      │
│   ╭─────────────────────────╮  │
│   │ biolink.app/@ demo      │  │ ← INPUT prefix grupo, validação live
│   ╰─────────────────────────╯  │
│   ✓ disponível                  │ ← Inline status (success/error/loading)
│                                 │
│   ☐  Li e aceito os termos     │ ← CHECKBOX + link "termos"
│      e a política de            │
│      privacidade.               │
│                                 │
│   ╭─────────────────────────╮  │
│   │      Criar conta        │  │ ← BUTTON primary full-width, disabled
│   ╰─────────────────────────╯  │   até form válido
│                                 │
│   Já tem conta? Entrar →        │ ← Link secundário
│                                 │
└─────────────────────────────────┘
```

**Estados de validação:**

- Email inválido: border destructive + helper text "E-mail inválido" abaixo
- Senha < 8: helper "Mínimo 8 caracteres" em destructive
- Username em uso: prefixo verde vira destructive, helper "Username em uso. Tente outro."
- Username válido + disponível: helper "✓ disponível" success-color
- Submit em-flight: BUTTON com spinner inline + texto "Criando..."

**Desktop:** form max-width 480px centralizado vertical.

---

### 2.3 Login `/login`

```
┌─────────────────────────────────┐
│ [← voltar]    [logo biolink]    │
├─────────────────────────────────┤
│                                 │
│   Entrar                        │ ← H1
│                                 │
│   E-mail                        │
│   ╭─────────────────────────╮  │
│   │ seu@email.com           │  │
│   ╰─────────────────────────╯  │
│                                 │
│   Senha                         │
│   ╭─────────────────────────╮  │
│   │ ••••••••           [👁] │  │
│   ╰─────────────────────────╯  │
│                                 │
│            Esqueci a senha →    │ ← Link right-aligned
│                                 │
│   ╭─────────────────────────╮  │
│   │         Entrar          │  │ ← BUTTON primary
│   ╰─────────────────────────╯  │
│                                 │
│   ─────  ou  ─────              │ ← Divider (Phase 2: OAuth)
│                                 │
│   Ainda não tem conta?          │
│   Criar conta →                 │
│                                 │
└─────────────────────────────────┘
```

**Estados:**

- Credenciais inválidas: TOAST destructive top-right "E-mail ou senha incorretos" (mensagem genérica per OWASP — não revela qual campo falhou)
- Email não verificado: TOAST warning "Confirme seu e-mail. Ver e-mail no seu inbox" + botão "Reenviar"

---

### 2.4 Reset Password `/reset-password`

```
┌─────────────────────────────────┐
│ [← voltar]    [logo biolink]    │
├─────────────────────────────────┤
│                                 │
│   Esqueceu a senha?             │ ← H1
│                                 │
│   Te mandamos um link pra       │ ← Body
│   redefinir.                    │
│                                 │
│   E-mail                        │
│   ╭─────────────────────────╮  │
│   │ seu@email.com           │  │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │   Enviar link de reset  │  │ ← BUTTON primary
│   ╰─────────────────────────╯  │
│                                 │
│   Voltar para login →           │
│                                 │
└─────────────────────────────────┘
```

**Após submit (success state):**

```
│                                 │
│   ✉  E-mail enviado!            │ ← Success state inline
│                                 │
│   Confira sua caixa de entrada  │
│   (ou spam) para redefinir      │
│   sua senha.                    │
│                                 │
│   Voltar para login →           │
│                                 │
```

**`/reset-password/confirm`** (post-link click): mesmo layout, mas com 2 inputs (nova senha + confirmar) + botão "Salvar nova senha".

---

### 2.5 Dashboard / Links `/dashboard`

```
┌─────────────────────────────────┐
│ [≡] BIOLINK     [@demo ▾] [⊙]  │ ← Header: menu mobile + user dropdown
├─────────────────────────────────┤  + theme switch (☀/☾/✦)
│                                 │
│   Meus links                    │ ← H1 32
│   biolink.app/@demo  [copiar]  │ ← Body + copy-to-clipboard button
│                                 │
│   ╭─────────────────────────╮  │ ← Card stack — drag handle visible on hover
│   │ ⋮⋮  ✓                   │  │
│   │  Site pessoal          │  │ ← Link card: drag handle + visible toggle
│   │  helio.dev             │  │   + title + url + edit/delete
│   │             [✎] […]    │  │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │ ⋮⋮  ✓                   │  │
│   │  GitHub                │  │
│   │  github.com/helionj    │  │
│   │             [✎] […]    │  │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │ ⋮⋮  ⊘  (hidden)         │  │ ← Link oculto: opacity 0.5 + label
│   │  Newsletter            │  │
│   │  newsletter.helio.dev  │  │
│   │             [✎] […]    │  │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │  ⊕  Adicionar link      │  │ ← BUTTON dashed border, accent on hover
│   ╰─────────────────────────╯  │
│                                 │
└─────────────────────────────────┘
```

**Estados:**

- **Empty (0 links):** ilustração soft (peach + lavender blob) + texto "Adicione seu primeiro link →" + BUTTON CTA grande.
- **Loading:** 3 skeleton cards (placeholder com shimmer).
- **Drag em progresso:** card sendo arrastado tem `--shadow-lg` + opacity 0.95, drop zone destacada com `--accent` background.
- **Optimistic update falhou:** rollback visual + TOAST destructive "Não foi possível reordenar. Tente novamente."

**Mobile-specific:**

- Drag handle (⋮⋮) sempre visível em mobile (não hover-only)
- Edit pen (✎) + menu (…) sempre visíveis em mobile
- Sidebar vira drawer (sheet) acionada pelo ☰

**Desktop (≥1024px):**

- Sidebar fixa esquerda (240px), conteúdo right
- Drag handle aparece on `:hover` no row (revela espacial)
- Inline edit acionado por clique no título (transforma em INPUT)

---

### 2.6 Profile `/dashboard/profile`

```
┌─────────────────────────────────┐
│ [≡] BIOLINK     [@demo ▾] [⊙]  │
├─────────────────────────────────┤
│                                 │
│   Seu perfil                    │ ← H1
│   Edite as informações que      │ ← Body muted
│   aparecem em /@demo            │
│                                 │
│   ─── Foto ───                  │ ← Subseção label
│                                 │
│   ╭─────────────────────────╮  │
│   │       ┌──────────┐       │ │
│   │       │  AVATAR  │       │ │ ← 96×96 circle
│   │       │   96x96  │       │ │
│   │       └──────────┘       │ │
│   │                           │ │
│   │      [Trocar foto]        │ │ ← BUTTON outline
│   │   JPG/PNG/WebP até 1MB    │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ─── Identidade ───            │
│                                 │
│   ╭─────────────────────────╮  │
│   │ Nome de exibição        │ │ ← Card form
│   │ ╭─────────────────────╮ │ │
│   │ │ Demóstenes          │ │ │
│   │ ╰─────────────────────╯ │ │
│   │ 10/50                   │ │ ← Char counter
│   │                         │ │
│   │ Bio                     │ │
│   │ ╭─────────────────────╮ │ │
│   │ │ meu nome é demo     │ │ │ ← TEXTAREA rows=4
│   │ │                     │ │ │
│   │ ╰─────────────────────╯ │ │
│   │ 18/280                  │ │
│   │                         │ │
│   │ ╭───────────────────╮   │ │
│   │ │  Salvar perfil    │   │ │ ← BUTTON primary
│   │ ╰───────────────────╯   │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ─── URL pública ───           │
│                                 │
│   ╭─────────────────────────╮  │
│   │ Username                │ │
│   │ ╭─────────────────────╮ │ │
│   │ │ /@demo              │ │ │
│   │ ╰─────────────────────╯ │ │
│   │ ⚠ A URL pública mudará  │ │ ← Warning amber
│   │   para /@<novo>         │ │
│   │                         │ │
│   │ ╭───────────────────╮   │ │
│   │ │ Salvar username   │   │ │
│   │ ╰───────────────────╯   │ │
│   ╰─────────────────────────╯  │
│                                 │
└─────────────────────────────────┘
```

**Notas:**

- Refresh visual da Story 5.1: contadores `X/N` em `--muted-foreground`, button text "Salvar perfil" → mesma ação que já existe.
- Avatar upload: ainda usa AvatarUpload component (Story 3.4); CSS atualizado para 16px radius card.

---

### 2.7 Theme `/dashboard/theme`

```
┌─────────────────────────────────┐
│ [≡] BIOLINK     [@demo ▾] [⊙]  │
├─────────────────────────────────┤
│                                 │
│   Tema da página                │ ← H1
│   Escolha o visual que aparece  │ ← Body muted
│   em /@demo                     │
│                                 │
│   ╭─────────────────────────╮  │
│   │  ☀ Claro          ◉    │ │ ← Card with theme name + radio
│   │  Lavender mist          │ │   selected state border-primary +
│   │  ┌──────────────────┐  │ │   shadow-md
│   │  │ /preview small   │  │ │
│   │  │ /@demo no light  │  │ │ ← Mini preview embed
│   │  └──────────────────┘  │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │  ☾ Escuro          ○   │ │
│   │  Deep plum night        │ │
│   │  ┌──────────────────┐  │ │
│   │  │ /preview small   │  │ │
│   │  │ /@demo no dark   │  │ │
│   │  └──────────────────┘  │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │  ✦ Brand           ○   │ │ ← Brand theme card
│   │  Lavender + peach pop   │ │
│   │  ┌──────────────────┐  │ │
│   │  │ /preview small   │  │ │
│   │  │ /@demo no brand  │  │ │
│   │  └──────────────────┘  │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │      Salvar tema        │ │ ← BUTTON primary; disabled
│   ╰─────────────────────────╯  │   até user mudar seleção
│                                 │
└─────────────────────────────────┘
```

**Notas:**

- Mini preview = iframe ou Server Component isolado renderizando `/@demo` em escala 0.4 com tema aplicado (já implementado na Story 3.3, só atualizar tokens).
- Tema atual: card com border-primary + dot ◉. Outros: border default + dot ○.
- Salvar dispara Server Action → `revalidateUserSurface(username)` → próximo SSR da pública pega.

---

### 2.8 Analytics `/dashboard/analytics`

```
┌─────────────────────────────────┐
│ [≡] BIOLINK     [@demo ▾] [⊙]  │
├─────────────────────────────────┤
│                                 │
│   Analytics                     │ ← H1
│   Como sua página tá indo       │ ← Body muted
│                                 │
│   ┌──────────┬──────────┐      │ ← Grid 2×2 mobile / 1×4 desktop
│   │ ▦ Page   │ ⊙ Clicks │      │
│   │ Views    │ total    │      │
│   │  1.2K    │   234    │      │ ← H2 big number, plum
│   │ lifetime │ lifetime │      │ ← Caption muted
│   ├──────────┼──────────┤      │
│   │ ▦ Views  │ ⊙ Clicks │      │
│   │  30d     │  30d     │      │
│   │   89     │    34    │      │
│   │ +12% ↑   │ +5% ↑    │      │ ← Delta vs 30d-anterior, green if up
│   └──────────┴──────────┘      │
│                                 │
│   ─── Evolução ───              │
│                                 │
│   [7d] [30d] [▲ recharts]      │ ← Toggle 7d/30d + linha simples
│                                 │
│   ╭─────────────────────────╮  │
│   │  ↗ Clicks: 89          │ │ ← Chart card com legenda em hover
│   │                         │ │
│   │       ╱──╲              │ │
│   │      ╱    ╲             │ │ ← Linha smooth, primary color
│   │     ╱      ╲___         │ │   gradiente sutil bg under
│   │ ___╱                    │ │
│   │ ┴───┴───┴───┴───┴───   │ │
│   │ 23  25  27  29  31     │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ─── Cliques por link ───      │
│                                 │
│   ╭─────────────────────────╮  │
│   │ Site pessoal            │ │
│   │ ████████████████ 89    │ │ ← Bar inline + count right
│   │                         │ │
│   │ GitHub                  │ │
│   │ ██████████ 56          │ │
│   │                         │ │
│   │ Newsletter              │ │
│   │ ████ 23                │ │
│   ╰─────────────────────────╯  │
│                                 │
└─────────────────────────────────┘
```

**Estados:**

- **Empty (0 events):** ilustração + "Compartilhe sua página em /@demo para começar a ver dados aqui."
- **Loading:** 4 skeleton cards + skeleton chart + skeleton table

---

### 2.9 Account `/dashboard/account`

```
┌─────────────────────────────────┐
│ [≡] BIOLINK     [@demo ▾] [⊙]  │
├─────────────────────────────────┤
│                                 │
│   Conta                         │ ← H1
│   Gerencie seus dados           │ ← Body muted
│                                 │
│   ─── Dados ───                 │
│                                 │
│   ╭─────────────────────────╮  │
│   │ ⬇ Exportar dados        │ │ ← H3 + ícone
│   │                         │ │
│   │ Baixe um JSON com seu   │ │ ← Body muted
│   │ perfil, links e eventos │ │
│   │ (pseudonimizados).      │ │
│   │                         │ │
│   │ ╭───────────────────╮   │ │
│   │ │  Exportar JSON    │   │ │ ← BUTTON outline
│   │ ╰───────────────────╯   │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ─── Permanente ───            │
│                                 │
│   ╭─────────────────────────╮  │ ← Card com border destructive sutil
│   │ ⚠ Excluir conta         │ │   bg destructive/5
│   │                         │ │
│   │ Esta ação é permanente  │ │
│   │ e irreversível.         │ │
│   │ Todos seus dados serão  │ │
│   │ apagados.               │ │
│   │                         │ │
│   │ ╭───────────────────╮   │ │
│   │ │  Excluir conta    │   │ │ ← BUTTON destructive
│   │ ╰───────────────────╯   │ │
│   ╰─────────────────────────╯  │
│                                 │
└─────────────────────────────────┘
```

**Modal de confirmação delete:**

```
   ╭─ AlertDialog ──────────────╮
   │                            │
   │  Excluir conta?            │ ← H3
   │                            │
   │  Para confirmar, digite    │
   │  seu username @demo abaixo │
   │  ╭─────────────────────╮  │
   │  │ @demo               │  │ ← INPUT — match case-insensitive
   │  ╰─────────────────────╯  │
   │                            │
   │  [Cancelar] [Excluir →]    │ ← BUTTON destructive disabled até match
   ╰────────────────────────────╯
```

---

### 2.10 Public `/@username`

```
┌─────────────────────────────────┐
│                                 │ ← NO header. NO chrome. Página é o conteúdo.
│                                 │
│                                 │
│           ╭─────╮               │ ← Avatar 96×96 centered, top padding 48
│           │ AVA │               │
│           ╰─────╯               │
│                                 │
│         Demóstenes              │ ← H1 32, plum, centered
│                                 │
│      meu nome é demo            │ ← Body 16, muted-fg, centered
│                                 │
│                                 │
│   ╭─────────────────────────╮  │
│   │ ★  Site pessoal      → │ │ ← Link card: icon left, title center,
│   │     helio.dev           │ │   arrow right; subtle url muted-fg
│   ╰─────────────────────────╯  │   border 1px lavender; hover: shadow-md
│                                 │
│   ╭─────────────────────────╮  │
│   │ ★  GitHub            → │ │
│   │     github.com/helionj   │ │
│   ╰─────────────────────────╯  │
│                                 │
│   ╭─────────────────────────╮  │
│   │ ✉  Newsletter         → │ │
│   │     newsletter.helio.dev│ │
│   ╰─────────────────────────╯  │
│                                 │
│                                 │
│         Compartilhe ↗           │ ← Tiny share button (Phase 2)
│                                 │
│                                 │
│   ─────────────────────────     │
│   feito com biolink ★            │ ← Footer micro, link à landing
│   ─────────────────────────     │
│                                 │
└─────────────────────────────────┘
```

**Estados:**

- **0 links visíveis** (mas perfil existe): "@demo ainda não publicou links." em `--muted-foreground`, italic.
- **Profile não existe ou `is_published=false`:** 404 (mesmo design da `app/not-found.tsx`).
- **Tema brand:** background `#F0E8FF`, cards `#FFFFFF` puros (POP visual), accents peach em hover.
- **Tema dark:** background `#14102A`, cards `#1F1838`, links `#B8A1E8`.

**Performance contracts (NFR3, NFR4):**

- LCP target: < 2.0s (mais conservador que NFR3's 2.5s)
- Bundle: ≤ 180KB gz (margem vs NFR4's 200KB cap)
- 0 JS para tracking (server-side via ViewBeacon ou similar)
- Avatar: `next/image priority` quando há URL real

**Microcopy (PT-BR):**

- Compartilhe ↗ → "Copiar link" → "Copiado!" (após click + toast)
- feito com biolink ★ → link para `/` (landing)

---

## 3. Interaction Patterns

### 3.1 Drag-and-drop (links reorder)

**Touch + keyboard pari-passu:**

| Aspecto         | Mouse/Touch                                                                  | Keyboard (a11y)                                                                         |
| --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Trigger         | Grab handle (⋮⋮) drag                                                        | Focus row + ↑/↓ ou Cmd+↑/Cmd+↓                                                          |
| Visual feedback | Card elevation (`--shadow-lg`), opacity 0.95, peach accent na drop zone      | Card destacado com border-primary + announcement aria-live "Movido para posição 2 de 4" |
| Persistence     | Otimista (UI atualiza antes da response)                                     | Idem                                                                                    |
| Rollback        | Card volta posição original + TOAST destructive "Não foi possível reordenar" | Idem + screen reader announces                                                          |
| Duration        | 250ms ease-out drop                                                          | Idem                                                                                    |

**Edge cases:**

- Drag de link único: handle some (não há onde arrastar)
- Drag desktop multi-select: NÃO suportar (overhead UX, esperar feedback real)

**Library:** `@dnd-kit/core` (já em uso, Story 2.6) — verify shipped version respeita `prefers-reduced-motion` (else patch).

### 3.2 Edição inline (link title)

**Pattern:** "calm edit" — clica, vira input, sai, salva.

```
State 1 (display):
  ─────────────────────
  Site pessoal              ← H4 text
  ─────────────────────

State 2 (hover, desktop only):
  ─────────────────────
  Site pessoal      [✎]    ← Pen icon revealed
  ─────────────────────

State 3 (clicked, mobile + desktop):
  ─────────────────────
  ╭───────────────────╮
  │ Site pessoal     ▼│   ← INPUT focused, all-selected
  ╰───────────────────╯
  Esc: cancelar · Enter: salvar
  ─────────────────────

State 4 (on blur or Enter):
  ─────────────────────
  Site pessoal       ✓     ← Brief checkmark (250ms) then disappears
  ─────────────────────
```

**Validation:** ≤ 100 chars (FR6), trim. Empty string → revert para original + TOAST "Título obrigatório".

**Keyboard:**

- Tab focuses next field
- Escape cancels (revert)
- Enter saves
- Cmd+Enter also saves (consistency with multi-line elsewhere)

### 3.3 Toggle visibility (switch)

**Pattern shadcn Switch primitive (existing).** Visual changes per Soft Studio:

```
ON:                          OFF:
╭─────────╮                  ╭─────────╮
│ ●○○○○○○ │ ← peach accent  │ ○○○○○○● │ ← muted bg
╰─────────╯                  ╰─────────╯
"visível"                    "oculto"
```

- ON state: background `--accent` (peach), thumb white, slides right
- OFF state: background `--muted`, thumb `--muted-foreground`, slides left
- Transition: 200ms `--ease-spring` (sutil bounce)
- a11y: `role="switch"` + `aria-checked` + screen reader announce "Link oculto" ou "Link visível" ao mudar

**Optimistic:** UI muda imediato; rollback se Server Action falhar (TOAST).

### 3.4 Theme preview live

**Pattern (já em Story 3.3, sem refactor necessário):** 3 cards em `/dashboard/theme` cada um com mini-preview do `/@username` no tema, renderizado server-side com `<iframe src="/@user?_preview=light">` (ou Server Component isolado). Soft Studio enhancement:

- Mini preview em scale 0.4 (legível mas pequeno)
- Card selected: border 2px `--primary` + `--shadow-md` + radio dot ◉
- Card unselected: border 1px `--border` + radio ○
- Transition de seleção: 250ms ease-out na border (não no card todo)
- Save button apenas habilita se tema mudou (current ≠ persisted)
- Após save: TOAST `--success` "Tema salvo! /@demo atualizada." + revalidate

### 3.5 Copy-to-clipboard

**Pattern:** botão inline ao lado de URLs editáveis.

```
biolink.app/@demo  [copy] ← icon-only button ghost

After click:
biolink.app/@demo  [✓]    ← Brief 1.5s success
                  + TOAST "Link copiado"
```

- `navigator.clipboard.writeText()` (HTTPS only — degrade graceful: TOAST "Selecione e copie manualmente")
- Icon swap 1.5s
- TOAST top-right success com swipe-to-dismiss
- a11y: `aria-label="Copiar URL"` + announce success

### 3.6 Destructive confirmation (dialog)

**Pattern double-confirm** (delete link, delete account, signout-from-all):

```
╭─ AlertDialog ────────────────╮
│ ⚠ Excluir link?              │
│                              │ ← H3 + ícone
│ Essa ação é permanente.      │
│ Os dados de analytics deste  │
│ link também serão apagados.  │
│                              │
│         [Cancelar] [Excluir] │ ← Right-aligned; destructive
╰──────────────────────────────╯
```

- Modal overlay `rgba(0,0,0,0.6)` (warm dim, com hint plum em dark theme)
- Modal: `--surface-elevated` bg, `--shadow-lg`, radius 24
- Animation: fade overlay + scale 0.95→1.0 modal entry (250ms)
- Focus trap: primeiro botão "Cancelar" focado (safe default)
- Esc fecha (= Cancelar)
- Click outside: fecha (cancelar) — exceto delete account (requer typed confirmation)

**Account delete special:** input com username typed → button só habilita com match case-insensitive (Story 4.5 pattern preserved).

### 3.7 Form submit feedback

**3 estados visuais por botão de submit:**

```
State A (idle, valid):
╭─────────────────╮
│  Salvar perfil  │  ← BUTTON primary, full enabled
╰─────────────────╯

State B (in-flight):
╭─────────────────╮
│ ⊙ Salvando...   │  ← spinner inline + texto loading, disabled
╰─────────────────╯

State C (success, transient):
╭─────────────────╮
│ ✓ Salvo!        │  ← 1.5s success state then back to idle
╰─────────────────╯
+ TOAST "Perfil atualizado"
```

**Submit error:** TOAST destructive top-right + form fields que vieram com erro recebem border destructive + helper text inline (`<FormMessage>` shadcn pattern).

### 3.8 Loading states

| Surface                         | Pattern                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| Server Component initial render | SSR direto (sem skeleton) — Next.js streaming se necessário |
| Card lists (links, analytics)   | Skeleton com shimmer animation (3-5 placeholder cards)      |
| Buttons in-flight               | Inline spinner + texto loading + disabled                   |
| Image loading (avatar)          | `next/image` placeholder blur (low-res preview)             |
| Modal opening                   | Fade overlay 150ms + scale modal 250ms                      |

**Shimmer keyframes (reduced-motion-friendly):**

```css
@keyframes shimmer {
  from {
    background-position: -200% 0;
  }
  to {
    background-position: 200% 0;
  }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--muted) 0%,
    var(--muted-foreground) / 20 50%,
    var(--muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: var(--muted);
  }
}
```

### 3.9 Toast (notifications)

**Library:** `sonner` (já em uso, Story 1.8). Soft Studio overrides:

- Position: top-right desktop, top-center mobile (consistency with browser system notifs)
- Width: max 360px desktop, 100% - 32px mobile
- Duration: success 4s, info 4s, warning 6s, destructive 8s
- Surface: `--surface-elevated` + `--shadow-lg` + radius 16
- Border-left 4px: success green / warning amber / destructive red / info plum
- Dismiss: swipe right (mobile) ou X button (desktop)
- Stack: max 3 visíveis, FIFO collapse

---

## 4. Acessibilidade — WCAG 2.1 AA

### 4.1 Contraste

**Validation programática (gate de CI):** todos os pares text/bg listed em §1.2 acima passam AA (4.5:1 normal text, 3:1 large text e UI components grandes). Atualizar `scripts/check-contrast.mjs` para validar os 3 novos temas Soft Studio.

**Casos especiais:**

- `--accent` (peach) NUNCA usado para body text — apenas decorative surfaces, badges, hover highlights
- `--muted-foreground` (não-decorativo): testado contra `--background` AND `--surface` AND `--muted` (worst case)
- Disabled states: opacity 0.5 sobre o foreground original — testado e mantém >= 3:1 mesmo após dim

### 4.2 Keyboard navigation

**Princípios:**

- Toda interação alcançável via Tab/Shift+Tab/Enter/Space/Escape/Arrows
- Skip-to-content link no início de cada página authenticated (`<a href="#main-content">`)
- Focus order = visual reading order (LTR top-to-bottom)
- Focus indicator visível em TODOS os interactive elements: `ring-2 ring-primary ring-offset-2`

**Drag-and-drop a11y alternative (Story 2.6 PRESERVE):** botões ↑/↓ inline em cada link no menu `[…]` (mouse-only é violação WCAG).

**Modal focus trap:** `@radix-ui/react-dialog` (via shadcn) já handles. Verify primeiro elemento focado é Cancelar (safer default).

### 4.3 Screen reader

**aria-labels obrigatórios:**

- Icon-only buttons: `aria-label="..."` descritivo (ex: `aria-label="Copiar URL"`)
- Switch toggle: `aria-checked={isVisible}` + `<label>` associado
- Drag handle: `aria-label="Arrastar para reordenar"` + announcements aria-live em drag
- Modal: `role="dialog" aria-labelledby="modal-title" aria-describedby="modal-description"`

**Semantic HTML primeiro:**

- `<main>` para conteúdo principal de cada page
- `<nav>` para sidebar dashboard
- `<header>`, `<footer>` para Landing
- `<article>` para cada link card no `/@username`
- Headings hierárquicos (H1 unique per page, H2/H3 nested)

**Smoke test manual (PRD §UX/A11y line 119):**

- VoiceOver (Mac) ou NVDA (Windows) navega cada nova story Done
- Documentar findings em `docs/a11y-audit.md` (já existe, expandir)

### 4.4 Color independence

- Status (success/error/warning) NUNCA comunicado só por cor — sempre + ícone (✓/⚠/✗) + texto
- Toggle visibility: ícone (✓/⊘) + texto label, não só posição do switch
- Charts: cores DIFERENTES suficientemente (não 2 tons do mesmo hue) + labels diretos

### 4.5 Motion / animation

- `@media (prefers-reduced-motion: reduce)` desliga TODAS as animações de durations >= 150ms
- Critical animations (focus ring, hover) ficam sem motion (instant state change)
- Skeleton shimmer: vira static gray
- Spinner em buttons: vira "Carregando..." texto-only

### 4.6 Touch targets

**Mínimo 44 × 44 px** (Apple HIG / WCAG 2.5.5 AAA mas obrigatório aqui):

- Buttons: h-12 (48px) padrão
- Icon-only buttons: 44×44 com padding generoso
- Link cards mobile: full row tap target (linha inteira é clicável, não só texto)
- Switch toggle: hit area 44×44 (visual menor mas tap area expandida)

### 4.7 Forms

- `<label for="...">` associado ao input (ou `<Label htmlFor>` shadcn pattern)
- Required: `aria-required="true"` + visual indicator (asterisco vermelho ou texto "obrigatório")
- Error: `aria-invalid="true"` + `aria-describedby` linking to helper text
- Validation: live mas debounced (não-disruptivo), `aria-live="polite"` para status

### 4.8 Language

- `<html lang="pt-BR">` em layout root
- TODA copy em PT-BR (NFR11)
- Phase 2 i18n: estrutura preparada para `<html lang>` dinâmico

---

## 5. Plano de Migração — Shipped → Soft Studio

> **Total estimado:** ~6-9 stories Epic 5 (complexity S a M cada). Sem migration SQL, sem RLS changes, sem mudança de FRs. ~15% dos arquivos tocam.

### 5.1 Phase 1 — Tokens swap (Story 5.2 candidato)

**Goal:** trocar paletas + radius + shadows + adicionar font loader. Zero mudança em componentes.

**Files:**

- `app/globals.css` — 3 paletas (light/dark/brand) reescritas com novos hex
- `app/layout.tsx` — adicionar `DM_Sans` font loader Next.js
- `scripts/check-contrast.mjs` — atualizar mock paletas com novos hex (gate verde antes de PR merge)
- `app/globals.css` — adicionar `--radius-*` scale tokens (4/8/12/16/24/9999)
- `app/globals.css` — adicionar `--shadow-*` tokens (sm/md/lg, warm-tinted)
- `app/globals.css` — adicionar tokens `--text-*` typescale + helpers `text-display`, `text-h1`, etc.

**Validação:**

- `pnpm check:contrast` PASS para os 3 temas
- `pnpm build` sem regressões
- Smoke runtime manual: `/` + `/dashboard` + `/@demo` em cada tema (light/dark/brand)
- Lighthouse CI verde (gate 90+)

**Risk:** baixo. Componentes já consomem tokens — swap é transparente.

### 5.2 Phase 2 — Primitives audit (Story 5.3 candidato)

**Goal:** verificar/ajustar 13 shadcn primitives para Soft Studio specs (radius 16 cards, peach hovers, etc.).

**Files (1 file = 1 primitive):**

- `components/ui/button.tsx` — radius 12 (já), verify peach `--accent` em ghost hover
- `components/ui/card.tsx` — radius 16 (subir de 8)
- `components/ui/input.tsx` — radius 12 (já), verify focus ring `--primary` 3px @ 0.5
- `components/ui/textarea.tsx` — idem input
- `components/ui/dialog.tsx` — radius 24, `--shadow-lg`
- `components/ui/alert-dialog.tsx` — idem dialog
- `components/ui/dropdown-menu.tsx` — radius 16, `--surface-elevated` bg
- `components/ui/sheet.tsx` — radius 24 top corners apenas
- `components/ui/sonner.tsx` — Soft Studio overrides (border-left 4px, top-right desktop / top-center mobile)
- `components/ui/switch.tsx` — peach `--accent` ON state, spring transition
- `components/ui/avatar.tsx` — radius 9999 (já)
- `components/ui/label.tsx` — typescale `text-sm` medium
- `components/ui/form.tsx` — FormMessage destructive color + ícone alert

**Validação:** existing component tests (33 files / 194 tests Story 5.1 baseline) MANTÊM verde.

**Risk:** baixo-médio. Mudanças visuais sutis; assertions de snapshot podem precisar update (delete obsoletos, capturar novos).

### 5.3 Phase 3 — Page-level adjustments (Stories 5.4-5.7 candidatos)

**Goal:** ajustar layouts e copy de cada page core para Soft Studio specs.

**Files (organizados por story):**

**Story 5.4 — Landing + Auth pages (`/`, `/signup`, `/login`, `/reset-password`):**

- `app/page.tsx` — hero copy, 3 cards de benefícios soft, footer
- `app/(auth)/signup/page.tsx` — form layout + microcopy
- `app/(auth)/login/page.tsx` — idem
- `app/(auth)/reset-password/*` — idem

**Story 5.5 — Dashboard core (`/dashboard`, layout):**

- `app/dashboard/layout.tsx` — sidebar 240px desktop / sheet mobile, header com user dropdown + theme switch
- `app/dashboard/page.tsx` (Links) — link cards Soft Studio, empty state com soft blob illustration
- `components/links/LinkRow.tsx` — drag handle visible mobile, optimistic updates
- `components/links/AddLinkButton.tsx` — dashed border, accent hover

**Story 5.6 — Profile + Theme + Account (`/dashboard/profile`, `/theme`, `/account`):**

- `app/dashboard/profile/page.tsx` + `components/profile/ProfileMetaForm.tsx` — section dividers, char counters subtler
- `app/dashboard/theme/page.tsx` — 3 cards com mini previews, selected state border-primary
- `app/dashboard/account/page.tsx` — destructive section bg destructive/5

**Story 5.7 — Analytics + Public page (`/dashboard/analytics`, `/@username`):**

- `app/dashboard/analytics/page.tsx` — 4 cards stat grid + chart simplificado (recharts) com plum line + peach gradient under
- `components/public/PublicPage.tsx` — radius 16 cards, avatar 96px, footer micro

**Validação:** Lighthouse CI ≥ 90 em todas categorias; LCP < 2.0s public page; bundle ≤ 180 KB gz.

### 5.4 Phase 4 — Motion + polish (Story 5.8 candidato)

**Goal:** materializar §1.5 (motion system) + §3 (interaction patterns refinements).

**Files:**

- `app/globals.css` — `--ease-*` curves + duration tokens
- `components/ui/switch.tsx` — spring transition na flip
- `components/links/LinkRow.tsx` — drag drop spring overshoot
- `components/ui/sonner.tsx` — toast entry com ease-out
- `components/ui/dialog.tsx` — modal scale 0.95→1.0 ease-out
- Skeleton shimmer keyframes + reduced-motion fallback (new file `components/ui/skeleton.tsx`)

**Validação:** smoke manual com macOS Reduce Motion ON + OFF.

### 5.5 Phase 5 — Logo + favicon (Story 5.9 candidato)

**Goal:** materializar §1.6.

**Files (novos):**

- `public/favicon.ico` (32×32 + 16×16 multi-resolution)
- `public/icon.png` (512×512 maskable PWA-compatible)
- `public/apple-icon.png` (180×180)
- `components/brand/Wordmark.tsx` — React component "biolink ★" reusável
- `app/layout.tsx` — meta tags atualizadas (theme-color, etc.)

**Validação:** open `/` em vários browsers + check favicon na aba, OG image renderiza correto (Phase 2 dynamic OG).

### 5.6 Stories Epic 5 sugeridas

| Story | Title                                      | Files affected | Effort |
| ----- | ------------------------------------------ | -------------- | ------ |
| 5.2   | Token swap → Soft Studio palette + DM Sans | ~3 files       | S      |
| 5.3   | Primitives audit (13 shadcn)               | 13 files       | M      |
| 5.4   | Landing + Auth pages Soft Studio           | ~5 files       | M      |
| 5.5   | Dashboard core (layout + links)            | ~5 files       | M      |
| 5.6   | Profile + Theme + Account                  | ~4 files       | M      |
| 5.7   | Analytics + Public page                    | ~3 files       | M      |
| 5.8   | Motion + polish                            | ~6 files       | S      |
| 5.9   | Logo + favicon                             | ~5 new files   | S      |

**Path crítico:** 5.2 → 5.3 (devem ser sequenciais; demais paralelizáveis).

**Total esforço:** ~10-15 dias úteis (1-1.5 sprint de 1 semana cada).

---

## 6. Resoluções (Morgan @pm — 2026-05-29)

> Todas as 5 open questions resolvidas pelo @pm em sessão de ratificação. PRD §UX/Branding amended via Change Log v0.5. Spec liberado para `@po *validate` + `@po *backlog-add` das 8 stories Epic 5.

### Q1 — PRD §UX/Branding amend (CRITICAL) ✅ APPROVED

**Decisão:** Amend aprovado. PRD v0.5 ratifica Soft Studio como identidade canônica (palette `#5B3A8C` + `#FFB5A7` + `#FAF8FF`; DM Sans; wordmark `biolink`).

**Rationale (Constitution Art. IV — NOT a violation):**

- PRD §UX/Branding L122-132 (v0.1-v0.4) explicitamente delegava: _"Status: placeholder no MVP — refino delegado a `@ux-design-expert` durante criação do `docs/frontend-spec.md`"_ + _"Decisão final de identidade visual é responsabilidade do `@ux-design-expert` após este PRD"_.
- Uma operou DENTRO dessa delegação. Não introduz FR/NFR novo; refina expressão visual de FR12 (3 temas) e FR14 (design system) já existentes.
- Amend formal materializa o que o PRD prometia desde v0.1. Zero invention.

**Action:** Editado `docs/prd.md` Change Log (v0.5) + §UX/Branding (rewrite completo). Source-of-truth pós-amend = este spec.

### Q2 — DM Sans bundle ✅ APPROVED

**Decisão:** DM Sans Variable via `next/font` aprovado sem necessidade de user testing.

**Rationale:**

- `next/font/google` **self-hosta** os arquivos no build (CDN do próprio Vercel pós-deploy) — zero runtime dependency em Google Fonts/Google domains, zero impacto LGPD/privacidade.
- Bundle: -6KB woff2 vs Inter (latin-ext subset). Lighter, não heavier. Risco perf = zero.
- Lighthouse CI (já em vigor, [STORY-3.5-F3] Done) é o gate empírico — pega regressão automaticamente em PR de Story 5.2 sem user testing.
- Override da minha parte (`@pm`) impondo outra fonte seria call fora do meu domínio (UX/visual expertise é @ux-design-expert).

**Action:** Story 5.2 (token swap) inclui adicionar `import { DM_Sans } from 'next/font/google'` em `app/layout.tsx`.

### Q3 — Tema "Brand" semantic clash ✅ RESOLVED

**Decisão:** Manter 3 temas presets (FR12 obrigatório). Tema `brand` continua existindo como token + DB enum (compatibilidade com shipped rows), mas **UI copy do `/dashboard/theme`** rebranded para **"Vibrante"** (vs "Brand").

**Rationale:**

- FR12 manda 3 presets. Mudar para 2 = amend de FR = scope creep desnecessário.
- O conflito semântico é só de naming UI, não de funcionalidade. Renomear "Brand" → "Vibrante" em PT-BR resolve confusão sem refactor de schema/code.
- Tema continua visualmente distinto de "Claro": `light` = lavender mist sutil + lavender surface; `brand` = lavender pop (`#F0E8FF`) + white card pops. Diferenciação visual mantida per §1.2 deste spec.
- Token interno `brand` preservado em `app/globals.css` + `pages.theme` enum + `lib/theme.ts` — zero impact em shipped code além do label visual.

**Action:** Story 5.6 (Profile + Theme + Account) inclui mudar copy de "Brand" → "Vibrante" em `app/dashboard/theme/page.tsx` (card label) + descrição "Lavender + peach pop". Tokens e schema preservados.

### Q4 — Logo ★ asterisco placeholder ✅ APPROVED

**Decisão:** Ship ★ asterisco como placeholder em Story 5.9. Logomark real (espiral, fita, marca-página, etc.) diferido para Phase 2.

**Rationale:**

- Custom logomark = investimento de brand (design exploratório, iterações, validação) fora do escopo do refresh visual incremental.
- Placeholder ★ é coerente com mood "indie/friendly" e suficiente para refresh shipping.
- Risco "weak brand signal" mitigado: produto é open-source MVP, usuários reais são amigos/conhecidos — sinal de marca não é gate de adoção neste estágio.

**Action:** Story 5.9 (Logo + favicon) implementa ★ wordmark + favicon. Backlog item LOW pra "logomark real Phase 2 (post v1.x stabilization)" será criado por `@po *backlog-add` paralelo.

### Q5 — Wordmark "biolink" all-lowercase ✅ APPROVED

**Decisão:** `biolink` all-lowercase confirmado.

**Rationale:**

- Lowercase = mais coerente com "friendly creator studio" mood (vs "BioLink" PascalCase = mais corporate; vs "BIOLINK" all-caps mono = mais brutalist, que foi Direction C rejeitada pelo owner).
- All-lowercase como wordmark é convenção contemporânea de marcas indie/tech-warm (notion, linear, vercel — mesmo subtle reading).
- Pelo tracking apertado (`-0.04em`) + peso bold + plum color, o wordmark mantém presence sem precisar de capitalize.

**Action:** Story 5.9 implementa `components/brand/Wordmark.tsx` com texto literal `"biolink"` (lowercase) + asterisco opcional.

---

### Handoff status

✅ Spec liberado para `@po *validate` (validar contra PRD v0.5 amended) + `@po *backlog-add` das 8 stories Epic 5 (5.2-5.9, MEDIUM priority).

---

## 7. Change Log

| Date       | Version | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 2026-05-29 | 0.1     | Draft inicial criado por `@ux-design-expert *create-front-end-spec` (Uma). Direção **Soft Studio** escolhida pelo owner entre 3 opções (A: refinar atual, B: Soft Studio ★, C: Câmara Brasileira). 3 paletas WCAG AA propostas + typescale DM Sans + 10 wireframes ASCII + 9 interaction patterns + a11y spec WCAG AA + plano migração 5-phase.                                                                                                                                                                                      | Uma (ux)    |
| 2026-05-29 | 0.2     | Ratificação por `@pm`. 5/5 Open Questions resolvidas: Q1 APPROVED (PRD amend v0.5 §UX/Branding); Q2 APPROVED (DM Sans via next/font self-hosted); Q3 RESOLVED (3 temas mantidos, "Brand" → "Vibrante" em UI copy); Q4 APPROVED (★ placeholder, logomark real Phase 2); Q5 APPROVED (`biolink` all-lowercase). Source-of-truth canônico para Stories 5.2-5.9. Liberado para `@po *validate` + `*backlog-add`.                                                                                                                         | Morgan (pm) |
| 2026-05-29 | 0.3     | P1 self-audit por `@ux-design-expert *validate docs/frontend-spec.md`. Score 89% (GO). Adicionadas 3 seções de fechamento de gap estrutural com `front-end-spec-tmpl.yaml` v2.0: §0.5 (Personas + Usability Goals + IA herdada + Flows herdados — por referência às Stories 1.5-5.1 shipped) e §9 (Design Handoff Checklist com 6 items, todos ✓). Sem mudança em §1-§6: cobertura visual/a11y/migration permanece intacta. P2/P3 (responsiveness table, component matrix, performance section dedicada, iconography lib) diferidos. | Uma (ux)    |

---

## 8. Próximos passos

1. ✅ ~~**@pm review:** amend PRD §UX/Branding L127 substituindo `#7C3AED` seed por palette Soft Studio. Open Questions §6 resolved.~~ **DONE 2026-05-29 — PRD v0.5 amended.**
2. **@po validate:** validar este spec contra PRD v0.5 (post-amend) + backlog (`[STORY-3.5-F2]` ✅ Done, 8 novos itens propostos abaixo).
3. **@po \*backlog-add:** registrar 8 stories Epic 5 (5.2-5.9) com priority MEDIUM (refresh visual = não-bloqueador, mas cohesion-impact alto). Plus 1 item LOW: "logomark real Phase 2 (post v1.x stabilization)".
4. **@sm \*draft 5.2:** primeira story do refresh, path crítico — tokens swap.
5. **Smoke manual em prod pós-Story 5.2:** validar que o swap não regrediu nenhum visual existente (3 temas × 10 telas = 30 surfaces).

---

## 9. Design Handoff Checklist

> Conforme `front-end-spec-tmpl.yaml` v2.0 §next-steps. Estado de prontidão deste spec para handoff ao `@po` (validate) + `@sm` (drafting Story 5.2).

- [x] **User flows documented** — referenciados das Stories 1.5-5.1 já em produção (§0.5.4). Refresh visual não introduz flows novos.
- [x] **Component inventory complete** — 13 shadcn primitives mapeados com radius/cor/state targets (§5.2). Matriz formal Variant × State será produzida pelo `@dev` durante Story 5.3 (primitives audit) — não bloqueia handoff.
- [x] **Accessibility requirements defined** — WCAG 2.1 AA + contrast ratios calculados nos 3 temas (§1.2 + §4). Gate programático via `pnpm check:contrast` já em CI (Story 3.2).
- [x] **Responsive strategy clear** — breakpoints (375 / 640 / 1024) e padrões mobile-first declarados (§1.4.1 + por tela em §2). Tabela formal de Adaptation Patterns pode ser adicionada como P2 caso `@po` sinalize gap.
- [x] **Brand guidelines incorporated** — Soft Studio palette + DM Sans + wordmark ratificados em PRD v0.5 §UX/Branding (Q1 §6). Source-of-truth canônico = este spec.
- [x] **Performance goals established** — LCP < 2.0s (pública), bundle ≤ 180 KB gz, Lighthouse ≥ 90 em todas categorias (§2.10 + Story 3.5 baseline). FPS target = 60fps em motion (Phase 4 polish).

**Status global:** ✅ pronto para `@po *validate` + `@sm *draft 5.2`.

---

— Uma, desenhando com empatia 💝
