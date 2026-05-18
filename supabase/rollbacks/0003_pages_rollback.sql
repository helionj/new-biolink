-- =============================================================================
-- Rollback: 0003_pages_rollback.sql
-- Companion to: supabase/migrations/0003_pages.sql
-- Story:        2.2
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-18
--
-- Purpose:      Reverter completamente migration 0003_pages.sql.
--               DROPs em ordem reversa de dependências.
--
-- Pre-condition: ALWAYS snapshot before running this in prod.
--                Esta operação é DESTRUTIVA — dados em `pages` serão perdidos.
--
-- Ordem de execução: este rollback DEVE rodar ANTES de
--                    0002_profiles_rollback.sql — pages tem FK profiles(id).
--                    (Confirmado por 0002_profiles_rollback.sql linhas 41-43.)
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: Extensions citext+pgcrypto, set_updated_at(), profiles.
--                  Razão: pertencem a 0002. on_auth_user_created() NÃO é
--                  dropada — é restaurada via CREATE OR REPLACE ao corpo
--                  somente-profiles de 0002 (o trigger auth_user_created
--                  depende dela; DROP FUNCTION quebraria 0002).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger de updated_at de pages — derrubar primeiro
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pages_set_updated_at ON pages;

-- -----------------------------------------------------------------------------
-- 2. Restaurar on_auth_user_created() ao corpo somente-profiles de 0002
-- -----------------------------------------------------------------------------
-- CREATE OR REPLACE (NÃO DROP FUNCTION — o trigger auth_user_created depende
-- desta função e pertence a 0002; dropá-la quebraria o estado pós-rollback).
-- Corpo copiado verbatim de 0002_profiles.sql linhas 135-156 (sem o INSERT
-- em pages que 0003 adicionou).
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_username citext := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
BEGIN
  IF v_username = '' OR length(v_username) < 3 THEN
    RAISE EXCEPTION 'username missing or too short in raw_user_meta_data: %', v_username
      USING HINT = 'signUp({ options: { data: { username: ... } } }) requires username with length >= 3';
  END IF;

  INSERT INTO profiles (id, username) VALUES (NEW.id, v_username);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_auth_user_created() IS
  'Bootstrap profile ao criar auth.users (Story 1.4). SECURITY DEFINER permite INSERT bypass RLS. Story 2.2 estende com INSERT em pages.';

-- -----------------------------------------------------------------------------
-- 3. RLS Policies de pages — derrubar antes do table drop (auditoria explícita)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pages_select_public ON pages;
DROP POLICY IF EXISTS pages_select_own ON pages;
DROP POLICY IF EXISTS pages_update_own ON pages;

-- -----------------------------------------------------------------------------
-- 4. Table — pages
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS pages;

-- -----------------------------------------------------------------------------
-- 5. Custom type — theme_preset (após a tabela que o usava)
-- -----------------------------------------------------------------------------
DROP TYPE IF EXISTS theme_preset;

-- =============================================================================
-- End of rollback 0003_pages_rollback.sql
-- Verify post-rollback: \dt pages          → relation does not exist
--                       \dT theme_preset   → type does not exist
--                       on_auth_user_created → insere SOMENTE em profiles
-- =============================================================================
