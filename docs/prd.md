# PRD — BioLink (Product Requirements Document)

> **Status:** Draft — gerado em modo YOLO a partir de `docs/brief.md` (aprovado 2026-05-06).
> **Owner:** @pm (Morgan)
> **Source of truth (No-Invention):** `docs/brief.md` + Appendix B (decisões formais do stakeholder).

---

## Objetivos e Contexto

### Objetivos

- Entregar um MVP de bio-link funcional em produção em 6–10 semanas part-time (capacidade declarada: 20 h/semana).
- Exercitar end-to-end a stack-alvo: **Next.js (App Router) + Supabase (Auth + Postgres + RLS) + Vercel + GitHub Actions**, com pelo menos 1 feature de produção por capability.
- Disponibilizar a 5+ usuários reais (amigos/conhecidos) uma página pública de links em `/@username` com analytics interno e 3 temas presets.
- Manter o repositório **open-source desde o dia 1**, sem secrets versionados, com `LICENSE` (MIT-sugestão) e `README` legíveis por terceiros.
- Manter aderência integral à **Constitution AIOX** (Story-Driven, No Invention, Quality First) e ao Story Development Cycle (SDC) com gates @po e @qa.
- Operar 0 incidentes de segurança (RLS bem configurado, secrets fora do repo) durante o MVP.

### Contexto

Criadores casuais e profissionais lusófonos enfrentam fragmentação de presença digital — bios de redes sociais limitam a um único link, e as soluções existentes (Linktree, Beacons, Bio.link) cobrem o caso, mas com limites no plano free, branding/ads forçados e dados retidos pela plataforma. **BioLink** ocupa um gap específico: gratuito sem ads + analytics próprios + dados auditáveis sob controle do usuário, com URL pública curta (`/@username`).

Comercialmente, o mercado é saturado e maduro — não há urgência de mercado. **A urgência é didática:** o escopo casa exatamente com a stack que o aprendiz quer dominar (auth + RLS + SSR + design system + CI/CD + analytics), é pequeno o bastante para ser concluído sozinho em semanas e visível o suficiente para gerar feedback real de amigos. O sucesso é definido como "amigos usam de verdade + aprendiz dominou stack", removendo pressão de growth e preservando foco em qualidade.

### Change Log

| Data       | Versão | Descrição                                                                                                                                                                                                                                                                        | Autor        |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-05-06 | 0.1    | Draft inicial do PRD a partir de `brief.md` (modo YOLO)                                                                                                                                                                                                                          | @pm (Morgan) |
| 2026-05-07 | 0.2    | Ajustes: adoção de Next.js 15; remoção de testes E2E (Playwright); remoção de stack Supabase local (testes via Supabase Branching); padronização total das stories em PT-BR                                                                                                      | @pm (Morgan) |
| 2026-05-07 | 0.3    | Correção da versão do Next.js para a última estável (16.x) — substitui menções a Next.js 15 introduzidas em 0.2                                                                                                                                                                  | @pm (Morgan) |
| 2026-05-28 | 0.4    | Formalização do **Epic 5 — Polish & Gaps Pós-MVP** com Story 5.1 (UI de edição de `display_name` + `bio` em `/dashboard/profile`) materializando `[STORY-3.5-F2]` do `docs/STORY-BACKLOG.md` (gap UX detectado em prod durante Story 3.5 Task 5). AC1 ancorado em FR13 (Art. IV) | @pm (Morgan) |

---

## Requisitos

### Funcionais

- **FR1:** O sistema deve permitir cadastro de usuário via **email + senha** usando Supabase Auth, com fluxo de verificação de email. (Brief §MVP/Auth, Appendix B)
- **FR2:** O sistema deve permitir login, logout e **reset de senha** via Supabase Auth. (Brief §MVP/Auth)
- **FR3:** Um **middleware Next.js** deve validar sessão Supabase em rotas privadas (`/dashboard`, `/settings`, `/links`) e redirecionar guests para `/login`; usuários autenticados visitando `/login` ou `/signup` devem ser redirecionados para `/dashboard`. (Brief §MVP/Middleware)
- **FR4:** Cada usuário deve possuir um **slug único** (`username`) com regras: 3–30 caracteres, lowercase, alfanumérico + hífen, não-reservado. O slug é editável pelo dono e validação de unicidade ocorre server-side. (Brief §Solução)
- **FR5:** Cada usuário deve possuir uma **página pública** acessível em `/@<username>`, renderizada via **SSR** (Next.js App Router + Server Components). (Brief §MVP)
- **FR6:** O usuário deve poder fazer **CRUD de links** com os campos: `title` (obrigatório, ≤ 100 chars), `url` (obrigatório, válida HTTP/HTTPS), `icon` (opcional, lista pré-definida ou upload simples), `is_visible` (boolean), `position` (inteiro). (Brief §MVP)
- **FR7:** O usuário deve poder **reordenar links via drag-and-drop** no dashboard, com persistência otimista da nova ordem. (Brief §MVP)
- **FR8:** O usuário deve poder ocultar/exibir links individualmente sem deletá-los (`is_visible`). Links ocultos não aparecem na página pública. (Brief §MVP)
- **FR9:** A página pública deve registrar **events de clique** (1 row por clique) em uma tabela `click_events` com: `link_id`, `clicked_at`, `user_agent_hash`, `ip_hash` (hashed para LGPD-mindfulness). (Brief §MVP/Analytics)
- **FR10:** A página pública deve registrar **page views** (1 row por visualização) em `page_views` com: `page_id`, `viewed_at`, `user_agent_hash`, `ip_hash`. (Brief §MVP/Analytics)
- **FR11:** O dashboard privado deve exibir **analytics agregado** por link e página: total de cliques, total de page views, séries temporais de **7 e 30 dias**. (Brief §MVP/Analytics)
- **FR12:** O sistema deve oferecer **3 temas presets fechados**: `light`, `dark`, `brand`. O usuário escolhe um tema por página; o tema é aplicado via tokens CSS na renderização SSR. (Brief §MVP/Themes, Appendix B)
- **FR13:** O usuário deve poder editar **profile metadata** na sua página: `display_name` (≤ 50 chars), `bio` (≤ 280 chars), `avatar_url` (upload Supabase Storage, ≤ 1 MB). (Brief §Solução)
- **FR14:** O sistema deve disponibilizar um **design system reutilizável** com no mínimo: `Button`, `Input`, `Card`, `Form`, `Avatar`, `Modal`, `Toast`. (Brief §MVP)
- **FR15:** O usuário deve poder **excluir sua própria conta** via dashboard, com confirmação dupla. A exclusão deve apagar (cascade) páginas, links e eventos vinculados. (Brief §LGPD-mindful)
- **FR16:** O usuário deve poder **exportar seus dados** (perfil + páginas + links + eventos) em formato JSON via botão no dashboard. (Brief §LGPD-mindful)

