# BioLink — Database Schema Design

> **Status:** Draft v0.2 — gerado via `@data-engineer *create-schema` em modo YOLO sobre v0.1 (seção 1).
> **Owner:** @data-engineer (Dara)
> **Source of truth (Art. IV — No Invention):** `docs/brief.md` v1 + `docs/prd.md` v0.3 + `docs/architecture.md` v0.2 (§Data Models + §Database Schema).
> **Handoff input:** Aria (architect) entregou DDL de referência com 4 questões abertas; este documento refina, valida e formaliza a implementação.
> **Output canônico:** este documento + migrations em `supabase/migrations/0001_init.sql` (Story 1.4) + RLS policies em `docs/architecture/rls-policies.md` (sibling doc, próximo handoff).

---

## Change Log

| Date       | Version | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Author                |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| 2026-05-07 | 0.1     | Draft inicial — Seção 1 (Overview)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | @data-engineer (Dara) |
| 2026-05-07 | 0.2     | Seções 2-15 (modo YOLO); resolve 4 open questions de Aria; adiciona `set_updated_at`, `hash_pii`, partial index, retention via pg_cron                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | @data-engineer (Dara) |
| 2026-05-18 | 0.3     | Story 2.2 materializou `pages` + tipo `theme_preset` (`supabase/migrations/0003_pages.sql` + rollback companion) e estendeu `on_auth_user_created()` via `CREATE OR REPLACE` para bootstrapar 1 page por signup (1:1 MVP). RLS: `pages_select_public`/`pages_select_own`/`pages_update_own`. Apenas append (doc é L2/extend-only).                                                                                                                                                                                                                                                                                                               | @data-engineer (Dara) |
| 2026-05-18 | 0.4     | Story 2.3 materializou `links` (N:1 com `pages`, `supabase/migrations/0004_links.sql` + rollback companion) + 2 índices (`idx_links_page_id` FK / `idx_links_page_id_position_visible` parcial Q4) + constraint `uniq_links_page_position` UNIQUE `(page_id, position)` DEFERRABLE INITIALLY DEFERRED (AC2 + primitivo do reorder atômico AC4/Story 2.6) + 5 RLS policies composite-JOIN a `pages` (`links_select_own`/`links_select_public`/`links_insert_own`/`links_update_own`/`links_delete_own`). Trigger `on_auth_user_created` NÃO estendido (`links` não é bootstrapado — conteúdo user-created). Apenas append (doc é L2/extend-only). | @data-engineer (Dara) |

---

## 1. Schema Overview

### Purpose and Scope

Este documento define o **schema físico canônico** do BioLink — o blueprint detalhado que cada migration, RLS policy, índice e trigger irá materializar. Atua como ponte entre os modelos conceituais de `architecture.md` §Data Models e o DDL executável em `supabase/migrations/`. Toda decisão aqui rastreia explicitamente a um FR ou NFR do PRD.

**Escopo IN:**

- 5 tabelas de domínio (`profiles`, `pages`, `links`, `click_events`, `page_views`)
- 4 views agregadas (`link_clicks_7d/30d`, `page_views_7d/30d`)
- Trigger `auth_user_created` (auto-bootstrap profile + page no signup)
- Função `set_updated_at()` (touch automático de `updated_at`)
- Função utilitária de hash determinístico para PII (`hash_pii`) — defensive, app layer faz hash primário
- Estratégia completa de RLS (referenciando `rls-policies.md` para policies SQL)
- Estratégia de índices (referenciando `index-strategy.md` para detalhes)
- Plano de migrations e rollback

**Escopo OUT:**

- Realtime (não usado no MVP — confirmado por arch.md §Tech Stack)
- Edge Functions (não há Edge Functions no MVP — apenas Route Handlers Next.js)
- Particionamento físico (avaliado mas postergado; ver §Scalability)
- Read replicas (free tier Supabase não suporta; postergado)

### Target Database System

| Item       | Decisão                                                                                           | Fonte                                           |
| ---------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Engine     | **PostgreSQL 15+** (Supabase managed)                                                             | `architecture.md` §Tech Stack                   |
| Região     | **`sa-east-1` (São Paulo)**                                                                       | `architecture.md` §Platform                     |
| Plano      | **Free tier** durante MVP                                                                         | `prd.md` §Premissas Técnicas                    |
| Extensions | `citext`, `pgcrypto`, `pg_cron` (Phase 2 retention)                                               | `architecture.md` §Database Schema + decisão Q3 |
| Connection | Pooler (`*.supabase.co:6543`) com `sslmode=require` em produção; Direct (5432) só para migrations | `database-best-practices.md`                    |

### Key Business Entities

| Entidade       | Cardinalidade            | FRs ancorados                         | Volumetria estimada                                                   |
| -------------- | ------------------------ | ------------------------------------- | --------------------------------------------------------------------- |
| `profiles`     | 1:1 com `auth.users`     | FR4 (username público), FR13 (perfil) | 1 row/usuário; alvo MVP: 5-50 rows                                    |
| `pages`        | 1:1 com `profiles` (MVP) | FR5, FR12                             | 1 row/usuário; alvo MVP: 5-50 rows                                    |
| `links`        | N:1 com `pages`          | FR6, FR7, FR8                         | ~5-20 rows/usuário; alvo MVP: 25-1.000 rows                           |
| `click_events` | N:1 com `links`          | FR9                                   | **Append-only**; estimativa pessimista: 1k-100k rows/mês total no MVP |
| `page_views`   | N:1 com `pages`          | FR10                                  | **Append-only**; estimativa: 5k-500k rows/mês total no MVP            |

### Expected Scale (Growth Projections)

| Horizonte                           | Usuários    | `links` total | Eventos/mês (`clicks` + `views`) | Storage estimado |
| ----------------------------------- | ----------- | ------------- | -------------------------------- | ---------------- |
| MVP launch (semana 0)               | 5-10        | ~50-100       | ~2k-10k                          | < 5 MB           |
| 3 meses pós-MVP                     | 50-100      | ~500-1.500    | ~50k-300k                        | ~50-200 MB       |
| 6 meses pós-MVP                     | 100-300     | ~1.500-5.000  | ~300k-1M                         | ~300 MB-1 GB     |
| Threshold para upgrade Supabase Pro | ~500 ativos | ~10k links    | ~5M eventos/mês                  | > 500 MB         |

> **Nota:** free tier Supabase tem limite de 500 MB DB. NFR12 do PRD impõe **retenção de 90 dias** em `click_events`/`page_views`, o que mantém volume controlado.

### Performance Requirements (Source: PRD NFRs)

| NFR           | Métrica                                | Implicação para schema                                                                           |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| NFR2          | Lighthouse ≥ 90 (mobile)               | SELECT da página pública deve retornar em < 100ms (P95)                                          |
| NFR3          | LCP < 2.5s                             | Página pública precisa de índice covering em `links (page_id, position) WHERE is_visible = true` |
| NFR4          | Dashboard analytics P95 < 500ms        | Views agregadas; índices em `(link_id, clicked_at DESC)` e `(page_id, viewed_at DESC)`           |
| NFR-implícito | Reorder de até 20 links em 1 transação | Constraint UNIQUE deferrable em `links (page_id, position)`                                      |

### Security and Compliance Requirements

| Requisito                         | Origem                        | Mecanismo no schema                                                              |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| RLS em todas as tabelas user-data | NFR1, NFR7                    | `ALTER TABLE … ENABLE ROW LEVEL SECURITY` em todas as 5 tabelas                  |
| 0 incidentes de segurança via RLS | PRD §Objetivos                | Cobertura RLS validada em CI via Supabase Branching + testes positivos/negativos |
| LGPD-mindfulness                  | brief §Considerações Técnicas | PII (IP, user-agent) armazenada apenas como `sha256(value \|\| salt)` em `bytea` |
| Sem secrets versionados           | PRD §Objetivos                | `HASH_SALT` em env vars (não em código); CI valida via gitleaks                  |
| Encryption at-rest                | architecture.md §Resilience   | Nativo do Supabase (AES-256, gerenciado) — não exige config no schema            |
| Auditoria de mutações sensíveis   | (postergado)                  | `created_at`/`updated_at` em todas as tabelas; auditing avançado fora do MVP     |

### Open Questions (carry-over from architect handoff) — RESOLVED

| Q   | Tema                                                   | Decisão                                                                | Seção            |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------- |
| Q1  | Reorder atômico: DEFERRABLE vs trigger shift-on-delete | **DEFERRABLE INITIALLY DEFERRED** + leave gaps on delete               | §7 Constraints   |
| Q2  | `bigint` vs `uuid` em event tables                     | **Manter `bigint identity`**                                           | §4 Schema Design |
| Q3  | Partitioning de event tables                           | **Postergar**; usar `pg_cron` + retention DELETE; threshold > 10M rows | §12 Scalability  |
| Q4  | Partial index `links … WHERE is_visible = true`        | **Incluir** (`idx_links_page_id_position_visible`)                     | §6 Indexing      |

