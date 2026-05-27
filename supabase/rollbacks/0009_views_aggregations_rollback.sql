-- =============================================================================
-- Rollback: 0009_views_aggregations_rollback.sql
-- Companion to: supabase/migrations/0009_views_aggregations.sql
-- Story:        4.3
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-27
--
-- Purpose:      Reverter completamente migration 0009_views_aggregations.sql.
--               DROPs em ordem reversa: primeiro as 2 funções (criadas DEPOIS
--               das views), depois as 4 views.
--
-- Pre-condition: Não há dados a perder — views regulares re-computam on query
--                e funções são puramente declarativas. Diferente de
--                page_views/click_events (0007/0008 rollbacks), aqui não há
--                necessidade de snapshot prévio em prod (apenas DDL).
--
-- Ordem de execução: rollback de 0009 é INDEPENDENTE dos rollbacks de
--                    0007/0008. Sem cross-FK (views são "filhas" lógicas das
--                    tabelas, mas drop de view não toca tabelas-base nem
--                    seus índices/RLS policies). Pode rodar isoladamente
--                    sem afetar 0007/0008.
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: click_events + page_views + índices
--                  (idx_click_events_link_id_clicked_at,
--                   idx_page_views_page_id_viewed_at) + RLS policies
--                  (click_events_select_own, page_views_select_own) +
--                  extensions + outras funções/triggers de 0001..0008.
--                  Razão: pertencem às migrations anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Functions — derrubar antes das views (auditoria explícita)
-- -----------------------------------------------------------------------------
-- Funções não têm dependência hard de views nesta migration, mas a ordem
-- inversa preserva simetria com o ordering do CREATE (views 1-4, depois
-- functions 5-6).
DROP FUNCTION IF EXISTS get_link_clicks_series(uuid, int);
DROP FUNCTION IF EXISTS get_page_views_series(uuid, int);

-- -----------------------------------------------------------------------------
-- 2. Views — em ordem reversa
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS page_views_30d;
DROP VIEW IF EXISTS page_views_7d;
DROP VIEW IF EXISTS link_clicks_30d;
DROP VIEW IF EXISTS link_clicks_7d;

-- =============================================================================
-- End of rollback 0009_views_aggregations_rollback.sql
-- Verify post-rollback:
--   \dv link_clicks_*               → no relations
--   \dv page_views_*                → no relations
--   \df get_link_clicks_series      → function does not exist
--   \df get_page_views_series       → function does not exist
--   \dt click_events / page_views   → intactos (0007/0008)
--   \di idx_click_events_link_id_clicked_at  → intacto
--   \di idx_page_views_page_id_viewed_at     → intacto
-- =============================================================================
