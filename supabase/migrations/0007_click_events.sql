-- =============================================================================
-- Migration: 0007_click_events.sql
-- Story:     4.1 — Schema de Click Events e Endpoint de Tracking
-- Author:    @data-engineer (Dara)
-- Date:      2026-05-26
-- Refs:      docs/architecture/schema-design.md §4 #click_events (linhas 555-595),
--            §6 Indexing (linhas 738-812), §8 RLS (linhas 951-963),
--            §9 Supabase-Specific (linhas 1006-1014)
--            docs/architecture.md §Database Schema (linhas 885-895),
--            §RLS (linhas 987-995)
--
-- Purpose:   Quarto DDL de domínio (1ª tabela append-only). Cria:
--            - Table click_events (N:1 com links, FR9; PII hashada para LGPD)
--            - 1 índice composto: idx_click_events_link_id_clicked_at (serve
--              cascade lookups + AP-6 analytics; substitui FK index standalone
--              que seria redundante — §6 L782)
--            - Check constraint chk_click_events_hash_size (32 bytes = sha-256)
--            - 1 RLS policy: click_events_select_own (JOIN 2-hop link → page)
--            - SEM policy INSERT/UPDATE/DELETE (AC4 "insert via service role
--              only"): RLS habilitado + ausência-de-policy = acesso negado
--              para anon/authenticated; service-role bypassa RLS para insert
--              legítimo no Route Handler (DEV-2)
--
-- Scope:     Apenas click_events + 1 índice + 1 RLS policy. Extensions
--            (citext/pgcrypto), set_updated_at(), profiles, pages, links e o
--            trigger on_auth_user_created/auth_user_created pertencem a
--            0002/0003/0004 (REUSE, NÃO recriados/estendidos aqui).
--            click_events NÃO é bootstrapado no signup nem seedado — é log
--            append-only de telemetria, populado via /api/track/click
--            (Story 4.1 Route Handler, Task 6).
--
--            page_views (FR10) é Story 4.2 — fora de escopo. hash_pii() Postgres
--            (schema-design.md §4 L385-411) NÃO é criada — hash primário acontece
--            no Route Handler Next.js (TS, com salt do env); função defensiva
--            ficaria sobrando neste momento (DEV-3). Retenção 90d (NFR12) via
--            pg_cron é Phase 2 (§6 L803).
--
-- Naming:    Convenção real do repo `000N_*.sql` (NÃO o YYYYMMDDHHMMSS de
--            schema-design.md §10 — drift doc↔repo documentado, DEV-1; sequência
--            0001→…→0006→0007 é determinística).
--
-- Rollback:  supabase/rollbacks/0007_click_events_rollback.sql
--            (DEVE rodar ANTES do rollback de 0004 — click_events tem FK links(id))
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: click_events
-- -----------------------------------------------------------------------------
-- Log append-only de cliques (FR9). PII (IP, user-agent) hashada para
-- LGPD-mindfulness. DDL canônico verbatim de schema-design.md §4 #click_events
-- (linhas 571-587) — NÃO o de architecture.md §Database Schema (mais frouxo, sem
-- chk_click_events_hash_size; DEV-3).
--
-- Constraints:
--   - id:              bigint identity (Q2 RESOLVED, §4 L594) — append-only com
--                      volume potencial >1M rows/ano justifica bigint vs uuid
--                      (2× mais compacto em índice; sequence cache-friendly em
--                      B-tree). Divergência intencional vs profiles/pages/links
--                      (todos uuid).
--   - link_id:         NOT NULL FK links(id) ON DELETE CASCADE (cascade chain:
--                      auth.users → profiles → pages → links → click_events)
--   - clicked_at:      timestamptz NOT NULL DEFAULT now()
--   - user_agent_hash: bytea (NULL OK) — sha256 com salt env (HASH_SALT)
--   - ip_hash:         bytea (NULL OK) — idem
--   - chk_click_events_hash_size: defende contra hash truncado/incorreto
--                      (32 bytes = output canônico sha-256)
--
-- Sem updated_at, sem trigger set_updated_at — tabela append-only (§4 L592).
-- Events nunca são editados; única mutação é DELETE via retenção (Phase 2).
CREATE TABLE IF NOT EXISTS click_events (
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

COMMENT ON TABLE  click_events                 IS 'Log append-only de cliques (FR9). Retenção 90d via pg_cron (NFR12, Phase 2).';
COMMENT ON COLUMN click_events.id              IS 'PK bigint identity (Q2 RESOLVED) — append-only com volume potencial alto.';
COMMENT ON COLUMN click_events.link_id         IS 'FK links(id) ON DELETE CASCADE — events somem quando link some.';
COMMENT ON COLUMN click_events.clicked_at      IS 'Timestamp do clique (server-side via DEFAULT now()).';
COMMENT ON COLUMN click_events.user_agent_hash IS 'sha256(user-agent || HASH_SALT). 32 bytes (chk_click_events_hash_size). NULL OK.';
COMMENT ON COLUMN click_events.ip_hash         IS 'sha256(ip || HASH_SALT). 32 bytes (chk_click_events_hash_size). NULL OK.';

-- -----------------------------------------------------------------------------
-- 2. Índice (schema-design.md §6 — DECISÃO FINAL pós-Q4 refinement)
-- -----------------------------------------------------------------------------
-- 1 índice composto serve tanto cascade lookups (FK lookup quando link é
-- deletado) quanto AP-6 analytics (WHERE link_id = $1 AND clicked_at >= now()
-- - interval '7 days'). Manter idx_click_events_link_id standalone seria
-- redundante (§6 L782 — composto serve queries que filtram por link_id).
--
-- BRIN (idx_click_events_clicked_at_brin) é postergado para Phase 2 — só quando
-- volume passar de 1M rows (§6 L793-803), junto com pg_cron job de retenção
-- (NFR12).
CREATE INDEX IF NOT EXISTS idx_click_events_link_id_clicked_at
  ON click_events (link_id, clicked_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT — apenas owner do link via JOIN 2-hop link → page → profile
--     (verbatim architecture.md §RLS L988-994). auth.uid() é STABLE no Supabase
--     → cacheável por linha; idx_click_events_link_id_clicked_at + idx_links_page_id
--     (0004) + pages.profile_id UNIQUE (0003) mitigam o JOIN.
DROP POLICY IF EXISTS click_events_select_own ON click_events;
CREATE POLICY click_events_select_own
  ON click_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM links l
      JOIN pages p ON p.id = l.page_id
      WHERE l.id = link_id
        AND p.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. AC4 — INSERT/UPDATE/DELETE: sem policies permissivas
-- -----------------------------------------------------------------------------
-- DEV-2: AC4 verbatim "insert allowed via service role only". A defesa canônica
-- no Supabase é AUSÊNCIA-DE-POLICY: RLS habilitado (§3 acima) + zero policy
-- permissiva para INSERT/UPDATE/DELETE = acesso negado para anon/authenticated.
-- service_role bypassa RLS por design Supabase → o Route Handler /api/track/click
-- (Task 6) usa createAdmin() (lib/supabase/admin.ts) para inserir legitimamente.
--
-- Alternativa rejeitada: CREATE POLICY click_events_insert_service_role
--   WITH CHECK (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
-- Razão: frágil (depende do claim shape), redundante (service_role já bypassa),
-- não-canônico no Supabase. Ver Dev Notes §DEV-2 (deviation APPROVED-by-arch).
--
-- Validação central: tests/integration/rls/click-events.test.ts cenários (d/e/f)
-- demonstram bloqueio efetivo de INSERT por owner/non-owner/anon (Task 8).
--
-- Sem trigger de retenção/cleanup nesta story — NFR12 90d é responsabilidade
-- de pg_cron na Phase 2 (schema-design.md §6 L803).

-- =============================================================================
-- End of migration 0007_click_events.sql
-- =============================================================================