### Não-Funcionais

- **NFR1:** **RLS habilitado em todas as tabelas user-data** (`profiles`, `pages`, `links`, `click_events`, `page_views`). Cada usuário só pode ler/escrever seus próprios dados; leitura pública das páginas e links visíveis ocorre via política específica. (Brief §MVP, §Risks)
- **NFR2:** Lighthouse **≥ 90** em Performance, Accessibility, Best Practices, SEO — medido na página pública e no dashboard. (Brief §KPIs)
- **NFR3:** **LCP < 2.5s** e **INP < 200ms** na página pública sob conexão 4G simulada. (Brief §Technical Considerations)
- **NFR4:** Bundle JS inicial da página pública **< 200 KB gzipped**. (Brief §Technical Considerations)
- **NFR5:** O sistema deve operar dentro do **Supabase Free Tier** (500 MB DB, 1 GB storage, 50K MAU) e **Vercel Hobby** durante todo o MVP; alertas configurados em 70% de qualquer limite. (Brief §Constraints, §Risks)
- **NFR6:** Cobertura de testes: **backend (Server Actions + RLS policies) ≥ 70%**, frontend (componentes críticos: form validation, drag-drop, theme switching) **≥ 50%**. (Brief §KPIs)
- **NFR7:** Testes de RLS automatizados (cada policy testada com cenários de owner / non-owner / anonymous) executados em CI contra **Supabase Branching** (preview branches por PR), nunca contra produção. (Brief §Risks)
- **NFR8:** **Deploy frequency ≥ 1 deploy/semana** mantida durante o MVP via GitHub Actions + Vercel auto-deploy em `main`; previews automáticos em PRs. (Brief §KPIs)
- **NFR9:** **MTTR < 1h** para restaurar serviço após falha em produção; rollback via revert de commit + redeploy. (Brief §KPIs)
- **NFR10:** **0 secrets versionados** no repositório. Validação via pre-commit hook + scan no CI (gitleaks ou similar). (Brief §Constraints, Appendix B — open-source desde dia 1)
- **NFR11:** **UI 100% PT-BR** no MVP; sem stack de i18n. Strings em literais ou constants centralizadas. Internacionalização → Phase 2. (Appendix B)
- **NFR12:** Eventos brutos (`click_events`, `page_views`) retidos por **90 dias**; após esse prazo, agregações mensais são preservadas (a implementar via job Phase 2 ou cleanup manual no MVP). (Open question resolvida)
- **NFR13:** Browser support: últimas 2 versões de Chrome, Safari, Firefox, Edge; iOS 14+; Android 10+. (Brief §Technical Considerations)
- **NFR14:** Stories conformes ao SDC: **100%** das stories passam por `@po` (validate, ≥ 7/10) e `@qa` (gate PASS/CONCERNS) antes de produção. (Brief §KPIs, Constitution Article III)
- **NFR15:** Toda feature/decisão neste PRD deve traçar a `docs/brief.md` ou requirements explícitos do stakeholder (Constitution Article IV — No Invention).
- **NFR16:** Acessibilidade alvo **WCAG 2.1 nível AA** na página pública e dashboard. (Lighthouse Accessibility ≥ 90 é o gate prático.)
- **NFR17:** **Email transacional limitado** ao built-in do Supabase Auth (verificação + reset). Sem provider externo no MVP. (Open question resolvida)
- **NFR18:** **Sem custom domain** no MVP — produção usa subpath/subdomínio Vercel (`new-biolink.vercel.app/@username`). Custom domain → Phase 2. (Open question resolvida)
- **NFR19:** Repositório público no GitHub desde o dia 1, com `LICENSE` (MIT, sujeito a confirmação @architect) e `README` em qualidade pública. (Appendix B)
- **NFR20:** **Sem Supabase local** (Docker stack). Desenvolvimento e CI usam projeto Supabase remoto + Supabase Branching para isolamento de dados em PRs/testes. (Decisão 2026-05-07)

---

## Objetivos de Design da Interface

### Visão Geral de UX

Mobile-first, minimalista, **2-clique de distância** entre signup e primeira página publicada (target: < 2 min mediana de time-to-first-published-page). A página pública prioriza **claridade visual e velocidade** — visitor abre, vê avatar + nome + lista de links com ícones, clica. O dashboard prioriza **edição direta sem fricção** — alterações refletem instantaneamente (otimismo + revalidação).

A linguagem visual segue tradição "linktree-like" mas com refinamento: tipografia clara, espaçamento generoso, sem ads/branding forçado da plataforma. Tom: **profissional-acessível**, nunca corporativo nem infantil.

### Paradigmas-Chave de Interação

- **Edição inline no dashboard:** clicar no título de um link abre input edit-in-place; salva on blur + Cmd+Enter.
- **Drag-and-drop persistente:** reorder de links com feedback visual imediato (otimista) + rollback se falhar a persistência.
- **Toggle de visibilidade por switch:** cada link tem switch on/off ao lado, mudança imediata.
- **Theme preview live:** seletor de tema no dashboard mostra preview da página pública sem abrir nova aba.
- **Copy-to-clipboard do link público** com toast de confirmação.
- **Confirmações destrutivas em duplo:** delete link / delete account / reset analytics exigem confirmação modal.

### Telas Core e Views

