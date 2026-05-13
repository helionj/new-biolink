-- =============================================================================
-- Migration: 0002_profiles.sql
-- Story:     1.4 — Schema de Profiles e Fundação RLS
-- Author:    @data-engineer (Dara)
-- Date:      2026-05-12
-- Refs:      docs/architecture/schema-design.md §4 (Physical Schema Design)
--            docs/architecture.md §Database Schema (linhas 831-1001)
--
-- Purpose:   Primeiro DDL real do projeto. Cria:
--            - Extensions citext + pgcrypto (idempotente)
--            - Utility function set_updated_at() (BEFORE UPDATE trigger genérico)
--            - Table profiles (1:1 com auth.users, FR4/FR13)
--            - RLS policies: select_public (USING true), update_own
--            - SECURITY DEFINER trigger on_auth_user_created (bootstrap profile)
--
-- Scope:     Apenas profiles. Tabela `pages` virá em Story 2.2 (que estende
--            on_auth_user_created via CREATE OR REPLACE para incluir INSERT em pages).
--
-- Rollback:  supabase/rollbacks/0002_profiles_rollback.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
-- citext   — case-insensitive text para username (handle "Alice" == "alice")
-- pgcrypto — gen_random_uuid(), digest(), crypt(), gen_salt() (este último
--            usado por supabase/seed.sql para hashar senhas demo via crypt+bf)
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 2. Utility function: set_updated_at()
-- -----------------------------------------------------------------------------
-- BEFORE UPDATE trigger genérico que mantém `updated_at` fresh. Será reusado
-- em pages/links/etc. em stories futuras.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
  'Generic BEFORE UPDATE trigger function — refreshes updated_at to now() on every UPDATE.';

-- -----------------------------------------------------------------------------
-- 3. Table: profiles
-- -----------------------------------------------------------------------------
-- Identidade pública 1:1 com auth.users. id é PK e FK simultaneamente
-- (ON DELETE CASCADE garante limpeza via deleteAccount Server Action — Story 4.5).
--
-- Constraints:
--   - username:     citext UNIQUE, regex ^[a-z0-9-]{3,30}$ (lowercase + dígitos + hyphen)
--   - display_name: nullable, length <= 50
--   - bio:          nullable, length <= 280
--   - avatar_url:   nullable, regex http(s)://
--
-- Reserved usernames (admin, api, dashboard, etc.) NÃO são CHECK constraint —
-- validados em camada Server Action (lib/validators/reserved-usernames.ts,
-- Story 1.5+). Trade-off: flexibilidade de atualizar lista sem DDL change.
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     citext NOT NULL UNIQUE
                 CHECK (username ~ '^[a-z0-9-]{3,30}$'),
  display_name text CHECK (display_name IS NULL OR length(display_name) <= 50),
  bio          text CHECK (bio IS NULL OR length(bio) <= 280),
  avatar_url   text CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  profiles            IS 'Identidade pública 1:1 com auth.users (FR4, FR13).';
COMMENT ON COLUMN profiles.id         IS 'Mesmo ID de auth.users — não é gen_random_uuid.';
COMMENT ON COLUMN profiles.username   IS 'Handle público em /@username, lowercase + dígitos + hyphen (FR4).';
COMMENT ON COLUMN profiles.display_name IS 'Nome de exibição (FR13). NULL OK.';
COMMENT ON COLUMN profiles.bio        IS 'Bio curta (FR13). NULL OK, max 280 chars.';
COMMENT ON COLUMN profiles.avatar_url IS 'URL Supabase Storage (FR13). NULL OK; validation semântica em Server Action.';

-- -----------------------------------------------------------------------------
-- 4. Trigger: trg_profiles_set_updated_at
-- -----------------------------------------------------------------------------
-- Mantém profiles.updated_at fresh em todo UPDATE.
DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON profiles;
CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5a. SELECT — público.
--     Username/handle é descoberto via UNIQUE constraint em signup; restringir
--     SELECT introduziria JOIN com pages em path quente de SSR /@username.
--     Trade-off documentado em arch §RLS High-Level Strategy linhas 935-944.
DROP POLICY IF EXISTS profiles_select_public ON profiles;
CREATE POLICY profiles_select_public
  ON profiles
  FOR SELECT
  USING (true);

-- 5b. UPDATE — apenas owner.
--     WITH CHECK redundante (id é PK não-modificável + FK CASCADE), mas defesa
--     em profundidade impede UPDATE que tente trocar id para outro user.
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5c. INSERT/DELETE — sem policy permissiva.
--     INSERT acontece exclusivamente via SECURITY DEFINER trigger abaixo (§6).
--     DELETE acontece via CASCADE quando auth.users é deletado (Story 4.5
--     deleteAccount Server Action). Sem policy = bloqueio para anon/authenticated.

-- -----------------------------------------------------------------------------
-- 6. Trigger function: on_auth_user_created()
-- -----------------------------------------------------------------------------
-- Cria profile automaticamente após signup. SECURITY DEFINER permite INSERT
-- bypass de RLS (sem isso, anon que dispara signUp não consegue inserir).
--
-- Hardening aplicado (arch §schema-design.md §4 Auth Trigger linhas 644-678):
--   - SET search_path = public, pg_catalog  (defesa anti search_path injection)
--   - Guard de username vazio/curto (RAISE EXCEPTION)
--   - lower() explícito (defesa em profundidade vs citext)
--
-- Story 2.2 estenderá esta função via CREATE OR REPLACE adicionando
-- INSERT INTO pages (profile_id) VALUES (NEW.id).
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
-- 7. Trigger: auth_user_created
-- -----------------------------------------------------------------------------
-- AFTER INSERT ON auth.users — dispara o bootstrap acima.
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
CREATE TRIGGER auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION on_auth_user_created();

-- =============================================================================
-- End of migration 0002_profiles.sql
-- =============================================================================
