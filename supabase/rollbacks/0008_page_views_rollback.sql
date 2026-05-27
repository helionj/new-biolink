-- =============================================================================
-- Rollback: 0008_page_views_rollback.sql
-- Companion to: supabase/migrations/0008_page_views.sql
-- Story:        4.2
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-26
--
-- Purpose:      Reverter completamente migration 0008_page_views.sql.
--               DROPs em ordem reversa de dependências.
--
-- Pre-condition: ALWAYS snapshot before running this in prod.
--                Esta operação é DESTRUTIVA — dados em `page_views` serão
--                perdidos (telemetria FR10). NFR12 (retenção 90d) já implica
--                volatilidade de longo prazo; ainda assim, snapshot é mandatório
--                em prod para preservar audit/forense.
--
-- Ordem de execução: este rollback DEVE rodar ANTES de
--                    0003_pages_rollback.sql — page_views tem FK pages(id).
--                    Independente do rollback de 0007 — sem cross-FK entre
--                    page_views e click_events.
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: Extensions citext+pgcrypto, set_updated_at(), profiles,
--                  pages, links, click_events, theme_preset, on_auth_user_created()/
--                  auth_user_created, reorder_links(), storage policies/bucket.
--                  Razão: pertencem a 0002/0003/0004/0005/0006/0007. page_views
--                  NÃO é bootstrapado, não estende trigger, não depende de
--                  storage → este rollback é localizado.
--                  hash_pii() Postgres NÃO existe (DEV-5 herdado de 4.1 DEV-3)
--                  → nada a derrubar ali.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS Policy de page_views — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
-- Apenas 1 policy permissiva foi criada (page_views_select_own); INSERT/
-- UPDATE/DELETE são denegados por ausência-de-policy + RLS enabled (AC4),
-- não há policies adicionais a derrubar.
DROP POLICY IF EXISTS page_views_select_own ON page_views;

-- -----------------------------------------------------------------------------
-- 2. Índice — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
-- Apenas 1 índice manual (composto): idx_page_views_page_id_viewed_at.
-- O índice automático da PK some junto com a tabela.
DROP INDEX IF EXISTS idx_page_views_page_id_viewed_at;

-- -----------------------------------------------------------------------------
-- 3. Table — page_views
-- -----------------------------------------------------------------------------
-- A constraint chk_page_views_hash_size e o índice automático da PK
-- (bigint identity) somem junto com a tabela. Sequence de identity também
-- é dropada automaticamente (GENERATED ALWAYS AS IDENTITY).
DROP TABLE IF EXISTS page_views;

-- =============================================================================
-- End of rollback 0008_page_views_rollback.sql
-- Verify post-rollback: \dt page_views                   → relation does not exist
--                       \di idx_page_views_*             → índices não existem
--                       \dt pages / profiles / links     → intactos
--                       \dt click_events                 → intacto (0007)
--                       \df reorder_links                → intacto (0005)
--                       \db avatars (storage)            → intacto (0006)
-- =============================================================================
