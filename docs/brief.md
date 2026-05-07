# Project Brief: BioLink

> **Status:** Draft — em construção via `@analyst *create-project-brief`
> **Última atualização:** 2026-05-06

---

## Executive Summary

**BioLink** é um aplicativo web de gerenciamento de bio-links — uma página única e personalizável que centraliza todos os links de um criador (redes sociais, portfólio, produtos, contatos) acessível por uma URL pública curta.

O projeto endereça **dois problemas em paralelo**:

- **Para o usuário final:** a fragmentação de presença digital. Criadores precisam de um único endereço para apontar de bios do Instagram, TikTok, X, LinkedIn, etc., e querem controle visual e analytics simples sobre seus links.
- **Para o desenvolvedor (objetivo didático principal):** a necessidade de praticar uma stack full-stack moderna e completa em um projeto pequeno o suficiente para ser dominável, mas rico o bastante para exercitar autenticação, RLS, SSR, design system, CI/CD e analytics em condições reais de uso.

**Público-alvo (duplo):**

- **Usuários do produto:** criadores de conteúdo, profissionais liberais, freelancers e pessoas próximas ao desenvolvedor que precisam de uma página de links rápida, gratuita e sem amarras de plano.
- **Aprendiz primário:** desenvolvedor solo praticando Next.js (React + SSR + componentes), Supabase (Auth, Postgres, RLS), design system, CI/CD e analytics em um projeto que será efetivamente publicado e usado.

**Proposta de valor:**

Uma alternativa enxuta ao Linktree construída com stack moderna e majoritariamente gratuita (Supabase free tier + Vercel/Next.js), oferecendo personalização visual, métricas reais de cliques e total controle sobre os dados — sem os limites do plano free de produtos comerciais e sem upsell de funcionalidades básicas.

---

## Problem Statement

### Estado atual e pain points

Criadores de conteúdo, profissionais autônomos e marcas pessoais operam, hoje, em **múltiplas plataformas simultaneamente** (Instagram, TikTok, YouTube, X, LinkedIn, Substack, etc.). Quase todas essas plataformas impõem a mesma restrição na bio: **apenas um link**. O resultado é uma cascata previsível de problemas:

- **Fragmentação de presença digital:** o criador precisa escolher *qual* link priorizar a cada semana, ou trocar manualmente toda vez que muda a campanha (lançamento de podcast, novo produto, evento).
- **Perda de engajamento:** seguidores raramente clicam em "link na bio" se o destino não for óbvio ou interessante; um único link genérico do site não converte.
- **Inconsistência de marca:** páginas improvisadas (notas no Twitter, Google Doc, página estática mal feita) machucam credibilidade.
- **Falta de visibilidade:** o criador não sabe **quais** links convertem, **quando**, **de onde**. Decide no escuro.

### Impacto (estimado, não medido aqui)

- **Custo financeiro de soluções pagas:** Linktree Pro custa ~US$ 5–24/mês por usuário; planos básicos ainda têm limites de links/analytics e impõem branding da plataforma.
- **Custo de tempo:** trocar links manualmente entre campanhas é trabalho repetitivo de ~minutos por dia, escalando com o número de campanhas paralelas.
- **Custo de oportunidade:** sem analytics simples, criadores não conseguem otimizar o que promovem na bio.

> **Nota de honestidade:** Não temos dados primários. Esses impactos são plausíveis a partir do mercado, mas não foram medidos por pesquisa nossa. Devem ser validados em fase posterior se forem usados como base de decisão.

### Por que as soluções existentes não bastam (para *este* projeto)

| Solução | Limitação relevante |
|--------|---------------------|
| **Linktree (free)** | Limite de links, analytics básico, branding/ads forçados, sem custom domain |
| **Linktree (paid)** | US$ 5–24/mês por pessoa, vendor lock-in, todos os dados na plataforma |
| **Beacons / Bio.link** | Trade-offs equivalentes; foco em monetização que não atende quem só quer página de links |
| **Carrd / Notion público** | Exige montagem manual; analytics inexistentes ou externos |
| **Página estática DIY** | Requer skill técnico, sem analytics, sem auth para o dono editar |

Nenhuma dessas opções entrega, simultaneamente: **gratuita sem ads + analytics próprios + dados controlados pelo dono + UX moderna**. Esse é o gap específico que **BioLink** ocupa — embora pequeno comercialmente, é exatamente o gap que justifica construir.

### Urgência — por que **agora**

