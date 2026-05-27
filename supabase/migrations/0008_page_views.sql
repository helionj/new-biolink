-- =============================================================================
-- Migration: 0008_page_views.sql
-- Story:     4.2 — Schema e Tracking de Page Views
-- Author:    @data-engineer (Dara)
-- Date:      2026-05-26
-- Refs:      docs/architecture/schema-design.md §4 #page_views (linhas 598-619),
--            §6 Indexing (linhas 789-812), §8 RLS (linhas 997-1000)
--            docs/architecture.md §Database Schema (linhas 896-905),
--            §RLS (linhas 997-1000)
--
-- Purpose:   Quinto DDL de domínio (2ª tabela append-only). Cria:
--            - Table page_views (N:1 com pages, FR10; PII hashada para LGPD)
--            - 1 índice composto: idx_page_views_page_id_viewed_at (serve
--              cascade lookups + AP-6 analytics + dedup window query — §6 L789)
--            - Check constraint chk_page_views_hash_size (32 bytes = sha-256)
--            - 1 RLS policy: page_views_select_own (JOIN 1-hop page → profile)
--            - SEM policy INSERT/UPDATE/DELETE (AC4 análogo a 4.1):
--              RLS habilitado + ausência-de-policy = acesso negado para
--              anon/authenticated; service-role bypassa RLS para insert
--              legítimo no Route Handler /api/track/view (Task 5) e em
--              lib/track.ts insertPageView (Task 4)
--
-- Scope:     Apenas page_views + 1 índice + 1 RLS policy. Extensions
--            (citext/pgcrypto), set_updated_at(), profiles, pages, links,
--            click_events e o trigger on_auth_user_created/auth_user_created
--            pertencem a 0002/0003/0004/0007 (REUSE, NÃO recriados aqui).
--            page_views NÃO é bootstrapado no signup nem seedado — é log
--            append-only de telemetria, populado via /api/track/view
--            (Story 4.2 Route Handler, Task 5) e via lib/track.ts
--            insertPageView (Task 4 — também usável como fallback RSC).
--
--            hash_pii() Postgres (schema-design.md §4 L385-411) NÃO é criada
--            — hash primário acontece no Route Handler Next.js (TS, com salt
--            do env); função defensiva ficaria sobrando neste momento (DEV-5
--            herdado de 4.1 DEV-3). Retenção 90d (NFR12) via pg_cron é Phase 2
--            (§6 L803).
--
-- Naming:    Convenção real do repo `000N_*.sql` (NÃO o YYYYMMDDHHMMSS de
--            schema-design.md §10 — drift doc↔repo documentado, DEV-1; sequência
--            0001→…→0007→0008 é determinística).
--
-- Rollback:  supabase/rollbacks/0008_page_views_rollback.sql
--            (DEVE rodar ANTES do rollback de 0003 — page_views tem FK pages(id);
--             independente do rollback de 0007 — sem cross-FK entre page_views
--             e click_events).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: page_views
-- -----------------------------------------------------------------------------
-- Log append-only de page-views (FR10). PII (IP, user-agent) hashada para
-- LGPD-mindfulness. DDL canônico verbatim de schema-design.md §4 #page_views
-- (linhas 605-616) — NÃO o de architecture.md §Database Schema (mais frouxo,
-- sem chk_page_views_hash_size).
--
-- Constraints:
--   - id:              bigint identity (coerente com click_events §4 Q2 L594)
--                      — append-only com volume potencial >1M rows/ano justifica
--                      bigint vs uuid (2× mais compacto em índice; sequence
--                      cache-friendly em B-tree). Divergência intencional vs
--                      profiles/pages/links (todos uuid).
--   - page_id:         NOT NULL FK pages(id) ON DELETE CASCADE (cascade chain:
--                      auth.users → profiles → pages → page_views)
--   - viewed_at:       timestamptz NOT NULL DEFAULT now()
--   - user_agent_hash: bytea (NULL OK) — sha256 com salt env (HASH_SALT)
--   - ip_hash:         bytea (NULL OK) — idem
--   - chk_page_views_hash_size: defende contra hash truncado/incorreto
--                      (32 bytes = output canônico sha-256)
--
-- Sem updated_at, sem trigger set_updated_at — tabela append-only (§4 análogo
-- a click_events L592). Events nunca são editados; única mutação é DELETE via
-- retenção (Phase 2).
CREATE TABLE IF NOT EXISTS page_views (
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

COMMENT ON TABLE  page_views                 IS 'Log append-only de page-views (FR10). Retenção 90d via pg_cron (NFR12).';
COMMENT ON COLUMN page_views.id              IS 'PK bigint identity — append-only com volume potencial alto (coerente com click_events).';
COMMENT ON COLUMN page_views.page_id         IS 'FK pages(id) ON DELETE CASCADE — views somem quando page some.';
COMMENT ON COLUMN page_views.viewed_at       IS 'Timestamp da view (server-side via DEFAULT now()).';
COMMENT ON COLUMN page_views.user_agent_hash IS 'sha256(user-agent || HASH_SALT). 32 bytes (chk_page_views_hash_size). NULL OK.';
COMMENT ON COLUMN page_views.ip_hash         IS 'sha256(ip || HASH_SALT). 32 bytes (chk_page_views_hash_size). NULL OK. Chave de dedup window 30min (lib/track.ts insertPageView, AC3).';

-- -----------------------------------------------------------------------------
-- 2. Índice (schema-design.md §6 linhas 789-790 — espelha decisão de 4.1)
-- -----------------------------------------------------------------------------
-- 1 índice composto serve TRÊS queries:
--   (a) cascade lookups (FK lookup quando page é deletada)
--   (b) AP-6 analytics (WHERE page_id = $1 AND viewed_at >= now() - interval '7 days')
--       — habilita aggregation views da Story 4.3 (page_views_7d/30d)
--   (c) dedup window check (WHERE page_id = $1 AND ip_hash = $2 AND
--       viewed_at >= now() - interval '30 minutes' LIMIT 1) — Task 4.3, AC3
--       Predicado filtra por page_id (1ª coluna do índice) → seek O(log n) +
--       re-filtragem em memória pelo ip_hash (não-leading). Índice secundário
--       em (page_id, ip_hash) postergado para Phase 2 só se EXPLAIN ANALYZE
--       em prod mostrar custo prático >5ms (NFR4 budget 50ms dá folga 10×).
--
-- Manter idx_page_views_page_id standalone seria redundante (§6 L782 — composto
-- serve queries que filtram por page_id, principio herdado de 4.1).
--
-- BRIN (idx_page_views_viewed_at_brin) é postergado para Phase 2 — só quando
-- volume passar de 1M rows (§6 L803), junto com pg_cron job de retenção
-- (NFR12).
CREATE INDEX IF NOT EXISTS idx_page_views_page_id_viewed_at
  ON page_views (page_id, viewed_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT — apenas owner do page via JOIN 1-hop page → profile
--     (verbatim architecture.md §RLS L998-1000). Predicado 1-hop mais simples
--     e barato que o 2-hop da click_events_select_own (que JOIN links → pages
--     → profile). auth.uid() é STABLE no Supabase → cacheável por linha;
--     pages.profile_id UNIQUE (0003) → seek O(log n).
--
-- DEV-3 ratificado: usar auth.uid() direto (NÃO `(select auth.uid())`) para
-- coerência arquitetural com as 8 policies anteriores (Stories 1.4/2.2/2.3/4.1).
-- Batch fix futuro via [STORY-4.1-F1] (LOW deferred) cobrirá esta nova policy
-- junto. Supabase advisor `auth_rls_initplan` aceito como LOW conhecido.
DROP POLICY IF EXISTS page_views_select_own ON page_views;
CREATE POLICY page_views_select_own
  ON page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pages p
      WHERE p.id = page_id
        AND p.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. AC4 — INSERT/UPDATE/DELETE: sem policies permissivas
-- -----------------------------------------------------------------------------
-- AC4 verbatim "RLS análogo a click_events". A defesa canônica no Supabase é
-- AUSÊNCIA-DE-POLICY: RLS habilitado (§3 acima) + zero policy permissiva para
-- INSERT/UPDATE/DELETE = acesso negado para anon/authenticated. service_role
-- bypassa RLS por design Supabase → o Route Handler /api/track/view (Task 5)
-- E o lib/track.ts insertPageView (Task 4) usam createAdmin()
-- (lib/supabase/admin.ts) para inserir legitimamente.
--
-- Alternativa rejeitada: CREATE POLICY page_views_insert_service_role
--   WITH CHECK (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
-- Razão: frágil (depende do claim shape), redundante (service_role já bypassa),
-- não-canônico no Supabase. Ver Dev Notes §DEV-1 (deviation herdada de 4.1
-- DEV-2 APPROVED).
--
-- Validação central: tests/integration/rls/page-views.test.ts cenários (d/e/f)
-- demonstram bloqueio efetivo de INSERT por owner/non-owner/anon (Task 6).
--
-- Sem trigger de retenção/cleanup nesta story — NFR12 90d é responsabilidade
-- de pg_cron na Phase 2 (schema-design.md §6 L803).

-- =============================================================================
-- End of migration 0008_page_views.sql
-- =============================================================================