1. **Landing / Home Pública** (`/`) — explica o produto + CTA para signup; também serve como canary de saúde do sistema.
2. **Cadastro** (`/signup`) — email + senha + slug + verificação de email.
3. **Login** (`/login`) — email + senha + link "Esqueci a senha".
4. **Reset de Senha** (`/reset-password`) — fluxo Supabase Auth.
5. **Dashboard / Links** (`/dashboard`) — lista de links editáveis com drag-drop + botão "Adicionar link".
6. **Profile Settings** (`/dashboard/profile`) — display_name, bio, avatar, slug.
7. **Theme Settings** (`/dashboard/theme`) — escolha entre `light` / `dark` / `brand` com preview.
8. **Analytics** (`/dashboard/analytics`) — cards com totais + gráfico de série temporal (7/30 dias) + tabela de cliques por link.
9. **Account Settings** (`/dashboard/account`) — exportar dados, deletar conta.
10. **Página Pública** (`/@<username>`) — avatar + nome + bio + lista vertical de links visíveis.

### Acessibilidade: WCAG AA

- Contraste mínimo 4.5:1 (texto) / 3:1 (UI components grandes).
- Navegação por teclado completa (todos as interações alcançáveis via Tab).
- ARIA labels em ícones-only buttons.
- Focus indicators visíveis em todos os elementos interativos.
- Smoke test manual com leitor de tela antes de marcar uma story Done.

### Branding

**Status:** placeholder no MVP — refino delegado a `@ux-design-expert` durante criação do `docs/frontend-spec.md`.

**Seed para MVP:**

- **Mood:** moderno-minimalista, mobile-first, "indie tech".
- **Paleta tentativa:** brand color seed `#7C3AED` (violeta), neutros `slate` Tailwind, branco/preto puros para light/dark.
- **Tipografia:** sans-serif sistema (Inter ou system stack) — sem custom fonts no MVP para preservar bundle.
- **Componentes presets:** **shadcn/ui** como referência (Tailwind-first, owned por nós, sem lock-in).

> **Decisão final de identidade visual** (logo, paleta definitiva, tom voice) é responsabilidade do `@ux-design-expert` após este PRD.

### Dispositivos e Plataformas Alvo: Web Responsive

- **Primary:** mobile (iOS 14+ / Android 10+, Chrome/Safari nativos).
- **Secondary:** desktop responsivo (Chrome / Safari / Firefox / Edge — últimas 2 versões).
- **Não suportado no MVP:** PWA install promo, app nativo, modo offline.

---

## Premissas Técnicas

### Estrutura do Repositório: Monorepo

Projeto único Next.js (App Router) em um repositório GitHub público. Não há justificativa para multi-package no escopo MVP.

```
biolink/
├── app/                  # Next.js App Router (rotas)
├── components/           # Design system + features
├── lib/                  # Helpers (supabase client, validators, utils)
├── server/               # Server Actions + DB queries
├── supabase/             # migrations + seed + RLS policies (sem stack local)
├── tests/                # unit + integration
├── public/               # static assets
└── docs/                 # PRD, architecture, stories
```

### Arquitetura de Serviço

**DECISÃO CRÍTICA:** Next.js full-stack monolítico + Supabase BaaS único, deployed em Vercel. **Serverless** (Vercel Functions / Edge para SSR e Server Actions; Supabase Postgres + Auth + Storage como backend gerenciado).

- **Frontend + SSR:** **Next.js 16** (App Router) + React Server Components (última versão estável da linha 16.x).
- **Persistência:** Postgres via Supabase, com RLS rigoroso.
- **Auth:** Supabase Auth (email + senha; sem OAuth providers no MVP).
- **Storage:** Supabase Storage para avatars (bucket `avatars` com RLS).
- **Server logic:** Server Actions (Next.js 16) e Route Handlers quando necessário.
- **Edge functions:** evitadas no MVP; Supabase Edge Functions só se rate limiting / hooks específicos forem necessários.
- **Sem stack Supabase local:** desenvolvimento usa o projeto Supabase remoto (uma instância de dev). CI usa **Supabase Branching** (cria branch efêmero por PR) para isolar dados.

### Requisitos de Testes

**DECISÃO CRÍTICA:** Pirâmide leve **Unit + Integration**, **sem E2E** no MVP.

- **Unit (Vitest):** funções puras (validators, formatters, helpers) e Server Actions com mocks mínimos. Cobertura backend ≥ 70%.
- **Integration (Vitest + Supabase Branching):** Server Actions testados contra um **branch Supabase remoto** (provisionado por PR via Supabase CLI no CI); **RLS policies testadas com cenários owner / non-owner / anonymous** (NFR7). Em desenvolvimento local, integration tests apontam para um projeto Supabase de dev dedicado (configurável via `.env.test`).
- **Component tests (Testing Library):** componentes críticos do design system + features de alto risco (drag-drop, form validation, theme switching). Cobertura frontend ≥ 50%.
- **Sem testes E2E (Playwright/Cypress) no MVP.** Validação de fluxos completos é feita via:
  - **Integration tests** cobrindo Server Actions ponta-a-ponta (signup → publish, link CRUD, click tracking);
  - **Component tests** cobrindo interações críticas de UI;
  - **Validação manual** dos fluxos golden path antes de cada release de epic.
- **Test convenience manual:** seed script para popular usuários demo (`npm run seed:demo`) executado contra o projeto Supabase de dev, criando 3 perfis públicos navegáveis para QA manual.
- **CodeRabbit self-healing:** ativo na fase Dev (max 2 iterações, severity CRITICAL/HIGH).

### Premissas e Pedidos Técnicos Adicionais

