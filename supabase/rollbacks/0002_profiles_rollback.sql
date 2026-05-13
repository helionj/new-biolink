-- =============================================================================
-- Rollback: 0002_profiles_rollback.sql
-- Companion to: supabase/migrations/0002_profiles.sql
-- Story:        1.4
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-12
--
-- Purpose:      Reverter completamente migration 0002_profiles.sql.
--               DROPs em ordem reversa de dependências.
--
-- Pre-condition: ALWAYS snapshot before running this in prod.
--                Esta operação é DESTRUTIVA — dados em `profiles` serão perdidos.
--                Por causa do ON DELETE CASCADE via auth.users, dados de
--                tabelas filhas (pages, links, etc. quando existirem) também
--                serão impactados pela perda do FK target.
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: Extensions citext + pgcrypto.
--                  Razão: outras migrations futuras dependem delas; drop só
--                  faz sentido em wipe completo do projeto (db reset).
--                  Para wipe total: `supabase db reset` (cuidado: drop schema).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Triggers — derrubar primeiro para liberar tables/functions
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON profiles;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies — derrubar antes de table drop (DROP TABLE cascateia, mas
--    explícito para auditoria)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_public ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

-- -----------------------------------------------------------------------------
-- 3. Table — profiles
-- -----------------------------------------------------------------------------
-- Sem CASCADE porque ainda não há tabelas filhas em Story 1.4. Quando Story 2.2
-- adicionar pages com FK profiles(id), rollback de 0003_pages.sql deve rodar
-- ANTES deste arquivo.
DROP TABLE IF EXISTS profiles;

-- -----------------------------------------------------------------------------
-- 4. Functions
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS on_auth_user_created();
DROP FUNCTION IF EXISTS set_updated_at();

-- =============================================================================
-- End of rollback 0002_profiles_rollback.sql
-- Verify post-rollback: \dt profiles → relation does not exist
--                       \df set_updated_at → no function
--                       \df on_auth_user_created → no function
-- =============================================================================
