-- =============================================================================
-- Migration: 0003_pages.sql
-- Story:     2.2 — Schema de Pages e RLS
-- Author:    @data-engineer (Dara)
-- Date:      2026-05-18
-- Refs:      docs/architecture/schema-design.md §3 (Custom Types),
--            §4 #pages (linhas 468-487), §4 Auth Trigger (linhas 644-678),
--            §8 RLS High-Level Strategy (linhas 935-994)
--
-- Purpose:   Segundo DDL de domínio. Cria:
--            - Custom type theme_preset (ENUM light/dark/brand)
--            - Table pages (1:1 com profiles no MVP, FR5/FR12)
--            - RLS policies: select_public, select_own, update_own
--            - Trigger trg_pages_set_updated_at (reusa set_updated_at() de 0002)
--            - Estende on_auth_user_created() via CREATE OR REPLACE para
--              também bootstrapar 1 page por signup (AC2)
--
-- Scope:     Apenas pages + theme_preset + extensão do trigger. Extensions
--            (citext/pgcrypto), set_updated_at() e profiles pertencem a 0002
--            (REUSE, não recriados aqui). links/click_events/page_views virão
--            em stories futuras.
--
-- Naming:    Convenção real do repo `000N_*.sql` (NÃO o YYYYMMDDHHMMSS de
--            schema-design.md §10 — drift doc↔repo documentado; o rollback de
--            0002 linhas 41-43 já nomeia explicitamente 0003_pages.sql).
--
-- Rollback:  supabase/rollbacks/0003_pages_rollback.sql
--            (deve rodar ANTES do rollback de 0002 — FK pages→profiles)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Custom type: theme_preset
-- -----------------------------------------------------------------------------
-- Criado ANTES da tabela (ordem de dependência — schema-design.md §10 passo 2).
-- Os 3 presets alinham com Epic 3 ("3 temas presets", prd.md). Tipo inexistente
-- até esta story (Story 1.4 AC1 deferiu `theme` explicitamente para 2.2).
-- Idempotência da re-aplicação é garantida pelo rollback companion (DROP TYPE);
-- migration up não usa DROP TYPE IF EXISTS (para re-run use `supabase db reset`).
CREATE TYPE theme_preset AS ENUM ('light', 'dark', 'brand');

-- -----------------------------------------------------------------------------
-- 2. Table: pages
-- -----------------------------------------------------------------------------
-- Página pública /@username, 1:1 com profile no MVP (FR5, FR12). DDL canônico
-- verbatim de schema-design.md §4 #pages (linhas 468-475).
--
-- Constraints:
--   - id:           gen_random_uuid() (independente de profile.id — segurança
--                   em URLs futuras /api/pages/{id}, schema-design.md §7 L818)
--   - profile_id:   NOT NULL UNIQUE FK profiles(id) ON DELETE CASCADE.
--                   UNIQUE cobre AC4 (1 page/profile no MVP) e cria índice
--                   automático → sem índice extra (schema-design.md §4 L484).
--                   Phase 2 (multi-page) removerá a UNIQUE via expand-contract.
--   - theme:        theme_preset NOT NULL DEFAULT 'light'
--   - is_published: boolean NOT NULL DEFAULT true (filtro da policy pública)
CREATE TABLE IF NOT EXISTS pages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  theme        theme_preset NOT NULL DEFAULT 'light',
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  pages              IS 'Página pública /@username (1:1 com profile no MVP, FR5, FR12).';
COMMENT ON COLUMN pages.id           IS 'PK independente (gen_random_uuid) — não é profile.id; segurança em URLs futuras.';
COMMENT ON COLUMN pages.profile_id   IS 'FK profiles(id) ON DELETE CASCADE. UNIQUE = 1 page/profile no MVP (AC4).';
COMMENT ON COLUMN pages.theme        IS 'Preset de tema (Epic 3). Default light.';
COMMENT ON COLUMN pages.is_published IS 'Visibilidade pública. Default true; filtro da policy pages_select_public.';

-- -----------------------------------------------------------------------------
-- 3. Trigger: trg_pages_set_updated_at
-- -----------------------------------------------------------------------------
-- Mantém pages.updated_at fresh em todo UPDATE. Reusa set_updated_at()
-- criada em 0002 (IDS REUSE — não recriar a função).
DROP TRIGGER IF EXISTS trg_pages_set_updated_at ON pages;
CREATE TRIGGER trg_pages_set_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- 4a. SELECT — duas policies permissivas separadas (OR-combinadas pelo Postgres).
--     Casa o naming verbatim do AC3 ("select_own + select_public") e espelha o
--     estilo "1 policy por preocupação" de 0002. Equivalente funcional ao
--     predicado combinado `is_published OR profile_id = auth.uid()`
--     (schema-design.md §8 L940).
DROP POLICY IF EXISTS pages_select_public ON pages;
CREATE POLICY pages_select_public
  ON pages
  FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS pages_select_own ON pages;
CREATE POLICY pages_select_own
  ON pages
  FOR SELECT
  USING (profile_id = auth.uid());

-- 4b. UPDATE — apenas owner. WITH CHECK impede trocar profile_id para outro user.
DROP POLICY IF EXISTS pages_update_own ON pages;
CREATE POLICY pages_update_own
  ON pages
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 4c. INSERT/DELETE — sem policy permissiva.
--     INSERT acontece exclusivamente via SECURITY DEFINER trigger
--     on_auth_user_created (§5 — bypassa RLS). DELETE acontece via CASCADE
--     quando profiles.id (→ auth.users) é deletado. Sem policy = bloqueio
--     para anon/authenticated (schema-design.md §8 L940: INSERT=trigger only,
--     DELETE=cascade).

-- -----------------------------------------------------------------------------
-- 5. Extend trigger function: on_auth_user_created()
-- -----------------------------------------------------------------------------
-- Estende a função de 0002 via CREATE OR REPLACE (NÃO DROP — o trigger
-- auth_user_created depende dela; CREATE OR REPLACE substitui in-place
-- preservando o trigger). Adiciona INSERT em pages após o INSERT em profiles.
--
-- ADAPT (DEV-4, < 30%, não quebra consumidores): canônico schema-design.md §4
-- Auth Trigger usa `RETURNING id INTO v_profile_id`; aqui é desnecessário
-- porque profiles.id == auth.users.id == NEW.id (0002:65). Guard de username,
-- SET search_path e lower() preservados verbatim de 0002.
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
  INSERT INTO pages (profile_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_auth_user_created() IS
  'Bootstrap profile + page (1:1) ao criar auth.users (Story 2.2 estende Story 1.4). SECURITY DEFINER permite INSERT bypass RLS.';

-- Re-emitir o trigger é opcional (CREATE OR REPLACE acima já substituiu a
-- função in-place; auth_user_created continua apontando para ela). Re-emitido
-- aqui para explicitude/auditoria — idempotente, espelha o padrão de 0002.
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
CREATE TRIGGER auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION on_auth_user_created();

-- =============================================================================
-- End of migration 0003_pages.sql
-- =============================================================================