- **Linguagem:** TypeScript strict mode (`"strict": true` + `"noUncheckedIndexedAccess": true`).
- **Estilização:** Tailwind CSS + design tokens via CSS variables para suportar 3 temas com troca em runtime.
- **Componentes:** **shadcn/ui** como base (componentes copiados, customizáveis, sem dependência runtime).
- **Validação:** **Zod** para schemas de input (Server Actions) e env vars.
- **Forms:** **react-hook-form** + Zod resolver.
- **Database client:** Supabase JS SDK; queries server-side via cliente service-role apenas em Server Actions, cliente anônimo em Server Components com RLS.
- **Migrations:** versionadas em `supabase/migrations/`, aplicadas via Supabase CLI no CI **diretamente contra o projeto remoto ou branch de PR** (sem `supabase start` local).
- **Env vars:** `.env.local` (gitignored, aponta para projeto Supabase de dev) + `.env.example` (commitado, sem valores) + `.env.test` (gitignored, aponta para branch/projeto de teste). Validação via Zod em `lib/env.ts`.
- **Linting:** ESLint (Next.js config) + Prettier + import-sorter.
- **Pre-commit:** Husky + lint-staged executando typecheck, lint, format e gitleaks.
- **CI/CD:** GitHub Actions com jobs paralelos: `lint`, `typecheck`, `test:unit`, `test:integration` (contra Supabase Branching), `test:components`, `build`, `gitleaks`. Deploy via Vercel auto-deploy em `main`; previews automáticos em PRs.
- **Code intelligence (opcional):** `aiox graph --deps` para dependency dashboard durante desenvolvimento; degrada graceful se indisponível.
- **Constitutional Gates (AIOX):** todas as 6 gates G1-G6 ativas; Article IV (No Invention) + Article V (Quality First) explicitamente vinculados ao gate `@po` e `@qa`.
- **LGPD-minded sem ser certificação:** consent simples no signup ("aceito termos + política de privacidade"), botão de export de dados, botão de delete account. Sem consent banner de cookies (não há cookies de terceiros no MVP).

---

## Lista de Epics

> **Sequenciamento:** fundação técnica + identity primeiro, então features visíveis crescentes. Cada epic entrega valor end-to-end deployable.

1. **Epic 1 — Fundação, Identidade e Página Canary:** Estabelecer projeto Next.js 16 + Supabase + CI/CD pipeline operacional, autenticação completa (signup/login/reset/middleware), RLS-base, design system seed e uma página `/` pública servindo como canary visível em produção.
2. **Epic 2 — Perfil Público e Core de Links:** Entregar a feature core do produto — slug único por usuário, CRUD de links com drag-drop, e página pública `/@<username>` renderizada via SSR funcionando em produção.
3. **Epic 3 — Temas e Refino de UX:** Disponibilizar 3 temas presets (light/dark/brand), completar design system (Card, Avatar, Modal), refinar responsividade e performance (Lighthouse ≥ 90).
4. **Epic 4 — Analytics e Insights:** Tracking de cliques e page views, agregações 7/30 dias e dashboard de métricas para o dono da página.
5. **Epic 5 — Polish & Gaps Pós-MVP:** Materializar gaps funcionais e refinos detectados durante operação pós-v1.0.0 e demos em produção. **Epic aberto** (incremental, não-bloqueador do release v1.0.0); stories vão sendo agendadas conforme `docs/STORY-BACKLOG.md` é priorizado via `@po *backlog-schedule`. Primeiro item: UI de edição de `display_name`/`bio` no `/dashboard/profile` (FR13 — gap detectado em Story 3.5 Task 5).

---

## Epic 1 — Fundação, Identidade e Página Canary

**Objetivo Expandido:** Levantar a infraestrutura completa que tudo depois habita — projeto Next.js 16 operacional com TypeScript strict, Supabase configurado com primeiro schema (sem stack local), CI/CD verde em produção, autenticação Supabase end-to-end (signup, login, logout, verificação, reset), middleware de proteção de rotas, RLS em `profiles`, design system seed (Button/Input/Form/Toast) e uma landing pública em `/` que serve como canary visível ("BioLink ✓ live") confirmando que o sistema está respirando. Ao fim deste epic, qualquer commit em `main` vai a produção em < 5 min e usuários reais conseguem criar conta.

### Story 1.1 — Bootstrap do Projeto

Como desenvolvedor,
Quero scaffoldar um projeto Next.js 16 + TypeScript + Tailwind com a estrutura acordada,
Para que as stories subsequentes tenham uma fundação consistente.

#### Critérios de Aceitação