Esta é a parte onde a maioria dos briefs força urgência inflada. Vamos ser honestos:

- **Comercialmente: não há urgência.** O mercado está saturado e maduro. Qualquer pessoa que precisa de bio-link já tem opção *boa-o-suficiente* hoje.
- **Didaticamente: a urgência é alta.** O escopo do problema é:
  - **Pequeno o bastante** para ser construído sozinho em semanas, não meses;
  - **Realista o bastante** para forçar decisões reais sobre auth, RLS, SSR, design system, CI/CD, métricas;
  - **Visível o bastante** para gerar feedback público (qualquer amigo pode usar e dar feedback).
  - **Stack-aligned:** Next.js + Supabase é exatamente a stack que se quer treinar — o problema casa naturalmente com as ferramentas.

Em outras palavras: **o "agora" deste projeto é didático, não de mercado.** Construir BioLink hoje é ótimo *para o aprendiz*; o usuário final está bem servido (e isso é OK).

---

## Proposed Solution

### Conceito core

**BioLink é um web app full-stack onde qualquer pessoa cria conta, monta uma página de links personalizada com URL pública (`biolink.app/@usuario`), e recebe analytics simples de cada clique.** A experiência mira **velocidade de setup** (signup → primeira página publicada em < 2 minutos) e **clareza de uso** (zero curva de aprendizado para quem já viu Linktree).

### Diferenciadores vs. soluções existentes

- **Gratuito sem ads/branding forçado** — escala dentro do Supabase free tier; sem upsell agressivo.
- **Dono dos dados** — exportação trivial; tudo é Postgres puro com RLS, auditável e portátil.
- **Stack moderna e auditável** — Next.js + Supabase é arquitetura limpa, não monolito legado, e o repo (eventualmente) público serve como referência didática.
- **Foco no essencial** — o produto não tenta ser plataforma de e-commerce, newsletter ou marketplace. Faz uma coisa bem.

### Por que esta solução tem chance (no escopo definido)

- **Não está competindo:** o sucesso é "amigos usam de verdade" + "aprendiz dominou stack", não "ganhar mercado". Isso remove pressão de growth e libera foco em qualidade.
- **Stack alinhada ao problema:** Next.js (SSR para páginas públicas), Supabase (auth + RLS quase free), e analytics simples (events em Postgres) casam exatamente com as features-alvo.
- **Escopo dominável:** suficientemente pequeno para 1 dev terminar, suficientemente real para forçar decisões de arquitetura e segurança verdadeiras.

### Visão de alto nível do produto

- **Página pública:** layout vertical mobile-first, identidade visual limpa, lista de links clicáveis com ícones, contagem de cliques visível só ao dono.
- **Dashboard privado:** edição inline de perfil, gerenciamento de links com drag-and-drop para reordenar, estatísticas básicas (cliques por link, visualizações totais, série temporal de 7/30 dias).
- **Onboarding:** signup com email + senha → escolha de slug → 3 links de exemplo pré-preenchidos → publicar.

---

## Target Users

### Primary User Segment: Criadores casuais lusófonos próximos do desenvolvedor

- **Perfil demográfico:** 18-45 anos, majoritariamente Brasil, presença em redes (IG/TT/LinkedIn) sem ser creator profissional full-time. Inclui amigos do desenvolvedor, pessoas em projetos paralelos (curso, podcast, freelance, side-project, portfolio profissional).
- **Comportamento atual:** mantêm bio com **um único link** que raramente atualizam, ou usam Linktree free com limites e ads, ou simplesmente não têm centralização (link do site, do LinkedIn, alternam manualmente).
- **Pain points específicos:**
  - Não querem (ou não podem) pagar US$/mês por uma página de links;
  - Não têm skill (ou paciência) para criar página estática DIY;
  - Querem que pareça profissional e sem ads de terceiros;
  - Querem **alguma** noção de "está funcionando ou não" sem virar analista de dados.
- **Goals:**
  - Ter um **endereço único** que centralize sua presença digital;
  - Atualizar **rápido** quando lançam algo novo;
  - **Parecer profissional** sem investir em design;
  - Eventualmente entender o que o público clica.

### Secondary User Segment: Devs aprendizes / curiosos

- **Perfil:** desenvolvedores em transição para full-stack moderno, estudando Next.js + Supabase, em busca de projeto-referência concreto e usável.
- **Comportamento:** estudam por código real, replicam projetos open-source, valorizam decisões arquiteturais documentadas mais do que features brilhantes.
- **Pain points:**
  - Tutorials são fragmentados (auth aqui, RLS ali, SSR acolá);
  - Projetos demo são triviais demais (todos são to-do lists);
  - Repositórios reais são complexos demais (escalas que não cabem em estudo).
