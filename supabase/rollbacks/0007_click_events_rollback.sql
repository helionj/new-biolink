-- =============================================================================
-- Rollback: 0007_click_events_rollback.sql
-- Companion to: supabase/migrations/0007_click_events.sql
-- Story:        4.1
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-26
--
-- Purpose:      Reverter completamente migration 0007_click_events.sql.
--               DROPs em ordem reversa de dependências.
--
-- Pre-condition: ALWAYS snapshot before running this in prod.
--                Esta operação é DESTRUTIVA — dados em `click_events` serão
--                perdidos (telemetria FR9). NFR12 (retenção 90d) já implica
--                volatilidade de longo prazo; ainda assim, snapshot é mandatório
--                em prod para preservar audit/forense.
--
-- Ordem de execução: este rollback DEVE rodar ANTES de
--                    0004_links_rollback.sql — click_events tem FK links(id).
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: Extensions citext+pgcrypto, set_updated_at(), profiles,
--                  pages, links, theme_preset, on_auth_user_created()/
--                  auth_user_created, reorder_links(), storage policies/bucket.
--                  Razão: pertencem a 0002/0003/0004/0005/0006. click_events
--                  NÃO é bootstrapado, não estende trigger, não depende de
--                  storage → este rollback é localizado.
--                  hash_pii() Postgres NÃO existe (DEV-3) → nada a derrubar ali.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS Policy de click_events — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
-- Apenas 1 policy permissiva foi criada (click_events_select_own); INSERT/
-- UPDATE/DELETE são denegados por ausência-de-policy + RLS enabled (DEV-2),
-- não há policies adicionais a derrubar.
DROP POLICY IF EXISTS click_events_select_own ON click_events;

-- -----------------------------------------------------------------------------
-- 2. Índice — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
-- Apenas 1 índice manual (composto): idx_click_events_link_id_clicked_at.
-- O índice automático da PK some junto com a tabela.
DROP INDEX IF EXISTS idx_click_events_link_id_clicked_at;

-- -----------------------------------------------------------------------------
-- 3. Table — click_events
-- -----------------------------------------------------------------------------
-- A constraint chk_click_events_hash_size e o índice automático da PK
-- (bigint identity) somem junto com a tabela. Sequence de identity também
-- é dropada automaticamente (GENERATED ALWAYS AS IDENTITY).
DROP TABLE IF EXISTS click_events;

-- =============================================================================
-- End of rollback 0007_click_events_rollback.sql
-- Verify post-rollback: \dt click_events                   → relation does not exist
--                       \di idx_click_events_*             → índices não existem
--                       \dt links / pages / profiles       → intactos
--                       \df reorder_links                  → intacto (0005)
--                       \db avatars (storage)              → intacto (0006)
-- =============================================================================
