-- =============================================================================
-- Rollback: 0004_links_rollback.sql
-- Companion to: supabase/migrations/0004_links.sql
-- Story:        2.3
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-18
--
-- Purpose:      Reverter completamente migration 0004_links.sql.
--               DROPs em ordem reversa de dependências.
--
-- Pre-condition: ALWAYS snapshot before running this in prod.
--                Esta operação é DESTRUTIVA — dados em `links` serão perdidos.
--
-- Ordem de execução: este rollback DEVE rodar ANTES de
--                    0003_pages_rollback.sql — links tem FK pages(id).
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: Extensions citext+pgcrypto, set_updated_at(), profiles,
--                  pages, theme_preset, e os triggers on_auth_user_created()/
--                  auth_user_created. Razão: pertencem a 0002/0003. `links`
--                  NÃO é bootstrapado no signup → 0004 NÃO toca o trigger;
--                  este rollback também NÃO mexe nele.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger de updated_at de links — derrubar primeiro
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_links_set_updated_at ON links;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies de links — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS links_select_own ON links;
DROP POLICY IF EXISTS links_select_public ON links;
DROP POLICY IF EXISTS links_insert_own ON links;
DROP POLICY IF EXISTS links_update_own ON links;
DROP POLICY IF EXISTS links_delete_own ON links;

-- -----------------------------------------------------------------------------
-- 3. Índices — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_links_page_id_position_visible;
DROP INDEX IF EXISTS idx_links_page_id;

-- -----------------------------------------------------------------------------
-- 4. Table — links
-- -----------------------------------------------------------------------------
-- A constraint uniq_links_page_position e seu índice automático somem junto
-- com a tabela.
DROP TABLE IF EXISTS links;

-- =============================================================================
-- End of rollback 0004_links_rollback.sql
-- Verify post-rollback: \dt links              → relation does not exist
--                       \di idx_links_*        → índices não existem
--                       \dt pages / profiles   → intactos
-- =============================================================================