1. Repositório GitHub público criado com `LICENSE` (MIT) e `README.md` (descrição + getting started).
2. **Next.js 16** (última versão estável) instalado com App Router e TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`).
3. Tailwind CSS configurado com design tokens via CSS variables placeholder.
4. ESLint + Prettier + import-sorter configurados; `npm run lint` e `npm run typecheck` passam em projeto vazio.
5. Estrutura de diretórios criada conforme PRD (`app/`, `components/`, `lib/`, `server/`, `supabase/`, `tests/`).
6. `.env.example` commitado; `.env.local` e `.env.test` no `.gitignore`.
7. `npm run dev` sobe localhost:3000 com página default Next.js.

### Story 1.2 — Setup do Projeto e Clientes Supabase

Como desenvolvedor,
Quero um projeto Supabase remoto provisionado com clientes type-safe disponíveis para server e browser (sem stack Supabase local),
Para que as stories subsequentes possam persistir dados de usuário com confiança.

#### Critérios de Aceitação

1. Projeto Supabase de **dev** criado (free tier); URL e anon key adicionados ao `.env.local`.
2. Service-role key armazenado apenas em Vercel env vars e GitHub Actions secrets (nunca no repo).
3. Cliente Supabase server-side (`lib/supabase/server.ts`) e browser (`lib/supabase/client.ts`) implementados.
4. Validação de env vars via Zod em `lib/env.ts`; build falha se variáveis ausentes.
5. Tipos TypeScript gerados via `supabase gen types typescript` checados em CI (script `npm run db:types`); script aponta para o projeto remoto, não para stack local.
6. Migration inicial `0001_init.sql` vazia (apenas placeholder de estrutura) commitada.
7. Documentação em `docs/dev-setup.md` explica como conectar ao Supabase de dev sem rodar `supabase start`.

### Story 1.3 — Pipeline CI/CD

Como desenvolvedor,
Quero GitHub Actions executando lint/typecheck/test/build em todo PR e Vercel fazendo auto-deploy de main,
Para que quality gates sejam impostos antes do merge e a produção reflita main em até 5 minutos.

#### Critérios de Aceitação

1. Workflow `.github/workflows/ci.yml` com jobs paralelos: `lint`, `typecheck`, `test:unit`, `test:integration`, `test:components`, `build`, `gitleaks`.
2. Job `test:integration` provisiona um **Supabase Branch** dedicado por PR via Supabase CLI, aplica migrations e roda testes contra ele.
3. Status checks bloqueiam merge em PRs que falham qualquer job.
4. Vercel project conectado ao repo; auto-deploy em `main` confirmado via deploy de teste.
5. Previews automáticos em PRs com URL única acessível.
6. Husky + lint-staged configurados rodando typecheck + lint + gitleaks em pre-commit.
7. README documenta `npm run dev`, `npm run test`, `npm run build`, e como obter env vars.

### Story 1.4 — Schema de Profiles e Fundação RLS

Como desenvolvedor,
Quero uma tabela `profiles` com RLS policies estritas e cenários de seed testados,
Para que as futuras tabelas user-data sigam um padrão de segurança validado.

#### Critérios de Aceitação

1. Migration cria tabela `profiles` (id uuid PK ref auth.users, username citext unique, display_name, bio, avatar_url, theme enum, created_at, updated_at).
2. Constraint de username: 3–30 chars, regex `^[a-z0-9-]+$`, lowercase.
3. RLS policies: `select_own`, `update_own`, `insert_own` (via trigger on auth.users insert), `select_public` (linha visível somente se referenciada por uma página publicada — refinado em Epic 2).
4. Trigger `on_auth_user_created` cria `profiles` row automaticamente após signup.
5. Testes integration de RLS rodando contra Supabase Branch: owner vê/edita; non-owner não vê/edita; anonymous bloqueado.
6. Seed script `supabase/seed.sql` cria 3 profiles demo.

### Story 1.5 — UI de Auth (Cadastro, Login, Logout)

Como visitante,
Quero me cadastrar com email e senha, fazer login e logout,
Para que eu tenha uma conta pessoal para gerenciar links.

#### Critérios de Aceitação

1. Página `/signup` com formulário (email, senha ≥ 8 chars, confirmar senha, slug, accept-terms checkbox); validação client-side via Zod + react-hook-form.
2. Página `/login` com formulário (email, senha) + link "Esqueci a senha".
3. Logout disponível via menu do dashboard; clear de sessão e redirect para `/`.
4. Erros de auth (credenciais inválidas, email já em uso, slug em uso) renderizados como Toast.
5. Após signup, usuário é redirecionado para `/dashboard` (com banner pedindo confirmação de email).
6. Tradução PT-BR em todas as strings.

### Story 1.6 — Verificação de Email e Reset de Senha

Como usuário,
Quero verificar meu email após cadastro e resetar minha senha caso esqueça,
Para que minha conta esteja protegida contra acesso não autorizado.

#### Critérios de Aceitação

1. Email de verificação enviado pelo Supabase Auth após signup; link redireciona para `/auth/callback` que confirma e redireciona para `/dashboard`.
2. Página `/reset-password` com fluxo: input email → envia email → link para `/reset-password/confirm` (input nova senha + confirmação).
3. Strings dos emails customizadas em PT-BR via Supabase email templates (até onde o Supabase free permite).
4. Banner "Confirme seu email" persiste no dashboard até verificação concluída.
5. Testes integration cobrem o fluxo de Server Actions de verificação e reset (callback handler + reset request + reset confirm).

### Story 1.7 — Middleware de Proteção de Rotas

Como desenvolvedor,
Quero middleware redirecionando guests de rotas privadas e usuários autenticados de rotas de auth,
Para que a proteção de rotas seja consistente e centralizada.

#### Critérios de Aceitação

1. `middleware.ts` na raiz interceptando todas as rotas exceto assets estáticos e `/@<username>` (públicas).
2. Rotas `/dashboard/*` exigem sessão Supabase válida; sem sessão → redirect `/login?next=<path>`.
3. Rotas `/login`, `/signup`, `/reset-password` redirecionam para `/dashboard` se sessão existe.
4. Rotas `/@<username>` ignoram middleware de auth (sempre públicas).
5. Sessão renovada (refresh token) automaticamente quando próxima de expirar.
6. Testes integration cobrem cada cenário (auth/guest × pública/privada).

### Story 1.8 — Seed do Design System (Button, Input, Form, Toast)

Como desenvolvedor,
Quero os componentes core Button, Input, Form e Toast disponíveis com shadcn/ui como base,
Para que as stories subsequentes de UI usem primitivas consistentes.

#### Critérios de Aceitação

1. shadcn/ui inicializado; Button, Input, Form, Toast copiados para `components/ui/`.
2. Tokens CSS variables base definidos em `app/globals.css` (cores, spacing, radius, font-stack).
3. Cada componente tem teste de componente em `tests/components/` com snapshot e variantes principais.
4. Form integrado com react-hook-form + Zod resolver; exemplo funcional em `/signup` consumindo o pattern.
5. Toast configurado globalmente; trigger via helper `lib/toast.ts`.
6. Cobertura ≥ 50% nos componentes seed.

### Story 1.9 — Landing Pública e Página Canary

Como visitante,
Quero uma landing page pública em `/` que explique o BioLink com um CTA para cadastro,
Para que o sistema tenha um canary visível confirmando saúde de produção.

#### Critérios de Aceitação

1. `/` renderizada via SSR com hero (título, tagline, CTA "Criar minha página"), seção de benefícios (3 bullets) e footer com link GitHub.
2. CTA leva a `/signup`; usuário autenticado vê CTA "Ir para meu dashboard" levando a `/dashboard`.
3. Página inclui meta-tags SEO (title, description, OG image placeholder).
4. Lighthouse ≥ 90 em todas as 4 categorias na URL de produção.
5. Página exibe pequeno indicador de health (ex: timestamp de build) somente em footer.
6. Health check no CI confirma que a URL de produção retorna 200 e contém o CTA esperado (verificação via `curl` + grep, sem framework E2E).

---

## Epic 2 — Perfil Público e Core de Links

**Objetivo Expandido:** Entregar a feature central do produto — usuário escolhe slug único, gerencia links via dashboard com drag-and-drop, e qualquer pessoa acessa `/@<username>` para ver a página pública renderizada via SSR. Ao fim deste epic, o produto **funciona** no sentido essencial: amigos podem se cadastrar e compartilhar suas páginas. Tudo posterior é refinamento.

### Story 2.1 — Seleção e Validação de Slug

Como usuário,
Quero escolher e editar um username único e URL-safe,
Para que minha página pública tenha um endereço personalizado.

#### Critérios de Aceitação

1. Campo `username` no signup com validação live (debounce 300ms): formato (regex), tamanho (3–30), unicidade.
2. Setting `/dashboard/profile` permite alterar username com aviso "URL pública mudará".
3. Usernames reservados (admin, api, login, signup, dashboard, etc.) bloqueados via lista em `lib/reserved-usernames.ts`.
4. Server Action de update valida unicidade transacionalmente; conflito retorna erro tratado.
5. Testes unit do validator + integration da Server Action (incluindo race condition simulada).

### Story 2.2 — Schema de Pages e RLS

Como desenvolvedor,
Quero uma tabela `pages` ligada a `profiles` com RLS,
Para que os links possam ser agrupados por página (1:1 no MVP, preparado para 1:N futuro).

#### Critérios de Aceitação

1. Migration cria `pages` (id, profile_id FK, theme enum default 'light', is_published boolean default true, created_at, updated_at).
2. Trigger cria `pages` row automaticamente quando `profiles` row é criada (1 página por usuário no MVP).
3. RLS: select_own + update_own + select_public (where is_published=true).
4. Constraint: 1 página por profile no MVP (UNIQUE em profile_id).
5. Testes RLS owner / non-owner / anonymous para todas as operações, rodando em Supabase Branch via CI.

### Story 2.3 — Schema de Links e RLS

Como desenvolvedor,
Quero uma tabela `links` pertencente a pages com RLS e suporte a ordenação,
Para que operações de CRUD e reorder sejam seguras e consistentes.

#### Critérios de Aceitação

1. Migration cria `links` (id, page_id FK, title, url, icon, is_visible, position, created_at, updated_at).
2. Constraint: position UNIQUE per page_id.
3. RLS: select_own + insert_own + update_own + delete_own + select_public (joined com pages.is_published=true e links.is_visible=true).
4. Trigger ou Server Action garante position contígua (sem buracos) após delete.
5. Testes RLS cobrem todas as combinações + caso de tentar inserir link em página de outro usuário (deve falhar).

### Story 2.4 — Layout e Navegação do Dashboard

Como usuário,
Quero um layout de dashboard com navegação por sidebar,
Para que eu possa transitar entre Links / Profile / Theme / Analytics / Account.

#### Critérios de Aceitação

1. Layout `app/dashboard/layout.tsx` com sidebar fixa (desktop) ou drawer (mobile).
2. Itens de navegação: Links, Profile, Theme, Analytics, Account.
3. Rota ativa destacada visualmente.
4. Header com avatar + dropdown (logout, copy public URL).
5. Acessibilidade: navegação por teclado completa, ARIA roles, focus trap no drawer mobile.

### Story 2.5 — CRUD de Links (UI + Server Actions)

Como usuário,
Quero criar, editar, ocultar e excluir links a partir do meu dashboard,
Para que eu controle o que aparece na minha página pública.

#### Critérios de Aceitação

1. Lista de links em `/dashboard` (Links tab) ordenada por position.
2. Botão "Adicionar link" abre modal com campos title + url + icon (select).
3. Edição inline de title (clique abre input) e url (botão de edit ao lado).
4. Switch on/off para is_visible com persistência otimista.
5. Botão delete com modal de confirmação dupla.
6. Toast de sucesso/erro em todas as operações.
7. Server Actions com validação Zod e tratamento de RLS errors.
8. Empty state quando 0 links: ilustração + CTA "Adicione seu primeiro link".

### Story 2.6 — Reordenação por Drag-and-Drop

Como usuário,
Quero reordenar meus links arrastando,
Para que a ordem visual da minha página pública reflita minhas prioridades.

#### Critérios de Aceitação

1. Cada link tem handle de drag (icon ⋮⋮ à esquerda) ativo em mouse + touch.
2. Drop persiste nova ordem otimisticamente (UI atualiza imediato); rollback com toast se Server Action falhar.
3. Reorder dispara batch update transacional de positions afetadas.
4. Acessibilidade: alternativa via teclado (botões ↑/↓ no menu de cada link).
5. Testes de integração cobrem reorder de 5 links.

### Story 2.7 — Página Pública SSR (`/@username`)

Como visitante,
Quero acessar `/@username` e ver o avatar, nome, bio e links visíveis do usuário,
Para que eu encontre rapidamente o que estou procurando.

#### Critérios de Aceitação

1. Rota `app/@[username]/page.tsx` resolve username server-side; 404 se inexistente ou page.is_published=false.
2. Renderização SSR (Server Component) com fetch único: profile + page + links visíveis.
3. Layout vertical mobile-first: avatar + display_name + bio + lista de links com ícones.
4. Cada link é `<a>` com `target="_blank" rel="noopener noreferrer"`.
5. Meta tags dinâmicas: title = `${display_name} (@${username}) — BioLink`; OG image placeholder.
6. Lighthouse ≥ 90 (todas as 4 categorias) na página de um perfil seed.
7. Testes de integração validam o data fetch da rota: profile encontrado → renderiza N links visíveis; profile inexistente → 404; page.is_published=false → 404; link com is_visible=false → omitido do render.

---

## Epic 3 — Temas e Refino de UX

**Objetivo Expandido:** Disponibilizar os 3 temas presets, completar o design system com os componentes que faltam (Card, Avatar, Modal), e elevar a barra de UX em performance e acessibilidade até bater os gates de NFR2 (Lighthouse ≥ 90 em produção).

### Story 3.1 — Arquitetura de Tokens de Tema

Como desenvolvedor,
Quero um sistema de tokens baseado em CSS variables que suporte troca de tema em runtime,
Para que os 3 presets (e temas futuros) reusem o mesmo código de componentes.

#### Critérios de Aceitação

1. `app/globals.css` define tokens (cor, spacing, radius, font) via CSS variables sob seletores `[data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="brand"]`.
2. Tema aplicado em `<html data-theme="...">` via Server Component (sem flash de tema).
3. Helper `lib/theme.ts` com tipo `Theme = 'light' | 'dark' | 'brand'`.
4. Storybook-like page em `/dev/themes` (apenas em dev) demonstra todos os tokens.

### Story 3.2 — 3 Presets de Tema

Como usuário,
Quero escolher entre os presets Light, Dark e Brand,
Para que minha página reflita meu estilo.

#### Critérios de Aceitação

1. Paletas definidas para os 3 temas (cores primária, secundária, fundo, texto, accent).
2. Tema selecionado aplicado consistentemente: dashboard + página pública + componentes interativos.
3. Tema "brand" usa a brand color seed (`#7C3AED` ou definido por `@ux-design-expert`).
4. Verificação WCAG AA de contraste em cada tema (script de check em CI ou manual).
5. Page snapshot tests cobrem renderização em cada tema.

### Story 3.3 — UI de Seleção de Tema

Como usuário,
Quero um seletor de tema com preview em tempo real,
Para que eu veja como minha página fica antes de salvar.

#### Critérios de Aceitação

1. Página `/dashboard/theme` com 3 cards (preview thumbnail + nome do tema).
2. Card selecionado destacado; clique salva via Server Action.
3. Preview mini da página pública renderizada inline com o tema escolhido (iframe ou Server Component isolado).
4. Toast de confirmação após save; revalidate `/@<username>` cache.

### Story 3.4 — Conclusão do Design System (Card, Avatar, Modal)

Como desenvolvedor,
Quero os componentes de design system restantes prontos,
Para que todas as features de UI tenham primitivas first-class.

#### Critérios de Aceitação

1. Card, Avatar e Modal copiados de shadcn/ui e customizados aos tokens BioLink.
2. Avatar suporta upload (Supabase Storage bucket `avatars`, RLS, max 1 MB, jpg/png/webp).
3. Modal acessível: focus trap, ESC fecha, click outside fecha (configurável), ARIA dialog.
4. Cobertura de testes ≥ 50% nos novos componentes.
5. Inventário do design system documentado em `docs/design-system.md`.

### Story 3.5 — Passada de Performance e Acessibilidade

Como usuário,
Quero que as páginas carreguem rápido e sejam acessíveis,
Para que a experiência esteja à altura da barra de qualidade.

#### Critérios de Aceitação

1. Lighthouse ≥ 90 em Performance, Accessibility, Best Practices, SEO em `/`, `/@demo`, `/dashboard` (medido em produção).
2. LCP < 2.5s e INP < 200ms na página pública sob throttle 4G.
3. Bundle JS inicial da página pública < 200 KB gzipped.
4. Imagens otimizadas via `next/image`; avatar com `priority` na página pública.
5. Auditoria a11y manual (teclado, leitor de tela smoke, contraste) documentada em `docs/a11y-audit.md`.
6. Workflow CI roda Lighthouse CI em PRs que tocam rotas-chave; falha se score regredir abaixo de 85.

---

## Epic 4 — Analytics e Insights

**Objetivo Expandido:** Tornar o produto **mensurável** para o dono da página — registrar cliques e visualizações de forma LGPD-mindful (ip/user-agent hashed), agregar via SQL views por janelas 7d/30d, e renderizar um dashboard simples com cards de totais + série temporal por link. Ao fim deste epic, o usuário entende o que funciona na sua bio, fechando o ciclo de valor do MVP.

### Story 4.1 — Schema de Click Events e Endpoint de Tracking

Como desenvolvedor,
Quero uma tabela `click_events` e um endpoint de tracking que registre cada clique em link,
Para que as agregações tenham dados brutos para consumir.

#### Critérios de Aceitação

1. Migration cria `click_events` (id, link_id FK, clicked_at default now(), user_agent_hash, ip_hash).
2. Endpoint `POST /api/track/click` aceita `{ link_id }`; resolve link via service-role; rejeita se link inexistente ou page não publicada.
3. user_agent e ip são hashados (sha-256 + salt em env var) antes do insert.
4. RLS: insert allowed via service role only; select_own permite ao dono ler seus events.
5. Rate limiting básico: máx 60 events/min por ip_hash via lógica simples em-memory ou Redis-free fallback.
6. Página pública chama o endpoint via fetch beforeunload em cada link clicado (não bloqueia navegação).

### Story 4.2 — Schema e Tracking de Page Views

Como desenvolvedor,
Quero page views rastreadas de forma similar a click events,
Para que eu possa computar conversão view-to-click depois.

#### Critérios de Aceitação

1. Migration cria `page_views` (id, page_id FK, viewed_at, user_agent_hash, ip_hash).
2. Endpoint `POST /api/track/view` aceita `{ page_id }`; ou tracking server-side direto no Server Component (preferível, evita JS extra na página pública).
3. Deduplicação de view: 1 view por ip_hash + page_id por janela de 30 min.
4. RLS análogo a click_events.
5. Page-level view counter exposto no dashboard via aggregação.

### Story 4.3 — Agregações SQL (Views 7d / 30d)

Como desenvolvedor,
Quero views SQL agregando cliques e visualizações por janelas de 7 e 30 dias,
Para que as queries do dashboard sejam simples e rápidas.

#### Critérios de Aceitação

1. Migration cria materialized views ou regular views: `link_clicks_7d`, `link_clicks_30d`, `page_views_7d`, `page_views_30d` agregando por link_id ou page_id e por dia.
2. Estratégia documentada (views regulares para MVP — refresh sob demanda; materialized views deferidas).
3. Função SQL helper para retornar séries temporais (array de `{date, count}`) por link/page.
4. Testes integration validam agregação correta com seed de eventos.

### Story 4.4 — UI do Dashboard de Analytics

Como usuário,
Quero ver meu analytics em `/dashboard/analytics`,
Para que eu entenda quais links geram engajamento.

#### Critérios de Aceitação

1. Página exibe 4 cards no topo: Total Page Views (lifetime), Total Clicks (lifetime), Page Views (últimos 30d), Clicks (últimos 30d).
2. Gráfico de linha simples (recharts ou similar lightweight) mostrando série diária 7d e 30d (toggle).
3. Tabela de cliques por link ordenada por count desc, com colunas: title, url, clicks 7d, clicks 30d, total.
4. Empty state quando sem eventos: ilustração + texto "Compartilhe sua página para começar a ver analytics".
5. Loading skeletons enquanto dados carregam.
6. Acessibilidade: tabela com headers semânticos, gráfico com fallback de tabela.

### Story 4.5 — Conta: Exportar e Excluir

Como usuário,
Quero exportar todos os meus dados em JSON e excluir minha conta permanentemente,
Para que eu retenha controle sobre meus dados (LGPD-mindful).

#### Critérios de Aceitação

1. Página `/dashboard/account` com botões "Exportar dados" e "Excluir conta".
2. Export gera JSON contendo: profile + page + links + click_events + page_views (anonimizados ou não, com warning), download via blob.
3. Delete pede confirmação por digitação do username; executa cascade delete em todas as tabelas user-data + auth.users via Server Action com service role.
4. Delete encerra sessão e redireciona para `/` com toast de confirmação.
5. Testes integration validam que após delete, nenhum dado do usuário permanece em qualquer tabela.

---

## Epic 5 — Polish & Gaps Pós-MVP

**Objetivo Expandido:** Encerrar gaps funcionais e refinos detectados durante operação pós-v1.0.0 e demos em produção, em ciclos pequenos e incrementais. Diferente dos Epics 1–4 (escopo do MVP do `docs/brief.md`), Epic 5 é **aberto** — vai sendo populado conforme `docs/STORY-BACKLOG.md` é priorizado (`@po *backlog-schedule`). Stories aqui devem ser pequenas (complexity S/M), traçáveis a FRs/NFRs existentes ou a gaps documentados em backlog, e não devem introduzir novos requisitos sem amend ao PRD (Constitution Art. IV — No Invention). Não há prazo agregado — cada story entra/sai em ciclo SDC normal.

O primeiro item é o gap de identidade rica: o schema `profiles` (Story 2.2, migration `0002_profiles.sql`) já tem `display_name TEXT` e `bio TEXT` nullable, e `components/public/PublicPage.tsx` (Story 2.7) já renderiza ambos. Porém Stories 1.5 (signup) e 2.1 (slug edit) deixaram apenas `username` editável em `/dashboard/profile` — resultado: usuários reais (não-seed) sempre exibem `@handle` sem nome ou apresentação. Gap detectado em Story 3.5 Task 5 quando o dono do projeto popular o perfil `demo` em prod para Lighthouse measurement.

### Story 5.1 — UI de Edição de Display Name e Bio no Dashboard

Como usuário,
Quero editar meu `display_name` e minha `bio` em `/dashboard/profile`,
Para que minha página pública `/@<username>` exiba minha identidade rica (nome + apresentação) e não apenas o handle `@username`.

#### Critérios de Aceitação

1. Form em `/dashboard/profile` adiciona campos `display_name` (text input, **≤ 50 chars** per FR13) e `bio` (textarea, **≤ 280 chars** per FR13), ambos opcionais (null/empty permitidos — coluna `display_name TEXT` e `bio TEXT` nullable per `0002_profiles.sql`).
2. Validação Zod em `lib/validators/profile.ts` aplica os limites de FR13 + `trim`; mensagens de erro em PT-BR (NFR11).
3. Server Action `updateProfileMeta` em `server/profile/actions.ts` persiste mudanças sob RLS `profiles_update_own` (Story 2.2), seguindo o padrão da `updateUsername` (Story 2.1) — auth check, validate, update, retornar `{ success | error }`.
4. UI segue padrão **shadcn Form + RHF**, espelhando o precedente `UsernameForm` (mesmas convenções de controles, mensagens de erro, estado de submitting e toast on success).
5. Após submit bem-sucedido, `router.refresh()` propaga mudanças para `/@<username>` (re-render SSR); nenhum rebuild ISR exigido.
6. Component test cobre validação (limites e trim, ambos campos opcionais), submit happy path e erro do Server Action.

> **Origem:** `docs/STORY-BACKLOG.md` → `[STORY-3.5-F2]` (agendado por `@po *backlog-schedule` 2026-05-28; primeira story pós-v1.0.0 release).
> **No-Invention reconciliation:** o backlog sugere `display_name` ≤ 80 chars ("sugerido") mas a fonte canônica é **FR13** (≤ 50). AC1 segue FR13. Bio (280) bate em ambas as fontes.
> **Out-of-scope (deferido):** atualização do perfil `demo` em prod com novos valores é tarefa operacional pós-merge (não-AC); avatar upload (já implementado em Story 2.1 `AvatarUpload`) permanece intocado.

---

## Relatório de Resultados do Checklist

> **Status:** Pendente. PM checklist (`pm-checklist.md`) deve ser executado antes do handoff a `@po`.
> **Recomendação:** rodar `*execute-checklist pm-checklist` em sessão separada para validar este PRD contra os 100+ critérios canônicos do AIOX antes de seguir para a fase de stories.

---

## Próximos Passos

### Prompt para o UX Expert

> @ux-design-expert (Uma): Este PRD define a UX em alto nível (mobile-first, 3 temas presets, 10 telas core). Por favor, leia este documento integralmente e produza `docs/frontend-spec.md` cobrindo: wireframes das 10 telas, identidade visual definitiva (paleta, tipografia, logo seed), patterns de interação (drag-drop, edição inline, toggle visibility, theme preview), spec de acessibilidade WCAG AA. Branding seed: violeta (`#7C3AED`), Inter/system stack, tom moderno-minimalista. Não invente requirements — questione o que estiver ambíguo.

### Prompt para o Architect

> @architect (Aria): Este PRD define a arquitetura em alto nível (Next.js 16 App Router + Supabase BaaS + Vercel, monorepo, serverless, sem Supabase local). Por favor, leia este PRD integralmente e produza `docs/architecture.md` cobrindo: arquitetura de sistema (diagrama C4 nível 2 e 3), schema lógico completo (a delegar a `@data-engineer` para DDL detalhado), estratégia RLS canônica (template para owner/non-owner/anonymous), padrão de Server Actions, estratégia de revalidação de cache para `/@<username>`, plano de testes (Unit + Integration via Supabase Branching, **sem E2E**), pipeline CI/CD detalhado, estratégia de observability mínima, e plano de migração para tier pago do Supabase se exaurir free. Não invente requirements — qualquer ambiguidade volta para `@pm` antes de decisão.

---