- **Goals:**
  - Ver um projeto **completo** (auth → DB → RLS → SSR → CI/CD → analytics) em escopo dominável;
  - Aprender padrões de produção sem ler 50K linhas;
  - Eventualmente usar como template ou referência em projetos próprios.

---

## Goals & Success Metrics

### Business Objectives

> Como o "negócio" aqui é didático, os objetivos são reformulados como objetivos de aprendizado + adoção mínima viável.

- Concluir MVP funcional em produção em **6–12 semanas part-time**, com todas as 10 features-core operando.
- Cobrir **100% das tecnologias-alvo** declaradas (Next.js SSR, Supabase Auth, Postgres + RLS, design system reutilizável, CI/CD via GitHub Actions, analytics interno) com pelo menos 1 feature de produção exercitando cada uma.
- Atrair e reter **>= 5 usuários reais** (amigos/conhecidos) com pelo menos 1 semana de uso ativo, validando que o produto funciona em condições reais.
- Manter **0 incidentes de segurança** (vazamento via RLS mal configurado, secret leak, etc.) durante o MVP.
- Manter aderência aos princípios da **Constitution AIOX** (story-driven, no invention, quality first) verificada em todas as stories.

### User Success Metrics

- **Time-to-first-published-page:** mediana < 2 minutos do signup ao primeiro link publicado.
- **Activation rate:** >= 60% dos signups adicionam >= 3 links na primeira sessão.
- **Weekly retention (W2):** >= 30% dos usuários voltam ao app na 2ª semana após signup.
- **Qualitative NPS (amigos testers):** média >= 7/10 em pesquisa informal.
- **Erro percebido pelo usuário:** < 1 reclamação de bug crítico por semana.

### Key Performance Indicators (KPIs)

- **Total registered users / Weekly active users (WAU):** trackear curva de adoção.
- **Pages published rate:** % de signups que efetivamente publicam página (esperado >= 70%).
- **Average click-through per page:** indicador de utilidade real (não há target absoluto; trackear tendência).
- **Lighthouse score:** Performance, Accessibility, Best Practices, SEO **>= 90** em página pública e dashboard.
- **Test coverage:** backend (server actions/API) **>= 70%**, frontend (componentes críticos) **>= 50%**.
- **Deploy frequency:** **>= 1 deploy/semana** durante MVP (sinaliza fluxo CI/CD vivo).
- **MTTR (Mean Time To Recovery) em incidentes:** **< 1h** para restaurar serviço após falha em produção.
- **Stories conformes ao SDC:** **100%** das stories passam por @po (validate) e @qa (gate) antes de ir para produção.

---

## MVP Scope

### Core Features (Must Have)

- **Auth com Supabase Auth (email + senha):** fundação de identidade; pré-requisito para tudo que envolve dados do usuário. Inclui fluxos de signup, login, logout, verificação de email e reset de senha.
- **Middleware Next.js para proteção de rotas:** middleware global que valida sessão Supabase em rotas privadas (dashboard, edição) e redireciona para `/login` quando não autenticado; usuários autenticados visitando `/login` ou `/signup` são redirecionados para o dashboard. Objetivo didático: praticar Next.js middleware + Supabase server-side auth.
- **Perfil público com slug único (`/@username`):** o ponto central do produto; URL pessoal para colocar em bio.
- **CRUD de links (título, URL, ícone, visibilidade on/off, ordenação drag-and-drop):** feature core do produto; sem isso não há produto.
- **Página pública renderizada via SSR:** garante performance e SEO; objetivo didático de exercitar Next.js App Router + Server Components.
- **Analytics interno básico (cliques por link + page views, série de 7/30 dias):** diferencial relevante vs. Linktree free; objetivo didático de event tracking + agregação em Postgres.
- **3 temas customizáveis (presets fechados, ex: Light, Dark, Brand):** UX percebida; aplicação prática do design system com tokens compartilhados. Escopo MVP é fixo em 3 temas — variações livres ficam para Phase 2.
- **Design system básico (Button, Input, Card, Form, Avatar, Modal, Toast):** componentes reaproveitados em todo o app; objetivo didático.
- **CI/CD via GitHub Actions + Vercel (auto-deploy em main, preview em PRs):** objetivo didático e prático; cada merge vai pra produção.
- **RLS configurado em todas as tabelas user-data:** segurança real (usuário só lê/edita o próprio); objetivo didático e proteção dos primeiros usuários reais.

