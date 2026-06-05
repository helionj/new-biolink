-- =============================================================================
-- Migration: 0010_db_hardening.sql
-- Story:     6.2 (Epic 6 tácito — DB Hardening Cluster B consolidated)
-- Date:      2026-06-05
-- Author:    @dev (shadow per Story 6.2 NH-1; canonical owner @data-engineer)
-- Rollback:  supabase/rollbacks/0010_db_hardening_rollback.sql
-- =============================================================================
--
-- Purpose:   Consolidação dual close `[STORY-4.1-F1]` (auth_rls_initplan em
--            9 policies) + `[STORY-4.3-F1]` (function_search_path_mutable em
--            3 funções) — Supabase advisor compliance batch hardening.
--
-- Cross-ref: docs/qa/gates/4.1-schema-click-events-tracking.yml PERF-001
--            docs/qa/gates/4.2-schema-page-views-tracking.yml PERF-001
--            docs/qa/gates/4.3-agregacoes-sql-views-7d-30d.yml SEC-001
--            docs/qa/gates/4.3-... handoff alternative explicit suggestion
--              ("consolidar em 0010_db_hardening?")
--
-- Strategy:  Section 1 reescreve 9 policies com `(select auth.uid())` wrapper
--            canonical Supabase (planner converte em InitPlan — 1 execução por
--            scan vs N execuções por row em scans amplos). ZERO mudança de
--            lógica de autorização — apenas wrapper sintático otimizado pelo
--            planner. Section 2 fixa search_path em 3 funções via canonical
--            `SET search_path = public, pg_temp` (mitiga schema-shadowing
--            attacks via lint 0011).
--
-- DEV-3 REVERSAL NOTE: Esta migration REVERTE explicitly a decisão
--            ratificada em Story 4.2 DEV-3 (documentada em
--            `0008_page_views.sql:127`) que mantinha `auth.uid()` direto em
--            `page_views_select_own` por "coerência arquitetural com 8 policies
--            anteriores". Reversal é defensible per (a) coerência batch
--            hardening cross-story; (b) canonical Supabase pós-2024 advisor
--            wisdom expansion (advisor explicitly recommends wrapper);
--            (c) zero mudança de comportamento observable — apenas execution
--            plan otimizado pelo planner; (d) gate 4.3 handoff explicit
--            suggested consolidation. Ratificado user opt-in pre-implementation
--            via @devops AskUserQuestion 2026-06-04.
--
-- DEV-A2 validate-first OUTCOME: Executado `Supabase Management API
--            /advisors/security` 2026-06-05 pre-migration; `reorder_links(uuid[])`
--            (0005) NOT flagged — confirma que `SET search_path = public`
--            (sem `pg_temp`) declarado em 0005:59 é considerado sufficient
--            pelo advisor. Scope final estrito: 3 funções (set_updated_at +
--            get_link_clicks_series + get_page_views_series).
--
-- Risk:      MINIMAL — sintático wrapper `(select auth.uid())` é canonical
--            Supabase fix; zero mudança de comportamento de autorização. Gate
--            efetivo via suites integration RLS existentes
--            (tests/integration/rls/*.test.ts) — regression net cobre
--            owner/non-owner/anon × SELECT/INSERT/UPDATE/DELETE × CASCADE.
--            Rollback companion idempotente em 0010_db_hardening_rollback.sql.
--
-- Verification post-apply:
--   1. Supabase Management API `/advisors/performance`:
--      jq '[.lints[] | select(.name == "auth_rls_initplan")] | length' → 0
--   2. Supabase Management API `/advisors/security`:
--      jq '[.lints[] | select(.name == "function_search_path_mutable")] | length' → 0
--   3. Suites integration RLS verdes:
--      pnpm vitest run --project integration -- tests/integration/rls/
--   4. `pnpm db:types` diff em lib/supabase/types.ts → empty (policies +
--      search_path não afetam tipos PostgREST gerados).
-- =============================================================================

BEGIN;

-- =============================================================================
-- Section 1: auth_rls_initplan fix (9 policies)
-- =============================================================================
-- Replace `auth.uid()` direto por `(select auth.uid())` em USING/WITH CHECK
-- predicates. Planner converte subquery em InitPlan: 1 execução por scan
-- (vs N execuções por row no comportamento original). Lógica de autorização
-- preservada: mesma user_id resolvida do JWT, mesma comparação contra
-- profile_id/id/page_id. Order: alphabetical by table (click_events → links
-- × 4 → page_views → pages × 2 → profiles).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 click_events_select_own (origin: 0007:114-123)
-- -----------------------------------------------------------------------------
-- Predicate 3-hop link → page → profile. auth.uid() → (select auth.uid())
-- no `WHERE p.profile_id = ...`.
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
        AND p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 1.2 links_select_own (origin: 0004:113-122)
-- -----------------------------------------------------------------------------
-- Predicate 2-hop link → page → profile. auth.uid() → (select auth.uid()).
DROP POLICY IF EXISTS links_select_own ON links;
CREATE POLICY links_select_own
  ON links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 1.3 links_insert_own (origin: 0004:139-148)
-- -----------------------------------------------------------------------------
-- WITH CHECK predicate 2-hop. auth.uid() → (select auth.uid()).
DROP POLICY IF EXISTS links_insert_own ON links;
CREATE POLICY links_insert_own
  ON links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 1.4 links_update_own (origin: 0004:153-168)
-- -----------------------------------------------------------------------------
-- USING + WITH CHECK simétricos (anti-reassign hardening). auth.uid()
-- → (select auth.uid()) em ambos.
DROP POLICY IF EXISTS links_update_own ON links;
CREATE POLICY links_update_own
  ON links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 1.5 links_delete_own (origin: 0004:171-180)
-- -----------------------------------------------------------------------------
-- USING predicate 2-hop. auth.uid() → (select auth.uid()).
DROP POLICY IF EXISTS links_delete_own ON links;
CREATE POLICY links_delete_own
  ON links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 1.6 page_views_select_own (origin: 0008:132-141) — DEV-3 REVERSAL
-- -----------------------------------------------------------------------------
-- Predicate 2-hop page → profile (1-hop JOIN; mais barato que click_events
-- 3-hop). auth.uid() → (select auth.uid()).
-- REVERTE Story 4.2 DEV-3 ratificação (auth.uid() direto por "coerência
-- arquitetural"). Coerência batch hardening cross-story.
DROP POLICY IF EXISTS page_views_select_own ON page_views;
CREATE POLICY page_views_select_own
  ON page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pages p
      WHERE p.id = page_id
        AND p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 1.7 pages_select_own (origin: 0003:99-103)
-- -----------------------------------------------------------------------------
-- USING predicate simples. auth.uid() → (select auth.uid()).
DROP POLICY IF EXISTS pages_select_own ON pages;
CREATE POLICY pages_select_own
  ON pages
  FOR SELECT
  USING (profile_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 1.8 pages_update_own (origin: 0003:106-111)
-- -----------------------------------------------------------------------------
-- USING + WITH CHECK simétricos (anti-reassign hardening). auth.uid()
-- → (select auth.uid()) em ambos.
DROP POLICY IF EXISTS pages_update_own ON pages;
CREATE POLICY pages_update_own
  ON pages
  FOR UPDATE
  USING (profile_id = (select auth.uid()))
  WITH CHECK (profile_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 1.9 profiles_update_own (origin: 0002:111-115)
-- -----------------------------------------------------------------------------
-- USING + WITH CHECK simétricos (anti-trade-id hardening). auth.uid()
-- → (select auth.uid()) em ambos.
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own
  ON profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- =============================================================================
-- Section 2: function_search_path_mutable fix (3 funções)
-- =============================================================================
-- Adiciona `SET search_path = public, pg_temp` em 3 funções via
-- ALTER FUNCTION (preserva body/signature/security mode). Mitiga
-- schema-shadowing attacks per Supabase advisor lint 0011 canonical fix.
--
-- DEV-A2 OUTCOME: reorder_links(uuid[]) (0005) NOT flagged pré-migration
-- — `SET search_path = public` declarado em 0005:59 é sufficient per
-- advisor. Scope estrito 3 funções (não inclui reorder_links).
-- =============================================================================

-- 2.1 set_updated_at() (origin: 0002:36 — trigger function herdada Story 1.4)
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

-- 2.2 get_link_clicks_series (origin: 0009:198 — Story 4.3)
ALTER FUNCTION public.get_link_clicks_series(uuid, integer) SET search_path = public, pg_temp;

-- 2.3 get_page_views_series (origin: 0009:174 — Story 4.3)
ALTER FUNCTION public.get_page_views_series(uuid, integer) SET search_path = public, pg_temp;

COMMIT;