---

## 2. Domain Model

### Core Entities

#### `profiles` — Identidade pública do usuário

- **Descrição:** projeção pública 1:1 de `auth.users`. Carrega o handle (`username`) que aparece em `/@username` e os campos editáveis pelo usuário (avatar, bio, display_name).
- **Atributos-chave:**
  - `username` (FR4): handle único, lowercase, kebab-case, regex `^[a-z0-9-]{3,30}$`. Imutável após criação? **Não.** Editável; impactos em SEO/links externos são responsabilidade do usuário (FR4 não restringe edição).
  - `display_name`, `bio`, `avatar_url` (FR13): metadados visuais opcionais.
- **Lifecycle:** criado por trigger `auth_user_created` no signup; soft-delete via `deleteAccount()` Server Action — em MVP, hard-delete em cascata via `auth.users` ON DELETE CASCADE.
- **Invariantes:** `username` único globalmente (case-insensitive via `citext`); `auth.users.id` deve existir (FK).

#### `pages` — Container de configuração da página pública

- **Descrição:** uma "página" do BioLink. No MVP é 1:1 com profile, mas modelagem 1:N é preparada para Phase 2 (PRD Story 2.2 — múltiplas páginas/perfil).
- **Atributos-chave:**
  - `theme` (FR12): preset de tema, enum `'light' | 'dark' | 'brand'`.
  - `is_published` (FR5): controla se a URL pública é visível anônimamente.
- **Lifecycle:** criada junto com `profile` no signup (mesmo trigger). Atualizada via `updateTheme()` / `togglePublished()`.
- **Invariantes:** `profile_id` UNIQUE no MVP (força 1:1).

#### `links` — Item clicável

- **Descrição:** entrada na página com título, URL e ícone, posicionada via `position` (FR7) e ocultável via `is_visible` (FR8).
- **Atributos-chave:**
  - `position`: integer único por `page_id`; reorder via UPDATE em transação.
  - `is_visible`: boolean; `false` esconde da página pública mas mantém na lista do dashboard.
  - `url`: regex enforce HTTP/HTTPS — bloqueia `javascript:`, `data:`, etc. (defesa em profundidade contra XSS reflectido).
- **Lifecycle:** CRUD direto via Server Actions; soft-delete não usado no MVP (delete = hard delete em cascata se page deletada).
- **Invariantes:** `(page_id, position)` único; `position >= 0`; `length(title) <= 100`; `url ~* '^https?://'`.

#### `click_events` — Tracking bruto de cliques

- **Descrição:** append-only log de cliques (FR9). PII (IP, user-agent) hashada para LGPD-mindfulness.
- **Atributos-chave:**
  - `id` bigint identity: optimização para append-only (vs uuid — Q2 resolved).
  - `user_agent_hash`, `ip_hash`: `sha256(value \|\| HASH_SALT)` em `bytea`. Salt em env var (`HASH_SALT`), nunca versionado.
- **Lifecycle:** INSERT-only via Route Handler `/api/track/click` (service-role bypassa RLS). Retenção: 90 dias (NFR12) — DELETE via `pg_cron` daily job (Phase 2 — Story TBD).
- **Invariantes:** `link_id` deve existir (FK); `clicked_at` default `now()`.

#### `page_views` — Tracking bruto de page-views

- **Descrição:** análogo a `click_events` mas para impressões da página pública (FR10). Mesma estratégia de privacidade, mesma retenção.
- **Lifecycle / Invariantes:** idênticos a `click_events` (substituindo `link_id` por `page_id`).