### Out of Scope for MVP

- Custom domains (`linktree.helion.dev`).
- Templates avançados / temas pré-prontos pagos.
- Embeds ricos (YouTube, Spotify, Instagram posts inline).
- E-commerce / pagamentos / checkout.
- Newsletter integration (Mailchimp, Substack, etc.).
- QR code generator por página.
- UI multi-idioma (MVP em PT-BR; inglês é Phase 2).
- Equipe / colaboração / múltiplos editores por página.
- Versioning / histórico de edições nos links.
- A/B testing nativo de links.
- API pública para terceiros.
- Mobile app nativo (iOS/Android) — apenas mobile web.
- Importação automática de links de outras plataformas (Linktree, Beacons).

### MVP Success Criteria

- **Adoção mínima:** >= 5 amigos publicaram página e usaram por pelo menos 1 semana.
- **Cobertura técnica:** todas as 10 core features rodam em produção sem regressões críticas conhecidas.
- **Articulação didática:** o aprendiz consegue explicar, por feature, **qual capability** da stack-alvo foi exercitada e **qual decisão** foi tomada (RLS policy, SSR vs. CSR, escolha de design system, pipeline de CI/CD, etc.).
- **Métricas básicas:** Lighthouse >= 90 em página pública; deploy frequency >= 1x/semana mantida no último mês do MVP; 0 incidentes de segurança.

---

## Post-MVP Vision

### Phase 2 Features

- **Custom domain** (mapping de domínio próprio para a página).
- **Templates / temas avançados** (mais presets, possivelmente templates da comunidade).
- **Embeds ricos** (YouTube preview, Spotify player, Instagram post embed).
- **QR code generator** por página, downloadable como PNG/SVG.
- **Analytics avançado** (geo, device type, referrer, retenção de visitantes).
- **Scheduled links** (link aparece/some em janelas de tempo, para campanhas).
- **Multi-idioma** (UI em inglês, depois espanhol).
- **Importação de links** de Linktree/Beacons via CSV ou scrape.

### Long-term Vision (1-2 anos)

BioLink se consolida como **portfolio profissional do desenvolvedor + case real para a comunidade dev**. Possível open-source do repo como referência didática completa. Eventualmente, **monetização opcional leve** (ex: custom domain + analytics avançado num tier pago de US$ 2-3/mês) se houver demanda orgânica — sem agressividade de growth.

### Expansion Opportunities

- **Marketplace de templates** criados pela comunidade (modelo open contribution).
- **Integrações com plataformas de creators** (Twitch alerts, Patreon membership status).
- **API pública** para devs construírem integrações (ex: bot que atualiza links automaticamente).
- **Versão multi-tenant para agências** que gerenciam BioLinks de múltiplos clientes (white-label).
- **Mobile app nativo** se uso mobile justificar (provavelmente não — PWA basta).

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web responsivo, **mobile-first** (consumo majoritário em celular). Desktop via layout adaptativo.
- **Browser/OS Support:** últimas 2 versões de Chrome, Safari, Firefox, Edge; iOS 14+; Android 10+.
- **Performance Requirements:** Lighthouse >= 90 (Performance, Accessibility, Best Practices, SEO); LCP < 2.5s; INP < 200ms; bundle JS inicial < 200KB gzipped na página pública.

### Technology Preferences

- **Frontend:** Next.js (App Router) + React 18+ + TypeScript + Tailwind CSS. Componentes via shadcn/ui ou similar (a confirmar com @architect).
- **Backend:** Supabase (Postgres + Auth + Storage). Server Actions / Route Handlers do Next.js para lógica que precisar.
- **Database:** Postgres via Supabase, **com RLS habilitado em todas as tabelas user-data**. Migrations versionadas.
- **Hosting/Infrastructure:** Vercel (frontend + edge) + Supabase (managed backend). Free tier nas duas pontas durante MVP.

### Architecture Considerations

