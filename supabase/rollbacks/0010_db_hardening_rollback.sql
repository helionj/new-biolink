-- =============================================================================
-- Rollback: 0010_db_hardening_rollback.sql
-- Story:    6.2 (Epic 6 tácito — DB Hardening Cluster B consolidated)
-- Date:     2026-06-05
-- Pair:     supabase/migrations/0010_db_hardening.sql
-- =============================================================================
--
-- Purpose:  Restaura state pré-Story 6.2: 9 policies com `auth.uid()` direto
--           (revert wrapper canonical) + 3 funções sem search_path fixado
--           (revert `SET search_path = public, pg_temp` via RESET search_path).
--
-- WARNING:  Aplicar APENAS em emergência (regressão de comportamento ou bug
--           crítico). Operação idempotente — pode rodar multiple times sem
--           efeito colateral.
--
-- Application: psql -h <host> -U <user> -d <db> -f 0010_db_hardening_rollback.sql
--           OU `supabase db push --linked` apontando para migration vazia +
--           apply manual deste rollback via psql/Studio.
--
-- Verification post-rollback:
--   1. /advisors/performance auth_rls_initplan count → 9 (restaurado)
--   2. /advisors/security function_search_path_mutable count → 3 (restaurado)
--   3. Suites integration RLS continuam verdes (comportamento idêntico)
-- =============================================================================

BEGIN;

-- =============================================================================
-- Section 1 (REVERSE): Restore policies com `auth.uid()` direto (9 policies)
-- =============================================================================
-- Order: alphabetical by table (matches forward migration ordering).
-- =============================================================================

-- 1.1 click_events_select_own (restore 0007:114-123)
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

-- 1.2 links_select_own (restore 0004:113-122)
DROP POLICY IF EXISTS links_select_own ON links;
CREATE POLICY links_select_own
  ON links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = auth.uid()
    )
  );

-- 1.3 links_insert_own (restore 0004:139-148)
DROP POLICY IF EXISTS links_insert_own ON links;
CREATE POLICY links_insert_own
  ON links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = auth.uid()
    )
  );

-- 1.4 links_update_own (restore 0004:153-168)
DROP POLICY IF EXISTS links_update_own ON links;
CREATE POLICY links_update_own
  ON links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = auth.uid()
    )
  );

-- 1.5 links_delete_own (restore 0004:171-180)
DROP POLICY IF EXISTS links_delete_own ON links;
CREATE POLICY links_delete_own
  ON links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.profile_id = auth.uid()
    )
  );

-- 1.6 page_views_select_own (restore 0008:132-141 — DEV-3 original)
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

-- 1.7 pages_select_own (restore 0003:99-103)
DROP POLICY IF EXISTS pages_select_own ON pages;
CREATE POLICY pages_select_own
  ON pages
  FOR SELECT
  USING (profile_id = auth.uid());

-- 1.8 pages_update_own (restore 0003:106-111)
DROP POLICY IF EXISTS pages_update_own ON pages;
CREATE POLICY pages_update_own
  ON pages
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 1.9 profiles_update_own (restore 0002:111-115)
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- Section 2 (REVERSE): RESET search_path em 3 funções
-- =============================================================================
-- ALTER FUNCTION ... RESET search_path restaura comportamento original
-- (search_path herdado do caller — schema-shadowing exposure original).
-- =============================================================================

-- 2.1 set_updated_at()
ALTER FUNCTION public.set_updated_at() RESET search_path;

-- 2.2 get_link_clicks_series
ALTER FUNCTION public.get_link_clicks_series(uuid, integer) RESET search_path;

-- 2.3 get_page_views_series
ALTER FUNCTION public.get_page_views_series(uuid, integer) RESET search_path;

COMMIT;