### Relationships

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1 (FK id)"
    PROFILES ||--|| PAGES : "1:1 (FK profile_id, UNIQUE)"
    PAGES ||--o{ LINKS : "1:N (FK page_id)"
    PAGES ||--o{ PAGE_VIEWS : "1:N (FK page_id)"
    LINKS ||--o{ CLICK_EVENTS : "1:N (FK link_id)"

    AUTH_USERS {
        uuid id PK
        text email
    }
    PROFILES {
        uuid id PK_FK
        citext username UK
        text display_name
        text bio
        text avatar_url
    }
    PAGES {
        uuid id PK
        uuid profile_id FK_UK
        theme_preset theme
        boolean is_published
    }
    LINKS {
        uuid id PK
        uuid page_id FK
        text title
        text url
        text icon
        boolean is_visible
        integer position
    }
    CLICK_EVENTS {
        bigint id PK
        uuid link_id FK
        timestamptz clicked_at
        bytea user_agent_hash
        bytea ip_hash
    }
    PAGE_VIEWS {
        bigint id PK
        uuid page_id FK
        timestamptz viewed_at
        bytea user_agent_hash
        bytea ip_hash
    }
```

| From → To                 | Tipo                        | Cardinalidade             | Cascade ON DELETE | Cascade ON UPDATE       | Significado                         |
| ------------------------- | --------------------------- | ------------------------- | ----------------- | ----------------------- | ----------------------------------- |
| `auth.users` → `profiles` | FK on `id`                  | 1:1                       | CASCADE           | NO ACTION (PK imutável) | Profile some quando user é deletado |
| `profiles` → `pages`      | FK on `profile_id` (UNIQUE) | 1:1 (MVP) / 1:N (Phase 2) | CASCADE           | NO ACTION               | Page some quando profile some       |
| `pages` → `links`         | FK on `page_id`             | 1:N                       | CASCADE           | NO ACTION               | Links somem quando page some        |
| `links` → `click_events`  | FK on `link_id`             | 1:N                       | CASCADE           | NO ACTION               | Eventos somem quando link some      |
| `pages` → `page_views`    | FK on `page_id`             | 1:N                       | CASCADE           | NO ACTION               | Views somem quando page some        |

### Bounded Contexts (DDD-lite)

Embora o BioLink seja um sistema pequeno, agrupar entidades em contextos auxilia evolução futura (especialmente Phase 2 com múltiplas páginas):

| Context        | Entidades                    | Responsabilidade                                        |
| -------------- | ---------------------------- | ------------------------------------------------------- |
| **Identity**   | `auth.users`, `profiles`     | Quem é o usuário, como ele se identifica publicamente   |
| **Publishing** | `pages`, `links`             | Conteúdo configurável que aparece na página pública     |
| **Analytics**  | `click_events`, `page_views` | Telemetria comportamental (append-only, retenção curta) |

> **Nota:** essa separação é apenas conceitual — todas as tabelas vivem no schema `public`. Não há separação física (sub-schemas) no MVP. Considerar `private` schema para event tables se Phase 2 introduzir multi-tenancy via roles diferenciados.

---

## 3. Access Patterns & Query Requirements

### Primary Access Patterns

#### AP-1 — Public page render (FR5, FR6, FR8) — CRÍTICO

```sql
-- Resolver username → profile → page → links visíveis ordenados
SELECT p.id, p.theme, p.is_published, pr.username, pr.display_name, pr.bio, pr.avatar_url
FROM profiles pr
JOIN pages p ON p.profile_id = pr.id
WHERE pr.username = $1 AND p.is_published = true;

SELECT id, title, url, icon, position
FROM links
WHERE page_id = $page_id AND is_visible = true
ORDER BY position ASC;
```

- **Frequência:** ~10-1000 req/dia no MVP, picos por compartilhamento social.
- **Latência alvo:** P95 < 100ms (deriva de NFR2/NFR3 do PRD).
- **Tabelas envolvidas:** `profiles`, `pages`, `links`.
- **Result size:** 1 page row + 5-20 link rows.
- **Otimização:** índice em `profiles.username` (auto via UNIQUE); índice composto **parcial** em `links (page_id, position) WHERE is_visible = true` (Q4 resolved).

#### AP-2 — Dashboard list links (FR6, FR7) — ALTA

```sql
SELECT id, title, url, icon, is_visible, position, created_at, updated_at
FROM links
WHERE page_id = $page_id
ORDER BY position ASC;
```

- **Frequência:** todo carregamento do dashboard de links.
- **Latência alvo:** P95 < 200ms.
- **Otimização:** índice em `links (page_id, position)`.

#### AP-3 — Click tracking insert (FR9) — ALTA

```sql
INSERT INTO click_events (link_id, user_agent_hash, ip_hash)
VALUES ($1, $2, $3);
```

- **Frequência:** 1:1 com cada clique em link público.
- **Latência alvo:** P95 < 50ms (server-side; cliente recebe `204 No Content` síncrono).
- **Otimização:** insert simples, FK + sequence — mínimo overhead.

#### AP-4 — Page view tracking insert (FR10) — ALTA

```sql
INSERT INTO page_views (page_id, user_agent_hash, ip_hash)
VALUES ($1, $2, $3);
```

Idêntico a AP-3.

#### AP-5 — Username uniqueness check (FR4) — MÉDIA (debounced)

```sql
SELECT 1 FROM profiles WHERE username = $1 LIMIT 1;
```

- **Frequência:** debounced no formulário de signup/edit (~3 req/usuário em fluxo de criação).
- **Otimização:** índice UNIQUE em `username` (auto).

### Secondary Access Patterns

#### AP-6 — Analytics dashboard (FR11) — MÉDIA

```sql
-- Métricas agregadas (4 cards)
SELECT
  (SELECT count(*) FROM page_views WHERE page_id = $page_id AND viewed_at >= now() - interval '7 days') AS views_7d,
  (SELECT count(*) FROM click_events WHERE link_id IN (SELECT id FROM links WHERE page_id = $page_id) AND clicked_at >= now() - interval '7 days') AS clicks_7d,
  (SELECT count(*) FROM page_views WHERE page_id = $page_id AND viewed_at >= now() - interval '30 days') AS views_30d,
  (SELECT count(*) FROM click_events WHERE link_id IN (SELECT id FROM links WHERE page_id = $page_id) AND clicked_at >= now() - interval '30 days') AS clicks_30d;

-- Time-series via views
SELECT day, count FROM page_views_30d WHERE page_id = $1 ORDER BY day;
SELECT l.title, sum(c.count) FROM links l JOIN link_clicks_30d c ON c.link_id = l.id WHERE l.page_id = $1 GROUP BY l.title;
```

- **Frequência:** ~1-10 acessos/usuário/dia.
- **Latência alvo:** P95 < 500ms (NFR4).
- **Otimização:** índices em `(link_id, clicked_at DESC)` e `(page_id, viewed_at DESC)`; views regulares (postergam materialização).

#### AP-7 — Account export (LGPD/FR-implícito) — BAIXA

```sql
-- Exportar todos os dados do user
SELECT to_jsonb(pr.*) FROM profiles pr WHERE pr.id = $1;
SELECT to_jsonb(p.*) FROM pages p WHERE p.profile_id = $1;
SELECT to_jsonb(l.*) FROM links l JOIN pages p ON p.id = l.page_id WHERE p.profile_id = $1;
-- (eventos não exportados — são telemetria pseudonimizada)
```

- **Frequência:** rara (uma vez por export).
- **Latência alvo:** P95 < 2s.

### Write Patterns

| Operação                       | Frequência típica           | Padrão de transação                                   |
| ------------------------------ | --------------------------- | ----------------------------------------------------- |
| INSERT profile + page (signup) | 1×/usuário/lifetime         | Trigger atômico em `auth.users` AFTER INSERT          |
| INSERT link                    | ~5-20×/usuário em lifecycle | Single-row via Server Action                          |
| UPDATE link (edit)             | esporádico                  | Single-row                                            |
| UPDATE links (reorder)         | ocasional                   | **Multi-row em transação**; usa constraint DEFERRABLE |
| DELETE link                    | esporádico                  | Single-row + CASCADE para click_events                |
| INSERT click_event / page_view | alta                        | Single-row append, service-role                       |
| UPDATE profile                 | esporádico                  | Single-row                                            |
| DELETE account (cascade)       | rara                        | DELETE de `auth.users` → CASCADE em tudo              |

### Reporting & Analytics

- **Aggregation queries:** views `link_clicks_7d`, `link_clicks_30d`, `page_views_7d`, `page_views_30d` (re-computadas a cada query — accepted trade-off no MVP).
- **Time-series analysis:** GROUP BY `date_trunc('day', clicked_at)` na view.
- **Cross-entity reports:** JOIN `links` × `link_clicks_*d` para tabela "top links".

---

## 4. Physical Schema Design

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS citext;     -- username case-insensitive
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), digest()
-- pg_cron habilitado em Phase 2 (retention) — Supabase requer enable manual via Dashboard
```

### Custom Types

```sql
CREATE TYPE theme_preset AS ENUM ('light', 'dark', 'brand');
```

### Utility Functions

#### `set_updated_at()` — Trigger function genérica

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

Aplicada via `BEFORE UPDATE` em todas as tabelas com `updated_at`.

#### `hash_pii(text)` — Hash determinístico defensivo

```sql
CREATE OR REPLACE FUNCTION hash_pii(input text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_salt text;
BEGIN
  -- Salt vem de ambiente via Supabase secrets (vault.decrypted_secrets)
  -- ou app_settings.hash_salt configurado em deploy.
  -- Fallback: ALTER DATABASE postgres SET app.hash_salt = '...';
  SELECT current_setting('app.hash_salt', true) INTO v_salt;

  IF v_salt IS NULL OR v_salt = '' THEN
    RAISE EXCEPTION 'app.hash_salt not configured — refusing to hash PII without salt';
  END IF;

  RETURN digest(input || v_salt, 'sha256');
END;
$$;
```

> **Nota arquitetural:** o **hash primário acontece no Route Handler Next.js** (TS, com salt do env). A função `hash_pii` é defensiva — usada apenas em scripts SQL ad-hoc (backfill, migration) que precisem hashar valores de forma consistente com o app. **Não é chamada em path de gravação normal.**

### Tables

#### `profiles`

**Purpose:** identidade pública do usuário (FR4, FR13). 1:1 com `auth.users`.

**Columns:**

| Column       | Type          | Constraints                                                | Description                                      |
| ------------ | ------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| id           | `uuid`        | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE | Mesmo ID de `auth.users` (não é gen_random_uuid) |
| username     | `citext`      | NOT NULL, UNIQUE, CHECK regex                              | Handle público (FR4)                             |
| display_name | `text`        | CHECK length ≤ 50                                          | Nome de exibição (FR13)                          |
| bio          | `text`        | CHECK length ≤ 280                                         | Bio curta (FR13)                                 |
| avatar_url   | `text`        | NULL OK                                                    | URL Supabase Storage (FR13)                      |
| created_at   | `timestamptz` | NOT NULL DEFAULT `now()`                                   | Audit                                            |
| updated_at   | `timestamptz` | NOT NULL DEFAULT `now()`                                   | Audit (touch via trigger)                        |

**Constraints (canônico):**

```sql
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     citext NOT NULL UNIQUE
                 CHECK (username ~ '^[a-z0-9-]{3,30}$'),
  display_name text CHECK (display_name IS NULL OR length(display_name) <= 50),
  bio          text CHECK (bio IS NULL OR length(bio) <= 280),
  avatar_url   text CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE profiles IS 'Identidade pública 1:1 com auth.users (FR4, FR13).';
COMMENT ON COLUMN profiles.username IS 'Handle público em /@username, lowercase + dígitos + hyphen (FR4).';
```

**Indexes:** UNIQUE em `username` cria índice automático. **Sem índices secundários adicionais.**

**Notes:**

- **Reserved usernames** (admin, api, dashboard, login, etc.) **não** estão em CHECK constraint — validados em camada Server Action (`updateUsername`) com lista hardcoded. Trade-off: maior flexibilidade de update vs DDL change. Lista canônica em `lib/validators/reserved-usernames.ts` (responsabilidade @dev).

---

#### `pages`

**Purpose:** container de configuração da página pública (FR5, FR12).

**Columns:**

| Column       | Type           | Constraints                                                   | Description             |
| ------------ | -------------- | ------------------------------------------------------------- | ----------------------- |
| id           | `uuid`         | PRIMARY KEY, DEFAULT `gen_random_uuid()`                      |                         |
| profile_id   | `uuid`         | NOT NULL, UNIQUE, REFERENCES `profiles(id)` ON DELETE CASCADE | UNIQUE força 1:1 no MVP |
| theme        | `theme_preset` | NOT NULL, DEFAULT `'light'`                                   | FR12                    |
| is_published | `boolean`      | NOT NULL, DEFAULT `true`                                      | FR5                     |
| created_at   | `timestamptz`  | NOT NULL DEFAULT `now()`                                      |                         |
| updated_at   | `timestamptz`  | NOT NULL DEFAULT `now()`                                      |                         |

**Constraints (canônico):**

```sql
CREATE TABLE pages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  theme        theme_preset NOT NULL DEFAULT 'light',
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_pages_set_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE pages IS 'Página pública /@username (1:1 com profile no MVP, FR5, FR12).';
```

**Indexes:** UNIQUE em `profile_id` cria índice automático. **Não precisa de índice extra para FK** porque a UNIQUE já cobre.

**Notes:**

- Phase 2 remove a UNIQUE para suportar múltiplas pages/profile. Migration de quebra: ver §10.

---

#### `links`

**Purpose:** item clicável (FR6, FR7, FR8).

**Columns:**

| Column     | Type          | Constraints                                        | Description                                   |
| ---------- | ------------- | -------------------------------------------------- | --------------------------------------------- |
| id         | `uuid`        | PRIMARY KEY, DEFAULT `gen_random_uuid()`           |                                               |
| page_id    | `uuid`        | NOT NULL, REFERENCES `pages(id)` ON DELETE CASCADE |                                               |
| title      | `text`        | NOT NULL, CHECK length ≤ 100                       | FR6                                           |
| url        | `text`        | NOT NULL, CHECK regex http/https                   | FR6                                           |
| icon       | `text`        | NULL OK                                            | Slug lucide-react (FR6)                       |
| is_visible | `boolean`     | NOT NULL DEFAULT `true`                            | FR8                                           |
| position   | `integer`     | NOT NULL, CHECK ≥ 0                                | FR7 (UNIQUE composta com page_id, deferrable) |
| created_at | `timestamptz` | NOT NULL DEFAULT `now()`                           |                                               |
| updated_at | `timestamptz` | NOT NULL DEFAULT `now()`                           |                                               |

**Constraints (canônico):**

```sql
CREATE TABLE links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  url         text NOT NULL CHECK (url ~* '^https?://'),
  icon        text CHECK (icon IS NULL OR icon ~ '^[a-z0-9-]{1,40}$'),
  is_visible  boolean NOT NULL DEFAULT true,
  position    integer NOT NULL CHECK (position >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_links_page_position
    UNIQUE (page_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER trg_links_set_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE links IS 'Items clicáveis na página pública (FR6, FR7, FR8).';
COMMENT ON COLUMN links.position IS 'Ordem de exibição (UNIQUE per page, DEFERRABLE para reorder atômico).';
```

**Indexes:** definidos em §6 (composto + parcial).

**Notes:**

- `position` permite gaps (não compactado em DELETE) — simplifica delete; ordering client-side ignora gaps.
- `icon` regex valida slug lucide-react sem materializar lista de ícones no DB.

---

#### `click_events`

**Purpose:** append-only log de cliques (FR9).

**Columns:**

| Column          | Type          | Constraints                                        | Description         |
| --------------- | ------------- | -------------------------------------------------- | ------------------- |
| id              | `bigint`      | GENERATED ALWAYS AS IDENTITY, PRIMARY KEY          | bigint > uuid (Q2)  |
| link_id         | `uuid`        | NOT NULL, REFERENCES `links(id)` ON DELETE CASCADE |                     |
| clicked_at      | `timestamptz` | NOT NULL DEFAULT `now()`                           |                     |
| user_agent_hash | `bytea`       | NULL OK                                            | sha256 com salt env |
| ip_hash         | `bytea`       | NULL OK                                            | sha256 com salt env |

**Constraints (canônico):**

```sql
CREATE TABLE click_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id         uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at      timestamptz NOT NULL DEFAULT now(),
  user_agent_hash bytea,
  ip_hash         bytea,
  CONSTRAINT chk_click_events_hash_size
    CHECK (
      (user_agent_hash IS NULL OR octet_length(user_agent_hash) = 32) AND
      (ip_hash         IS NULL OR octet_length(ip_hash)         = 32)
    )
);

COMMENT ON TABLE click_events IS 'Log append-only de cliques (FR9). Retenção 90d via pg_cron (NFR12).';
```

**Indexes:** definidos em §6.

**Notes:**

- Sem `updated_at` — append-only.
- Constraint `chk_click_events_hash_size` valida que hashes têm exatamente 32 bytes (sha256). Defesa contra hash truncado/incorreto.
- **Q2 RESOLVED:** mantém `bigint identity` porque (a) volume pode crescer rápido (>1M rows/ano em sucesso); (b) bigint é 8 bytes vs 16 bytes do uuid → 2× mais compacto em índices; (c) sequence garante append linear (cache-friendly em B-tree); (d) não há necessidade de IDs distribuídos/aleatórios.

---

#### `page_views`

**Purpose:** análogo a `click_events` para views da página (FR10).

**Constraints (canônico):**

```sql
CREATE TABLE page_views (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id         uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  viewed_at       timestamptz NOT NULL DEFAULT now(),
  user_agent_hash bytea,
  ip_hash         bytea,
  CONSTRAINT chk_page_views_hash_size
    CHECK (
      (user_agent_hash IS NULL OR octet_length(user_agent_hash) = 32) AND
      (ip_hash         IS NULL OR octet_length(ip_hash)         = 32)
    )
);

COMMENT ON TABLE page_views IS 'Log append-only de page-views (FR10). Retenção 90d via pg_cron (NFR12).';
```

### Views (Aggregation — Story 4.3)

```sql
CREATE VIEW link_clicks_7d AS
SELECT link_id, date_trunc('day', clicked_at) AS day, count(*)::bigint AS count
FROM click_events
WHERE clicked_at >= now() - interval '7 days'
GROUP BY link_id, date_trunc('day', clicked_at);

CREATE VIEW link_clicks_30d AS
SELECT link_id, date_trunc('day', clicked_at) AS day, count(*)::bigint AS count
FROM click_events
WHERE clicked_at >= now() - interval '30 days'
GROUP BY link_id, date_trunc('day', clicked_at);

CREATE VIEW page_views_7d AS
SELECT page_id, date_trunc('day', viewed_at) AS day, count(*)::bigint AS count
FROM page_views
WHERE viewed_at >= now() - interval '7 days'
GROUP BY page_id, date_trunc('day', viewed_at);

CREATE VIEW page_views_30d AS
SELECT page_id, date_trunc('day', viewed_at) AS day, count(*)::bigint AS count
FROM page_views
WHERE viewed_at >= now() - interval '30 days'
GROUP BY page_id, date_trunc('day', viewed_at);

COMMENT ON VIEW link_clicks_7d IS 'Cliques agregados por dia, últimos 7 dias (FR11). Re-computed on query.';
COMMENT ON VIEW link_clicks_30d IS 'Cliques agregados por dia, últimos 30 dias (FR11).';
COMMENT ON VIEW page_views_7d IS 'Views agregadas por dia, últimos 7 dias (FR11).';
COMMENT ON VIEW page_views_30d IS 'Views agregadas por dia, últimos 30 dias (FR11).';
```

### Materialized Views

**Não usadas no MVP.** Trade-off documentado em `architecture.md` §Data Models: views regulares (sempre fresh, mais caras) suficientes até P95 do dashboard exceder 500ms. Migration para materialized + REFRESH a cada 5min está planejada como fallback.

### Auth Trigger — auto-bootstrap profile + page

```sql
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_username citext := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  v_profile_id uuid;
BEGIN
  IF v_username = '' OR length(v_username) < 3 THEN
    RAISE EXCEPTION 'username missing or too short in raw_user_meta_data: %', v_username;
  END IF;

  INSERT INTO profiles (id, username) VALUES (NEW.id, v_username)
    RETURNING id INTO v_profile_id;

  INSERT INTO pages (profile_id) VALUES (v_profile_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();

COMMENT ON FUNCTION on_auth_user_created() IS
  'Bootstrap profile + page (1:1) ao criar auth.users. SECURITY DEFINER permite INSERT bypass RLS.';
```

> **Hardening aplicado vs ref de Aria:** adicionei `SET search_path = public, pg_catalog` (defesa contra search_path injection em SECURITY DEFINER), guard de username vazio/curto (não permite signup com username inválido), e `lower()` explícito.

---

## 5. Normalization Strategy

### Normalization Level

**Target: 3NF** (terceira forma normal).

**Rationale:**

- Schema é pequeno; benefícios de normalização (integridade, ausência de redundância) >> custos (joins extras).
- 3NF é o ponto natural: não há transitive dependencies (e.g. `links` não armazena `username` redundantemente, busca via JOIN).
- BCNF não muda nada — não há determinantes não-chave.

### Denormalization Decisions

| Campo                                                        | Justificativa                                                    | Trade-off aceito                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `profiles.avatar_url` (URL completa)                         | Evita uma tabela `media` separada para 1 imagem por usuário.     | Migration manual se schema do Storage mudar; aceitável dado escopo.         |
| Sem cache de "click count" em `links.click_count`            | Mantém tabela canônica; aggregations sob demanda via views.      | View regular é re-computed a cada query — OK até P95 > 500ms.               |
| Sem cache de "view count" em `pages.view_count`              | Mesma justificativa.                                             | Idem.                                                                       |
| `username` em `profiles` (não em separate `usernames` table) | Schema mais simples; nenhum requisito de histórico de usernames. | Se Phase 2 introduzir histórico (vanity URLs antigas), demanda nova tabela. |

### Data Redundancy

**Nenhuma redundância intencional no MVP.** Toda derivação é sob demanda (via views).

### Sync Mechanisms

N/A — não há denormalização que precise de sync.

---

## 6. Indexing Strategy

> Detalhamento completo em sibling doc `index-strategy.md` (próximo handoff). Esta seção lista o conjunto canônico.

### Primary Indexes (auto)

| Tabela       | Índice     | Tipo   |
| ------------ | ---------- | ------ |
| profiles     | PK em `id` | B-tree |
| pages        | PK em `id` | B-tree |
| links        | PK em `id` | B-tree |
| click_events | PK em `id` | B-tree |
| page_views   | PK em `id` | B-tree |

### Unique Constraints (auto-create index)

| Tabela   | Constraint                              | Cobertura                                                           |
| -------- | --------------------------------------- | ------------------------------------------------------------------- |
| profiles | UNIQUE `username`                       | AP-5 (uniqueness check) + AP-1 (resolver username)                  |
| pages    | UNIQUE `profile_id`                     | Acesso 1:1 por owner                                                |
| links    | UNIQUE `(page_id, position)` DEFERRABLE | Reorder atomic; **NÃO serve queries — é constraint de integridade** |

### Foreign Key Indexes (manual — postgres não cria auto)

```sql
CREATE INDEX idx_links_page_id          ON links (page_id);                  -- AP-2
CREATE INDEX idx_click_events_link_id   ON click_events (link_id);           -- cascade lookups
CREATE INDEX idx_page_views_page_id     ON page_views (page_id);             -- cascade lookups
```

### Query-Driven Indexes

#### `idx_links_page_id_position_visible` — PARTIAL (Q4 RESOLVED)

```sql
CREATE INDEX idx_links_page_id_position_visible
  ON links (page_id, position)
  WHERE is_visible = true;
```

- **Serve:** AP-1 (public page render — query mais crítica).
- **Tipo:** B-tree composto, parcial (só rows com `is_visible=true`).
- **Estimated impact:** index-only scan possível (covering); reduz I/O em ~50% vs índice completo.
- **Cost:** ~50% do tamanho de índice completo; INSERT/UPDATE sofre 2 índices em vez de 1 (este + `idx_links_page_id`). Aceitável: write rate baixo, read rate alto.

#### `idx_click_events_link_id_clicked_at` — DESC

```sql
CREATE INDEX idx_click_events_link_id_clicked_at
  ON click_events (link_id, clicked_at DESC);
```

- **Serve:** AP-6 (analytics — `WHERE clicked_at >= now() - 7d` filtra range recente).
- **Substitui:** `idx_click_events_link_id` (FK index acima — drop antes de criar este). DECISÃO: **manter ambos não traz benefício**, então o composto substitui o simples (composto serve tanto cascade lookup quanto analytics).

> **Refinamento:** o índice composto `(link_id, clicked_at DESC)` serve queries que filtram por `link_id`, então o `idx_click_events_link_id` standalone é **redundante**. Remover. Versão final dos índices em event tables:

```sql
-- Versão final (não criar idx_click_events_link_id standalone):
CREATE INDEX idx_click_events_link_id_clicked_at
  ON click_events (link_id, clicked_at DESC);

CREATE INDEX idx_page_views_page_id_viewed_at
  ON page_views (page_id, viewed_at DESC);
```

#### BRIN para retention scans (futuro)

Quando volume de event tables passar de 1M rows, considerar:

```sql
-- BRIN ideal para colunas correlacionadas com inserção (clicked_at sempre crescente)
CREATE INDEX idx_click_events_clicked_at_brin
  ON click_events USING brin (clicked_at);
```

**Postergado para Phase 2** — incluir quando criar pg_cron job de retention.

### Composite Indexes Summary

| Índice                                | Tabela       | Colunas                              | Tipo           | Serve          |
| ------------------------------------- | ------------ | ------------------------------------ | -------------- | -------------- |
| `idx_links_page_id_position_visible`  | links        | (page_id, position) WHERE is_visible | B-tree partial | AP-1           |
| `idx_links_page_id`                   | links        | (page_id)                            | B-tree         | AP-2           |
| `idx_click_events_link_id_clicked_at` | click_events | (link_id, clicked_at DESC)           | B-tree         | AP-6 + cascade |
| `idx_page_views_page_id_viewed_at`    | page_views   | (page_id, viewed_at DESC)            | B-tree         | AP-6 + cascade |

### Full-Text Search Indexes

**N/A no MVP.** Não há busca textual; `username` é exact-match.

### Index Maintenance

- **Monitoring:** queries em `pg_stat_user_indexes` mensalmente; identificar índices `idx_scan = 0` para drop.
- **Reindex:** Postgres autovacuum + autoanalyze são suficientes no volume MVP. REINDEX manual só em caso de bloat detectado via `pgstattuple`.
- **Unused index detection:** `aiox doctor` ou query `pg_stat_user_indexes WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey'`.

---

## 7. Constraints & Data Integrity

### Primary Keys

| Tabela       | Tipo                         | Rationale                                                                            |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------ |
| profiles     | uuid (espelha auth.users.id) | Não-conflito com auth, gerado pelo Supabase Auth                                     |
| pages        | uuid (gen_random_uuid)       | Não-sequencial (segurança em URLs futuras /api/pages/{id})                           |
| links        | uuid (gen_random_uuid)       | Idem; também: cliente envia ID na reordenação                                        |
| click_events | bigint identity              | Append-only de alta volumetria; performance > não-sequencialidade (eventos privados) |
| page_views   | bigint identity              | Idem                                                                                 |

### Foreign Keys

Todas FKs usam `ON DELETE CASCADE` exceto onde vem de `auth.users` (também CASCADE). Justificativa: em todos os casos, child sem parent é dado órfão sem significado (link sem page, evento sem link, etc.).

```sql
profiles.id      → auth.users.id  ON DELETE CASCADE
pages.profile_id → profiles.id    ON DELETE CASCADE
links.page_id    → pages.id       ON DELETE CASCADE
click_events.link_id → links.id   ON DELETE CASCADE
page_views.page_id   → pages.id   ON DELETE CASCADE
```

`ON UPDATE` é sempre `NO ACTION` (default) — PKs são imutáveis (uuid e bigint identity).

### Unique Constraints

| Tabela   | Constraint                   | Tipo                          | Significado                    |
| -------- | ---------------------------- | ----------------------------- | ------------------------------ |
| profiles | UNIQUE `username`            | citext (case-insensitive)     | Handle único globalmente (FR4) |
| pages    | UNIQUE `profile_id`          | strict                        | Força 1:1 no MVP               |
| links    | UNIQUE `(page_id, position)` | DEFERRABLE INITIALLY DEFERRED | Reorder atômico (Q1)           |

### Check Constraints

| Tabela       | Constraint                        | Origem                                              |
| ------------ | --------------------------------- | --------------------------------------------------- |
| profiles     | `username ~ '^[a-z0-9-]{3,30}$'`  | FR4 (handle válido)                                 |
| profiles     | `length(display_name) <= 50`      | FR13                                                |
| profiles     | `length(bio) <= 280`              | FR13                                                |
| profiles     | `avatar_url ~* '^https?://'`      | XSS-defense                                         |
| links        | `length(title) BETWEEN 1 AND 100` | FR6                                                 |
| links        | `url ~* '^https?://'`             | FR6 + XSS-defense (bloqueia `javascript:`, `data:`) |
| links        | `icon ~ '^[a-z0-9-]{1,40}$'`      | FR6 (slug lucide-react)                             |
| links        | `position >= 0`                   | Sanity                                              |
| click_events | hash size = 32 bytes (sha256)     | Integridade do hash                                 |
| page_views   | hash size = 32 bytes (sha256)     | Integridade do hash                                 |

### Not Null Constraints

| Tabela       | Coluna                           | Por quê                                                  |
| ------------ | -------------------------------- | -------------------------------------------------------- |
| Todas        | PK                               | Sempre                                                   |
| Todas        | FK                               | Não permitimos rows órfãs (CASCADE garante consistência) |
| Todas        | created_at, updated_at           | Audit obrigatório                                        |
| profiles     | username                         | Identidade pública requerida                             |
| pages        | theme, is_published              | Defaults garantem comportamento previsível               |
| links        | title, url, is_visible, position | Card vazio é unusable                                    |
| click_events | clicked_at, link_id              | Evento precisa de timestamp + alvo                       |
| page_views   | viewed_at, page_id               | Idem                                                     |

`display_name`, `bio`, `avatar_url`, `links.icon`, `*_hash` são **opcionais** (NULL OK).

### Default Values

| Coluna                                  | Default                        | Rationale                |
| --------------------------------------- | ------------------------------ | ------------------------ |
| `*_at` (created/updated/clicked/viewed) | `now()`                        | Audit automático         |
| `pages.theme`                           | `'light'`                      | UX padrão acessível      |
| `pages.is_published`                    | `true`                         | Page nasce visível (FR5) |
| `links.is_visible`                      | `true`                         | Link nasce visível (FR8) |
| `pages.id`, `links.id`                  | `gen_random_uuid()`            | PK auto                  |
| `click_events.id`, `page_views.id`      | `GENERATED ALWAYS AS IDENTITY` | bigint sequence          |

### Q1 RESOLVED — Reorder estratégia final

**Decisão:** `UNIQUE (page_id, position) DEFERRABLE INITIALLY DEFERRED` + **leave gaps on delete** (não compactar).

**Como funciona o reorder atômico:**

```sql
BEGIN;
  -- Server Action recebe orderedIds: [id3, id1, id2]
  -- Update todas as positions na ordem nova; uniqueness check é DEFERRED
  UPDATE links SET position = 0 WHERE id = 'id3' AND page_id = 'X';
  UPDATE links SET position = 1 WHERE id = 'id1' AND page_id = 'X';
  UPDATE links SET position = 2 WHERE id = 'id2' AND page_id = 'X';
COMMIT; -- aqui o constraint UNIQUE é finalmente avaliado
```

**Por que NÃO usar trigger shift-on-delete:**

- Trigger seria mais complexa (lock contention em alta concorrência);
- Compactar positions não traz benefício funcional — client ordena por position ASC e ignora gaps;
- Gaps eventualmente "normalizados" se usuário reorderar manualmente.

**Por que NÃO usar fractional indexing (1.5 entre 1 e 2):**

- Adiciona necessidade de rebalanceamento periódico (lexicographic exhaustion);
- Tipo `numeric` é mais caro que `integer`;
- DEFERRABLE solve o caso real (reorder em batch) sem essa complexidade.

---

## 8. Security Architecture

### Authentication

| Item               | Mecanismo                                                            |
| ------------------ | -------------------------------------------------------------------- |
| Identificação      | Supabase Auth (`auth.users`); email/password (PRD §Funcionais — FR1) |
| Session management | JWT em cookie HTTP-only (Supabase SSR helpers)                       |
| Token storage      | `@supabase/ssr` gerencia cookies; nunca em localStorage              |
| Password reset     | Supabase Auth flow (FR1 — `requestPasswordReset` Server Action)      |

### Authorization Model

**RLS-First** (NFR1 + arch.md §Architectural Patterns).

- **Sem RBAC application-level** — todo acesso é mediado por policies em PostgreSQL.
- **Roles:**
  - `anon` (cliente Supabase sem sessão) — acesso somente a SELECT de dados públicos (`is_published=true`, `is_visible=true`).
  - `authenticated` (cliente com JWT) — acesso baseado em `auth.uid() = profile_id` (ou via JOIN para tabelas filhas).
  - `service_role` (server-only key) — bypass de RLS para INSERT em `click_events`, `page_views`, e operações administrativas (export, delete account).
- **Policies completas:** ver `docs/architecture/rls-policies.md` (sibling doc — próximo handoff de @data-engineer).

#### RLS High-Level Strategy (resumo)

| Tabela         | SELECT                                    | INSERT                | UPDATE                    | DELETE                            |
| -------------- | ----------------------------------------- | --------------------- | ------------------------- | --------------------------------- |
| `profiles`     | `true` (público)                          | trigger only          | `auth.uid() = id`         | trigger only (cascade auth.users) |
| `pages`        | `is_published OR profile_id = auth.uid()` | trigger only          | `profile_id = auth.uid()` | cascade                           |
| `links`        | composite (ver §Database Schema arch.md)  | `page owner via JOIN` | `page owner via JOIN`     | `page owner via JOIN`             |
| `click_events` | own (via JOIN para link→page→profile)     | `service_role` only   | DENIED                    | DENIED                            |
| `page_views`   | own (via JOIN para page→profile)          | `service_role` only   | DENIED                    | DENIED                            |

> **Detalhamento e SQL canônico:** `docs/architecture/rls-policies.md`.

### Sensitive Data

| Dado                     | Classificação              | Tratamento                                                       |
| ------------------------ | -------------------------- | ---------------------------------------------------------------- |
| Email (auth.users.email) | PII                        | Gerenciado por Supabase Auth (não em `public.profiles`)          |
| Password                 | PII (sensível)             | Hash bcrypt em `auth.users.encrypted_password` (Supabase)        |
| `bio`, `display_name`    | Public-by-design           | Sem ofuscação                                                    |
| IP do visitante          | PII (LGPD)                 | Hash SHA-256 com salt env (`HASH_SALT`); armazenado como `bytea` |
| User-agent               | Quasi-PII (fingerprinting) | Mesmo tratamento                                                 |
| `avatar_url`             | Public                     | URL Supabase Storage; bucket `avatars` com RLS própria           |

**Encryption at-rest:** AES-256 nativo do Supabase (gerenciado, sem ação no schema).

**Encryption in-transit:** `sslmode=require` em todas as conexões (NFR1).

**Hashing for passwords:** bcrypt (Supabase Auth — não responsabilidade do schema).

**Data masking for non-production:** Supabase Branching cria branch efêmero por PR; dados sintéticos via `seed.sql`. **Nunca** copiar dados de produção para preview.

### Audit Logging

**MVP:** apenas `created_at` + `updated_at` em todas as tabelas user-data.

**Phase 2 (postergado):** tabela `audit_log` (event sourcing leve) com triggers em UPDATE/DELETE de `profiles`, `pages`, `links`. Retenção: 1 ano. Não decidido para MVP — `architecture.md` §NFRs não impõe auditing detalhado.

### Compliance

| Regulação | Aplicabilidade               | Mecanismo                                                                                                     |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| LGPD      | Aplicável (público lusófono) | (a) PII hashada; (b) FR `exportAccountData` (right to portability); (c) FR `deleteAccount` (right to erasure) |
| GDPR      | Aplicável se usuários EU     | Mesmos mecanismos da LGPD                                                                                     |
| HIPAA     | N/A                          | Não há PHI                                                                                                    |

**Anonimização:** Server Action `deleteAccount()` faz `DELETE FROM auth.users WHERE id = $1` → CASCADE remove tudo. Eventos são deletados junto (CASCADE via `links.page_id`/`page_views.page_id`). Hash de IP/UA já era pseudonimizado, então nenhuma re-identificação possível pós-DELETE.

---

## 9. Supabase-Specific Configuration

> Condition: `using_supabase = true` ✅

### RLS Policies

Resumo em §8. SQL canônico em `docs/architecture/rls-policies.md` (próximo handoff).

**Performance considerations das policies:**

- Policies que fazem `EXISTS (SELECT 1 FROM pages WHERE ...)` são reavaliadas por linha em scans amplos. Mitigation: índices em colunas de filtro (`profile_id`, `page_id`).
- `auth.uid()` é uma função STABLE em Supabase — postgres pode cachear o valor por linha.

### Realtime Configuration

**Não usado no MVP.** `architecture.md` §Tech Stack não inclui Realtime.

Caso necessário no Phase 2 (e.g. live notifications de cliques):

```sql
-- Habilitar Realtime em tabela específica:
ALTER PUBLICATION supabase_realtime ADD TABLE click_events;
```

Mas atenção: Realtime + RLS em tabela append-only de alta volumetria pode ser custoso. Usar com cautela.

### Edge Functions

**Não usadas no MVP.** Tracking endpoints são Route Handlers Next.js (`/api/track/click`, `/api/track/view`) — `architecture.md` §API Specification.

**Database triggers que chamam Edge Functions:** nenhum.

### Storage Integration

**Bucket único:** `avatars`.

```sql
-- Estrutura (conceitual; configurado via Supabase Dashboard ou migration):
-- bucket: avatars
-- public: false (URLs são signed)
-- file_size_limit: 1 MB (FR13)
-- allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']

-- RLS no bucket (storage.objects):
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Path convention:** `avatars/{auth.uid()}/{filename}.{ext}`.

**Relacionamento com `profiles.avatar_url`:** o app armazena a URL completa (signed URL ou public URL) — não FK estrita. Se o objeto é deletado no Storage, `avatar_url` aponta para 404; UI precisa fallback (avatar default). Trade-off: simplicidade > integridade rígida.

### Auth Integration

| Aspecto                   | Decisão                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `auth.users` ↔ `profiles` | 1:1 via `profiles.id = auth.users.id` (FK)                                                              |
| Bootstrap                 | Trigger `auth_user_created` cria `profile` + `page` automaticamente                                     |
| User metadata storage     | `username` enviado em `signUp` via `options.data` → `raw_user_meta_data->>'username'` lido pelo trigger |
| Multi-tenancy             | **Não aplicável** — single-tenant SaaS público                                                          |
| OAuth providers           | **Não no MVP** — apenas email/password (FR1)                                                            |

---

## 10. Migration & Evolution Strategy

### Initial Migration

**Arquivo:** `supabase/migrations/20260507120000_init.sql` (timestamp UTC do criador, padrão Supabase CLI).

**Organização (ordem de criação dentro do arquivo):**

1. Extensions (`citext`, `pgcrypto`)
2. Custom types (`theme_preset`)
3. Utility functions (`set_updated_at`, `hash_pii`)
4. Tables na ordem de dependência:
   1. `profiles` (depende de `auth.users` que sempre existe)
   2. `pages` (depende de `profiles`)
   3. `links` (depende de `pages`)
   4. `click_events` (depende de `links`)
   5. `page_views` (depende de `pages`)
5. Indexes (depois de todas as tables)
6. Views (depende de tables)
7. Trigger functions (`on_auth_user_created`)
8. Triggers (set_updated_at em cada table; auth_user_created em `auth.users`)
9. ALTER TABLE ... ENABLE ROW LEVEL SECURITY (5 tables)
10. RLS policies (separate migration `20260507130000_rls_policies.sql` para isolamento)

### Seed Data

**Arquivo:** `supabase/seed.sql`.

```sql
-- Seed mínimo para desenvolvimento + Supabase Branching CI
-- 1. Cria 2 users via auth.admin (apenas em ambientes não-prod)
-- 2. Trigger auto-cria profiles + pages
-- 3. Insere ~5 links em cada page
-- 4. Insere 50-100 click_events e page_views fake (uso em dashboard analytics)

-- Nota: seed.sql NÃO é aplicado em produção.
```

### Change Management

**Naming convention:** `YYYYMMDDHHMMSS_descriptive_snake_case.sql` (Supabase CLI default).

**Up/Down migrations:**

- **Up:** todas as migrations em `supabase/migrations/`.
- **Down:** **não é nativo no Supabase CLI**. Estratégia:
  - Cada migration tem rollback companion em `supabase/rollbacks/YYYYMMDDHHMMSS_NAME_rollback.sql`.
  - Rollback testado em Supabase Branch antes de aplicar em prod.
  - **Snapshot obrigatório antes de cada migration prod** (`*snapshot {label}` task).

**Testing strategy:**

1. Aplicar migration em Supabase Branch (CI por PR).
2. Rodar smoke tests: `*smoke-test {version}`.
3. Validar RLS positiva/negativa (CI).
4. Merge → migration aplicada em prod via Supabase CLI deploy.

### Versioning

**Schema version tracking:** automático via Supabase CLI (`supabase_migrations.schema_migrations`).

**Migration tool:** Supabase CLI (`supabase migration new`, `supabase db push`).

### Backward Compatibility

**Princípio:** **zero-downtime migrations** sempre que possível.

**Padrão "expand-contract" para changes breaking:**

| Tipo de mudança                                             | Estratégia                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Adicionar coluna NOT NULL                                   | (1) ADD nullable; (2) backfill; (3) ALTER NOT NULL                                                       |
| Renomear coluna                                             | (1) ADD coluna nova; (2) backfill + sync via trigger; (3) deprecate antiga; (4) DROP em release seguinte |
| Mudar tipo                                                  | Same as rename                                                                                           |
| Remover UNIQUE em `pages.profile_id` (Phase 2 — multi-page) | (1) DROP UNIQUE; (2) ADD `is_default` boolean; (3) ADD UNIQUE `(profile_id) WHERE is_default = true`     |

### Rollback Strategy

**Quando rollback é seguro:**

- Mudanças DDL aditivas (ADD COLUMN, ADD INDEX): rollback trivial via DROP.
- Mudanças idempotentes (e.g. CREATE INDEX IF NOT EXISTS): rollback é DROP IF EXISTS.

**Quando rollback é arriscado / data loss:**

- DROP COLUMN: dados perdidos. Mitigation: snapshot pré-migration.
- DROP TABLE: idem.
- ALTER TYPE com perda (e.g. shrink varchar): mitigation = snapshot.

**Plano de contingência:**

1. **Snapshot automático antes de toda migration prod.**
2. Smoke test em Supabase Branch primeiro.
3. Se prod falha: rollback via script companion + restore snapshot.
4. Notificar @devops e abrir post-mortem.

---

## 11. Performance Optimization

### Query Optimization

**Identified expensive queries:**

| Query                     | Origem  | Otimização                                                                                   |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| AP-1 (public page render) | FR5/6/8 | Partial index `idx_links_page_id_position_visible`; possível covering futuro                 |
| AP-6 (analytics)          | FR11    | Composite indexes `(link_id, clicked_at DESC)`, `(page_id, viewed_at DESC)`; views agregadas |
| Reorder transaction       | FR7     | Constraint DEFERRABLE evita swap-via-temp                                                    |

**Execution plan analysis approach:**

- `EXPLAIN (ANALYZE, BUFFERS)` em cada AP em CI (Supabase Branching).
- Threshold: alertar se Seq Scan em tabela > 10k rows; alertar se P95 > NFR target.
- Ferramenta: `*explain {sql}` task de @data-engineer.

### Connection Pooling

| Modo                                        | Quando usar                                                         |
| ------------------------------------------- | ------------------------------------------------------------------- |
| **Transaction Mode** (`*.supabase.co:6543`) | Server Actions (request-scoped, conexão devolvida ao pool ao final) |
| **Session Mode**                            | Apenas migrations (precisa de session-level state)                  |

Pool size: free tier Supabase = 60 conexões max. Server Actions são curtas (<200ms), pool 60 sustenta ~20 req/s sem espera (modelo conservador).

### Caching Strategy

**Database-level caching:** Postgres shared_buffers (gerenciado, free tier ~256 MB).

**Application-level caching:** **Next.js `unstable_cache` + `revalidatePath`** — gerenciado em camada app, fora do schema.

| Cache                     | Layer                  | TTL                                                                  |
| ------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Public page data (RSC)    | Next.js fetch cache    | revalidate on `revalidatePath('/[username]')` triggered por mutation |
| Analytics dashboard       | Server Component cache | revalidate on `revalidatePath('/dashboard/analytics')` ou tag-based  |
| Username uniqueness check | client debounce        | request-time                                                         |

**Cache invalidation:** **revalidatePath** após cada mutation que afeta a public page.

### Partitioning

**Não no MVP.** Threshold definido em §12.

### Read Replicas

**Não disponível no Supabase free tier.** Postergado.

### Monitoring

| Métrica                    | Source                                    | Alert threshold          |
| -------------------------- | ----------------------------------------- | ------------------------ |
| Slow queries (>500ms)      | `pg_stat_statements` (Supabase Dashboard) | > 5/min                  |
| Connection pool saturation | Supabase Dashboard                        | > 80%                    |
| Storage usage              | Supabase Dashboard                        | > 80% (400 MB de 500 MB) |
| Index usage                | `pg_stat_user_indexes`                    | mensal review            |
| RLS policy hits            | (não há instrumentação nativa)            | qualitative via tests    |

**Performance baselines:**

- AP-1: P95 < 100ms (medido em CI smoke test).
- AP-6: P95 < 500ms (medido em CI smoke test).
- INSERT events: P95 < 50ms.

---

## 12. Scalability & Growth

### Vertical Scaling

| Plano          | Capacity                                   | Trigger to upgrade                        |
| -------------- | ------------------------------------------ | ----------------------------------------- |
| Free tier      | 500 MB DB, 1 GB transfer/mês, 50K MAU Auth | DB > 400 MB OR MAU > 40K OR pool saturado |
| Pro ($25/mo)   | 8 GB DB, 250 GB transfer, 100K MAU         | quando livre estoura                      |
| Team ($599/mo) | configurável                               | quando Pro estoura                        |

**Limit antes de scale vertical (free tier baseline):**

- DB size: ~500 ativos × ~10k links + 90d × ~5M eventos/mês = ~500 MB (chegou no teto).
- Compute: free tier dá 1 vCPU shared; saturação a partir de ~10 req/s sustentada em queries não-trivialmente cachadas.

### Horizontal Scaling

**Sharding:** **N/A no MVP** (escopo single-tenant SaaS pequeno).

Em Phase 3+ (hipotético, > 100k usuários):

- Sharding por `profile_id` (consistent hashing).
- Cross-shard queries: views agregadas por sharder externo (ClickHouse, Timescale).

### Data Archival

**Q3 RESOLVED — retention via `pg_cron`:**

```sql
-- Phase 2 — habilitar pg_cron via Supabase Dashboard ou:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job diário (02:00 UTC = 23:00 sa-east-1):
SELECT cron.schedule(
  'cleanup_old_events',
  '0 2 * * *',
  $$
    DELETE FROM click_events WHERE clicked_at < now() - interval '90 days';
    DELETE FROM page_views   WHERE viewed_at  < now() - interval '90 days';
  $$
);

COMMENT ON EXTENSION pg_cron IS 'NFR12 — retention 90d em event tables.';
```

**Trade-offs:**

- DELETE em massa (~M rows) lockou bem? **Sim, OK** em DELETE batched + autovacuum.
- BRIN index em `clicked_at` acelera o WHERE do DELETE.
- Aletrnativa: monthly partitioning + DROP PARTITION (O(1)) — implementar quando event table > 10M rows (Q3 threshold).

**Histórico para análise long-term:** N/A no MVP. Phase 2 pode adicionar materialização para `link_clicks_yearly` antes do retention DELETE.

**Archive storage:** N/A no MVP. Phase 3 hipotético: dump JSON para S3-compatible (e.g. Cloudflare R2).

### Growth Projections

(Re-listado de §1 para conveniência.)

| Horizonte    | Users    | DB size estimado | Action                            |
| ------------ | -------- | ---------------- | --------------------------------- |
| MVP (0-3 mo) | 5-100    | < 50 MB          | nenhuma                           |
| 3-6 mo       | 50-300   | 50-300 MB        | monitorar                         |
| 6-12 mo      | 100-1000 | 300 MB-2 GB      | upgrade Pro tier; considerar BRIN |
| > 12 mo      | > 1000   | > 2 GB           | partitioning event tables         |

---

## 13. Testing & Validation

### Unit Tests

| Target                           | Tooling | Cobertura                                                    |
| -------------------------------- | ------- | ------------------------------------------------------------ |
| `set_updated_at()` trigger       | pgTAP   | UPDATE deve setar `updated_at`                               |
| `on_auth_user_created()` trigger | pgTAP   | INSERT em auth.users cria profile + page; falha sem username |
| `hash_pii()` function            | pgTAP   | mesmo input → mesmo output; salt missing → erro              |
| Constraint validations           | pgTAP   | cada CHECK rejeita input inválido                            |

### Integration Tests

| Target                           | Tooling                                                 |
| -------------------------------- | ------------------------------------------------------- |
| RLS policies (positivo/negativo) | Vitest + `@supabase/supabase-js` contra Supabase Branch |
| Server Actions end-to-end        | Vitest                                                  |
| Reorder transaction (DEFERRABLE) | pgTAP em transação                                      |
| Cascade deletes                  | pgTAP — DELETE auth.users deve cascatear                |
| Concurrency (UNIQUE position)    | Vitest paralelo (10 reorders simultâneos)               |

### Load Testing

**MVP:** smoke test com k6 em Supabase Branch:

- 50 RPS sustained em AP-1 (public page render) por 60s.
- 100 RPS burst em AP-3/AP-4 (event tracking) por 30s.

**Sucesso:** todos abaixo dos thresholds NFR.

### Data Validation

| Check                                           | Frequência                |
| ----------------------------------------------- | ------------------------- |
| FK orphans (não devem existir; CASCADE garante) | weekly via `aiox doctor`  |
| Constraint violations                           | continuous via PG         |
| Hash size = 32 bytes                            | enforced via CHECK        |
| Index bloat                                     | monthly via `pgstattuple` |

---

## 14. Implementation Plan

### Phase 1: Core Schema (Story 1.4 — `0001_init.sql`)

**Order of creation:**

1. Extensions
2. Types
3. Utility functions (`set_updated_at`, `hash_pii`)
4. Tables (5 — em ordem de dependência)
5. Indexes (FK + query-driven + partial)
6. Views (4 aggregation views)
7. Trigger functions (`on_auth_user_created`)
8. Triggers (`set_updated_at` × 3 tables com updated_at; `auth_user_created` × 1)

**Dependencies:**

- `auth.users` (Supabase Auth, sempre presente).
- Sem dependências externas.

**Estimated timeline:** 1-2 horas para escrever migration + 1h para revisar (Story 1.4 capacity 4-6h).

### Phase 2: Security & RLS (Story 1.5 — `0002_rls_policies.sql`)

- ALTER TABLE ENABLE ROW LEVEL SECURITY (5 tables)
- CREATE POLICY (canonical SQL em `rls-policies.md`).
- Testes positivos/negativos em Supabase Branch CI.

**Estimated timeline:** 2-3 horas (story dedicada).

### Phase 3: Data Operations & Seed (Story 1.6)

- `seed.sql` para Supabase Branching.
- Smoke tests (`smoke-test.sql`).

### Phase 4: Analytics Aggregation Views (Story 4.3)

- Views já criadas em Phase 1; story 4.3 apenas valida P95 do dashboard.
- Considerar materialização se P95 > 500ms.

### Phase 5: Retention (post-MVP)

- Habilitar `pg_cron` extension.
- Schedular cleanup job.
- BRIN index em `clicked_at` / `viewed_at`.

### Rollout

| Step                                  | Validation                         | Rollback if           |
| ------------------------------------- | ---------------------------------- | --------------------- |
| 1. Apply migration to Supabase Branch | smoke tests pass                   | smoke fails           |
| 2. Run integration tests in CI        | RLS positive/negative tests pass   | tests fail            |
| 3. Snapshot prod                      | snapshot saved with label          | —                     |
| 4. Apply migration to prod            | EXPLAIN of AP-1/AP-6 within target | latency regress > 50% |
| 5. Monitor 24h                        | error rate < baseline              | error spike           |
| 6. Announce ready in #devops          | —                                  | —                     |

---

## 15. Appendix

### SQL Scripts

| Arquivo                                               | Conteúdo                                   | Status    |
| ----------------------------------------------------- | ------------------------------------------ | --------- |
| `supabase/migrations/20260507120000_init.sql`         | Phase 1 (schema, indexes, views, triggers) | Story 1.4 |
| `supabase/migrations/20260507130000_rls_policies.sql` | Phase 2 (RLS policies)                     | Story 1.5 |
| `supabase/seed.sql`                                   | Dados de seed para CI                      | Story 1.6 |
| `supabase/rollbacks/20260507120000_init_rollback.sql` | Rollback da Phase 1                        | Story 1.4 |
| `supabase/tests/rls-positive.sql`, `rls-negative.sql` | Testes pgTAP                               | Story 1.5 |

### ER Diagram

Inline em §2 (Mermaid). Render via Markdown viewer compatível ou GitHub.

### Glossary

| Termo                     | Definição                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **AP**                    | Access Pattern — uma forma canônica de queryar/escrever no schema                               |
| **BRIN**                  | Block Range Index — índice eficiente para colunas correlacionadas com inserção (e.g. timestamp) |
| **citext**                | Case-insensitive text — extensão Postgres                                                       |
| **DEFERRABLE constraint** | Constraint cujo check é postergado até COMMIT                                                   |
| **MVP**                   | Minimum Viable Product — escopo de PRD §Objetivos                                               |
| **NFR**                   | Non-Functional Requirement (PRD §NFRs)                                                          |
| **PII**                   | Personally Identifiable Information (LGPD/GDPR)                                                 |
| **RLS**                   | Row-Level Security — policies SQL que filtram rows por usuário                                  |

### References

| Doc                      | Owner          | Link                                                     |
| ------------------------ | -------------- | -------------------------------------------------------- |
| Project Brief v1         | @analyst       | `docs/brief.md`                                          |
| PRD v0.3                 | @pm            | `docs/prd.md`                                            |
| Architecture v0.2        | @architect     | `docs/architecture.md`                                   |
| RLS Policies (sibling)   | @data-engineer | `docs/architecture/rls-policies.md` (próximo handoff)    |
| Index Strategy (sibling) | @data-engineer | `docs/architecture/index-strategy.md` (próximo handoff)  |
| Migration Plan (sibling) | @data-engineer | `docs/architecture/migration-plan.md` (próximo handoff)  |
| Database Best Practices  | @data-engineer | `.aiox-core/development/data/database-best-practices.md` |
| Supabase Patterns        | @data-engineer | `.aiox-core/development/data/supabase-patterns.md`       |

### Decisões e ADRs (resumo das decisões deste documento)

| ADR-ish            | Decisão                                                                 | Status    | Alternativas rejeitadas                                                      |
| ------------------ | ----------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| Q1                 | UNIQUE DEFERRABLE em `(page_id, position)` + leave gaps on delete       | ✅ aceita | Trigger shift-on-delete (complexa); fractional indexing (rebalance overhead) |
| Q2                 | `bigint identity` em event tables                                       | ✅ aceita | uuid (16B vs 8B; sequential better cache)                                    |
| Q3                 | Retention via `pg_cron` DELETE; partitioning quando > 10M rows          | ✅ aceita | Partitioning desde MVP (premature)                                           |
| Q4                 | Partial index `(page_id, position) WHERE is_visible = true`             | ✅ aceita | Apenas índice completo (~2× storage; sem benefício extra)                    |
| Hash strategy      | Hash primário no app layer (TS); `hash_pii()` SQL como defensive helper | ✅ aceita | Hash em DB-only (acopla salt à infra)                                        |
| Reserved usernames | App-layer validation (lista hardcoded em TS)                            | ✅ aceita | CHECK constraint (rígido, hard de update)                                    |

---

**End of document.**