- **Repository Structure:** monorepo simples (projeto Next.js único). Não há justificativa para micro-services neste escopo.
- **Service Architecture:** Next.js full-stack com Server Components + Server Actions; Supabase como BaaS único (auth + DB + storage). Edge functions só se necessário (ex: rotear analytics events).
- **Auth & Route Protection:** autenticação via Supabase Auth (email + senha). **Middleware Next.js** (`middleware.ts`) interceptando rotas privadas para validar sessão server-side e redirecionar guests; rotas públicas (`/@username`) não passam pela checagem de auth.
- **Integration Requirements:** **nenhuma integração externa obrigatória no MVP**. Analytics e auth são internos via Supabase. Email transacional via Supabase Auth limitado a verificação de email + reset de senha.
- **Security/Compliance:** RLS rigoroso (testado). No client-side secret leak (env vars segregadas). Rate limiting básico em endpoints públicos (via middleware Vercel ou Supabase). Compliance LGPD-minded: consent simples no signup, opção de exclusão de conta + dados, exportação de dados sob demanda.

---

## Constraints & Assumptions

### Constraints

- **Budget:** ~zero. Tudo em **free tiers** (Supabase Free, Vercel Hobby) salvo necessidade clara documentada. Custo aceito: domínio (~US$ 10/ano) se usar custom domain.
- **Timeline:** sem deadline rígido — projeto didático conduzido em paralelo a outras atividades. **Capacidade declarada: 20 h/semana**, o que sustenta uma estimativa realista de **MVP em 6–10 semanas** (~120–200 h totais com SDC + agents).
- **Resources:** **1 desenvolvedor (você)**, apoiado pelos agents AIOX (architect, dev, qa, devops, etc.).
- **Technical:** ficar dentro dos limites do Supabase free tier (500 MB DB, 1 GB storage, 50K MAU) e Vercel Hobby (bandwidth, build minutes). Plano de migração para tier pago documentado se ultrapassar.

### Key Assumptions

- A stack escolhida (Next.js + Supabase) é a apropriada e o aprendiz **vai mantê-la** (sem trocas mid-projeto).
- Free tiers do Supabase + Vercel **serão suficientes** durante todo o MVP e provavelmente Post-MVP inicial.
- **Não haverá necessidade** de infra dedicada (backend custom, queues, jobs pesados, ML).
- Os "amigos testers" terão **paciência para feedback** e tolerância a bugs ocasionais.
- Métricas internas (Postgres) serão suficientes — **não precisaremos integrar Mixpanel/Amplitude no MVP**.
- O **workflow AIOX será adotado integralmente** (story-driven, agents, gates).
- O escopo do MVP é **fechado** — features fora do "Out of Scope" só entram após o MVP.
- **Repositório open-source desde o dia 1.** Implica: secrets sempre em `.env.local` / variáveis de ambiente da Vercel/Supabase, jamais commitados; branding e naming intencionais desde o início; `README.md` legível por terceiros; LICENSE definida na fundação (sugestão: MIT, a confirmar com @architect).
- **UI em PT-BR apenas no MVP.** Sem stack de i18n (next-intl, etc.) — strings podem ficar como literais ou em um arquivo simples de constants. Internacionalização vira **Phase 2** quando/se houver demanda.

---

## Risks & Open Questions

### Key Risks

- **Escopo inflado pelo objetivo didático:** "para aprender X, preciso fazer Y também" pode multiplicar features sem fim. *Mitigação:* rigor no MVP Scope; usar AIOX gates (G3, G5) e Article IV (No Invention) para bloquear scope creep.
- **Aprendiz desmotiva por mercado saturado:** se a percepção mudar de "didático" para "estou copiando Linktree em vão", motivação pode cair. *Mitigação:* medir progresso por **capabilities aprendidas**, não por adoção; reforçar que adoção dos amigos é bonus.
- **Supabase free tier exaurido cedo:** improvável no MVP (50K MAU é muito), mas pode acontecer com viralização inesperada. *Mitigação:* monitorar uso desde dia 1; alertas em 70% de qualquer limite; plano de upgrade documentado.
- **Vendor lock-in com Supabase:** RLS é Postgres-puro (portátil); Auth é mais lock-in (provider próprio). *Mitigação:* documentar decisão; manter abstração mínima onde fizer sentido sem complicar.
- **Burn-out de solo dev:** sem time, sem deadline, projeto pode arrastar e morrer. *Mitigação:* usar SDC (Story Development Cycle) com stories pequenas; visibilidade de progresso via stories concluídas; pausa explícita e retomada sem culpa.
- **Falha de RLS exposta a usuários reais:** vazamento de dados teria impacto reputacional + ético com amigos. *Mitigação:* testes de RLS rigorosos por @qa; revisão obrigatória pelo @data-engineer; alertas de Supabase advisors monitorados.
- **Drift entre brief, PRD e implementação:** brief otimista pode não sobreviver às restrições reais. *Mitigação:* AIOX gates forçam re-validação; brief é vivo, atualizado se decisões mudarem.

