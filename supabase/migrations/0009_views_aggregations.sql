-- =============================================================================
-- Migration: 0009_views_aggregations.sql
-- Story:     4.3 — Agregações SQL: Views 7d/30d + Time-Series Helpers
-- Author:    @data-engineer (Dara)
-- Date:      2026-05-27
-- Refs:      docs/architecture/schema-design.md §4 Views (linhas 622-652),
--                                                §3 AP-6 (linhas 298-316),
--                                                §11 (linha 1196),
--                                                §4 Materialized Views (linhas 655-657)
--            docs/architecture.md §Data Models §Aggregation Views (linhas 356-365),
--                                  §Database Schema (linhas 907-930),
--                                  §Components #7 (linhas 535-545)
--
-- Purpose:   Sexto DDL de domínio. Cria contratos SQL agregadores para o
--            dashboard de analytics (Story 4.4, /dashboard/analytics):
--            - 4 views agregadoras (FR11):
--                * link_clicks_7d  — cliques por (link_id, dia), janela 7d
--                * link_clicks_30d — análogo, janela 30d
--                * page_views_7d   — views por (page_id, dia), janela 7d
--                * page_views_30d  — análogo, janela 30d
--              Todas com WITH (security_invoker = true) (PG 15+) → views
--              executam com permissões do CALLER (não do owner postgres) →
--              RLS de click_events_select_own / page_views_select_own é
--              aplicada corretamente. Sem essa cláusula, owner postgres
--              bypassaria RLS silenciosamente → vazamento de PII analytics
--              (alice veria contagens de bob). Ver DEV-2.
--            - 2 helper functions (AC3 — séries temporais):
--                * get_link_clicks_series(p_link_id uuid, p_days int DEFAULT 7)
--                * get_page_views_series(p_page_id uuid, p_days int DEFAULT 7)
--              SECURITY INVOKER STABLE LANGUAGE sql — mesmo modelo de
--              reorder_links (0005). Sparse — dias zerados omitidos;
--              gap-fill é responsabilidade do caller (UI Story 4.4 em JS,
--              timezone do cliente). Ver DEV-3, DEV-4, DEV-5.
--
-- Strategy:  Views REGULARES (não materializadas) para MVP. Trade-off
--            documentado em docs/architecture.md §Data Models §Aggregation
--            Views (linhas 356-365) e docs/architecture/schema-design.md §4
--            Views §Materialized Views (linhas 655-657): "regular views
--            (sempre fresh, mais caras) suficientes até P95 do dashboard
--            exceder 500ms. Migration para materialized + REFRESH a cada
--            5min está planejada como fallback." AC2 satisfeito por
--            referência (Constitution Art. IV — não duplicar). Ver DEV-6.
--
-- Scope:     Apenas 4 views + 2 funções. Tabelas-base (click_events 0007,
--            page_views 0008) e seus índices compostos
--            (idx_click_events_link_id_clicked_at,
--             idx_page_views_page_id_viewed_at) já existem e cobrem 100%
--            dos predicados de janela WHERE X >= now() - interval 'N days'
--            (schema-design.md §6 L780, L803, §11 L1196) — ZERO novos
--            índices nesta migration (Constitution Art. V — Quality First;
--            re-criar seria duplicação). Ver DEV-7 (sem GRANT/REVOKE
--            customizado — defense é 100% via RLS + security_invoker).
--
-- Naming:    Convenção real do repo `000N_*.sql` (NÃO o YYYYMMDDHHMMSS de
--            schema-design.md §10 — drift doc↔repo documentado; arch.md
--            §1644 referencia "0005_views_aggregations.sql" como off-by-N
--            histórico — segue 0009 conforme sequência determinística
--            0001→…→0008→0009). DEV-1.
--
-- Rollback:  supabase/rollbacks/0009_views_aggregations_rollback.sql
--            (DEVE rodar ANTES dos rollbacks de 0007/0008 — views/funções
--             são "filhas" das tabelas, mas drop de view não toca tabelas;
--             rollback é localizado e independente).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. View: link_clicks_7d
-- -----------------------------------------------------------------------------
-- DDL canônico verbatim de schema-design.md §4 L625-629, acrescido de
-- WITH (security_invoker = true) per DEV-2.
--
-- Predicado WHERE clicked_at >= now() - interval '7 days' é INCLUSIVO no limite
-- (event @ now() - interval '7 days' entra; event @ now() - interval '7 days
-- 1 hour' NÃO entra) — DEV-9. Validado em integration test (Task 5.12).
--
-- Índice usado pelo planner: idx_click_events_link_id_clicked_at (0007) —
-- leading column link_id permite seek O(log n) + range scan no clicked_at DESC.
CREATE VIEW link_clicks_7d WITH (security_invoker = true) AS
SELECT link_id,
       date_trunc('day', clicked_at) AS day,
       count(*)::bigint AS count
FROM click_events
WHERE clicked_at >= now() - interval '7 days'
GROUP BY link_id, date_trunc('day', clicked_at);

COMMENT ON VIEW link_clicks_7d IS
  'Cliques agregados por dia, últimos 7 dias (FR11). Re-computed on query. security_invoker=true: respeita RLS de click_events.';

-- -----------------------------------------------------------------------------
-- 2. View: link_clicks_30d
-- -----------------------------------------------------------------------------
-- Análoga a link_clicks_7d trocando 7 days → 30 days. Verbatim
-- schema-design.md §4 L631-635 + security_invoker per DEV-2.
CREATE VIEW link_clicks_30d WITH (security_invoker = true) AS
SELECT link_id,
       date_trunc('day', clicked_at) AS day,
       count(*)::bigint AS count
FROM click_events
WHERE clicked_at >= now() - interval '30 days'
GROUP BY link_id, date_trunc('day', clicked_at);

COMMENT ON VIEW link_clicks_30d IS
  'Cliques agregados por dia, últimos 30 dias (FR11). Re-computed on query. security_invoker=true: respeita RLS de click_events.';

-- -----------------------------------------------------------------------------
-- 3. View: page_views_7d
-- -----------------------------------------------------------------------------
-- DDL canônico verbatim de schema-design.md §4 L637-641 +
-- security_invoker per DEV-2. RLS de page_views_select_own (1-hop
-- page → profile) aplicada ao expandir a view.
--
-- Índice usado pelo planner: idx_page_views_page_id_viewed_at (0008) —
-- leading column page_id permite seek O(log n) + range scan no viewed_at DESC.
CREATE VIEW page_views_7d WITH (security_invoker = true) AS
SELECT page_id,
       date_trunc('day', viewed_at) AS day,
       count(*)::bigint AS count
FROM page_views
WHERE viewed_at >= now() - interval '7 days'
GROUP BY page_id, date_trunc('day', viewed_at);

COMMENT ON VIEW page_views_7d IS
  'Views agregadas por dia, últimos 7 dias (FR11). Re-computed on query. security_invoker=true: respeita RLS de page_views.';

-- -----------------------------------------------------------------------------
-- 4. View: page_views_30d
-- -----------------------------------------------------------------------------
-- Análoga a page_views_7d trocando 7 days → 30 days. Verbatim
-- schema-design.md §4 L643-647 + security_invoker per DEV-2.
CREATE VIEW page_views_30d WITH (security_invoker = true) AS
SELECT page_id,
       date_trunc('day', viewed_at) AS day,
       count(*)::bigint AS count
FROM page_views
WHERE viewed_at >= now() - interval '30 days'
GROUP BY page_id, date_trunc('day', viewed_at);

COMMENT ON VIEW page_views_30d IS
  'Views agregadas por dia, últimos 30 dias (FR11). Re-computed on query. security_invoker=true: respeita RLS de page_views.';

-- -----------------------------------------------------------------------------
-- 5. Function: get_page_views_series(p_page_id uuid, p_days int)
-- -----------------------------------------------------------------------------
-- Retorna série temporal sparse (dias zerados omitidos) de page views por dia,
-- últimos N dias. AC3 verbatim ("séries temporais (array de {date, count}) por
-- link/page") — função satisfaz a parte page.
--
-- SECURITY INVOKER (DEV-3): função roda com permissões do CALLER → RLS de
-- page_views_select_own é aplicada → owner vê suas séries, non-owner/anon
-- recebem 0 rows. SECURITY DEFINER burlaria RLS silenciosamente (proibido
-- neste escopo). Mesmo modelo de reorder_links (0005:57-58, verificado).
--
-- STABLE (DEV-3): depende de now() (não IMMUTABLE; STABLE permite cache
-- dentro de uma única statement, otimização de planner).
--
-- LANGUAGE sql (DEV-3): função one-liner sem variáveis nem branching —
-- Postgres inline-otimiza, mais simples que plpgsql.
--
-- DEFAULT p_days = 7 (DEV-4): espelha primeiro caso de uso da Story 4.4
-- (gráfico 7d default + toggle 30d, architecture.md §Components #7 L535-545).
-- Limitação PostgREST: alguns clientes podem exigir explicitação do arg
-- mesmo com default no schema — validado empiricamente em Task 5.10.
--
-- Sparse series (DEV-5): retorna apenas dias com >= 1 evento. Gap-fill
-- (eixo X completo) é responsabilidade da UI 4.4 em JS (mais barato CPU-wise,
-- permite timezone do cliente). PRD AC3 não exige dense series.
--
-- (p_days || ' days')::interval é Postgres-canonical para construir interval
-- a partir de inteiro variável. Alternativa make_interval(days => p_days) é
-- PG 14+ mas menos legível. Validar com SELECT (7 || ' days')::interval; →
-- 7 days. p_days aceita 1..365 semanticamente (sem CHECK na função — UI/caller
-- é fonte da verdade); valores >365 funcionam tecnicamente mas violariam
-- intenção MVP.
CREATE OR REPLACE FUNCTION get_page_views_series(p_page_id uuid, p_days int DEFAULT 7)
RETURNS TABLE(day date, count bigint)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT date_trunc('day', viewed_at)::date AS day,
         count(*)::bigint AS count
  FROM page_views
  WHERE page_id = p_page_id
    AND viewed_at >= now() - (p_days || ' days')::interval
  GROUP BY date_trunc('day', viewed_at)
  ORDER BY day ASC;
$$;

COMMENT ON FUNCTION get_page_views_series(uuid, int) IS
  'Série temporal de page views por dia, últimos N dias (FR11/AC3). SECURITY INVOKER respeita RLS de page_views. STABLE (depende de now()). Sparse — dias zerados omitidos; gap-fill é responsabilidade do caller (UI Story 4.4).';

-- -----------------------------------------------------------------------------
-- 6. Function: get_link_clicks_series(p_link_id uuid, p_days int)
-- -----------------------------------------------------------------------------
-- Análoga a get_page_views_series para click_events. Mesmas justificativas
-- de DEV-3, DEV-4, DEV-5. RLS aplicada via click_events_select_own (2-hop
-- JOIN link → page → profile via auth.uid()).
CREATE OR REPLACE FUNCTION get_link_clicks_series(p_link_id uuid, p_days int DEFAULT 7)
RETURNS TABLE(day date, count bigint)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT date_trunc('day', clicked_at)::date AS day,
         count(*)::bigint AS count
  FROM click_events
  WHERE link_id = p_link_id
    AND clicked_at >= now() - (p_days || ' days')::interval
  GROUP BY date_trunc('day', clicked_at)
  ORDER BY day ASC;
$$;

COMMENT ON FUNCTION get_link_clicks_series(uuid, int) IS
  'Série temporal de cliques por dia em um link, últimos N dias (FR11/AC3). SECURITY INVOKER respeita RLS de click_events. STABLE. Sparse.';

-- =============================================================================
-- End of migration 0009_views_aggregations.sql
-- =============================================================================