### Open Questions

- Custom domain pessoal ou subpath gratuito do Vercel inicial?
- Analytics: armazenar **eventos brutos** (cada clique = 1 row) ou **agregar imediatamente** por questões de free tier?
- Política de **retenção** de dados (usuários inativos): excluir após X meses? Manter indefinido?
- **Email transacional** além dos básicos do Supabase Auth (verificação + reset) — ex: confirmação de mudança de slug, alerta de RLS? Manter zero ou incluir?
- **Brand/identidade visual** do BioLink: roxo/preto neutro, ou paleta mais autoral?

### Areas Needing Further Research

- Comparativo **detalhado de features** entre Linktree, Beacons, Bio.link, Carrd (validar gap real).
- Padrões de **RLS no Supabase** para multi-tenant (cada user = tenant) com performance em queries comuns.
- Estratégias de **SSR + caching** em Next.js App Router para páginas públicas com TTL curto (revalidação por edição).
- Bibliotecas de **design system** maduras para Next.js + Tailwind (shadcn/ui, Radix UI, NextUI, etc.) — escolha definitiva.
- Stack de **analytics interno minimalista** (event log em Postgres + agregações periódicas vs. tools externos como Plausible self-hosted).
- Práticas de **LGPD em produtos pequenos** (consent banner, exclusão, exportação, retenção).
- Estratégia de **rate limiting** para endpoints públicos (`/@username`) sem precisar de infra dedicada.

---

## Appendices

### A. Research Summary

> Skip — sem pesquisa formal externa neste estágio. Recomendado executar `*perform-market-research` e `*create-competitor-analysis` antes/durante o PRD se o gap competitivo precisar de validação.

### B. Stakeholder Input

Decisões formais do aprendiz/stakeholder único após review do brief (2026-05-06):

| Tópico | Decisão | Implicação |
|--------|---------|------------|
| **Capacidade dedicada** | 20 h/semana part-time | MVP estimado em 6–10 semanas (~120–200 h totais) |
| **Modelo do repositório** | Open-source desde o dia 1 | Secrets sempre fora do repo; LICENSE (sugestão MIT) na fundação; README/docs com qualidade pública desde o início |
| **Idioma da UI no MVP** | PT-BR somente | Sem stack de i18n no MVP; strings em literais ou constants simples; multi-idioma vira Phase 2 |
| **Auth do MVP** *(decisão posterior, registrada aqui para histórico)* | Email + senha (não magic link) | Inclui middleware Next.js para proteção de rotas privadas |
| **Temas no MVP** *(decisão posterior, registrada aqui para histórico)* | 3 temas fixos (presets fechados) | Variações livres / templates abertos viram Phase 2 |

### C. References

- **Concorrentes:** Linktree (linktr.ee), Beacons (beacons.ai), Bio.link, Carrd (carrd.co).
- **Stack:** Next.js (nextjs.org), Supabase (supabase.com), Tailwind CSS (tailwindcss.com), shadcn/ui (ui.shadcn.com).
- **Framework de execução:** AIOX Constitution (`.aiox-core/constitution.md`), AIOX Workflows (`.claude/rules/workflow-execution.md`).

---

## Next Steps

### Immediate Actions

1. **Validar este Project Brief** com o aprendiz (você) — fazer ajustes se algo destoar.
2. **Inicializar ambiente** via `*environment-bootstrap` (git, GitHub remote, CI/CD scaffolding).
3. **Convocar @architect** (`@architect`) para `docs/architecture/` (decisões de stack, schema lógico, RLS strategy, design system pick).
4. **Convocar @data-engineer** (`@data-engineer`) para schema design detalhado (`users`, `pages`, `links`, `click_events`, `themes`) com RLS policies.
5. **Convocar @ux-design-expert** (`@ux-design-expert`) para `docs/frontend-spec.md` (wireframes, IA básica, design system seed).
6. **Convocar @pm** (`@pm`) para criar **PRD** a partir deste brief.
7. **Convocar @sm** (`@sm`) para draftar **primeira story** (provável: signup + perfil mínimo + RLS para `users`).
8. **Convocar @po** (`@po`) para validar a primeira story (10-point checklist) antes de ir para `@dev`.

### PM Handoff

This Project Brief provides the full context for **BioLink**. Please start in **'PRD Generation Mode'**, review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.
