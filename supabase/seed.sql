-- =============================================================================
-- Seed: supabase/seed.sql
-- Story: 1.4 — Schema de Profiles e Fundação RLS
-- Author: @data-engineer (Dara)
-- Date:  2026-05-12
-- Refs:  docs/architecture/schema-design.md §10 Seed Data (linhas 1090-1102)
--
-- Aplicado por:
--   (a) Dev local via `supabase db reset` (drops + reapplica migrations + seed)
--   (b) CI `test-integration` job via projeto Supabase dedicado (alt B do
--       CI-001) — após `supabase db push --linked` e antes de `pnpm test:integration`.
--
-- *** NÃO É APLICADO EM PRODUÇÃO ***
-- Supabase CLI nunca roda `seed.sql` contra projetos linked sem `db reset`.
-- Produção começa vazia e é populada por signups reais.
--
-- Idempotência: ON CONFLICT (id) DO NOTHING — safe re-run.
--   Após primeiro run, auth_user_created trigger NÃO dispara em re-inserts
--   (porque ON CONFLICT evita o INSERT). Para reset completo: `supabase db reset`.
--
-- Demos criados:
--   id                                       | username | display_name | bio          | password
--   00000000-0000-0000-0000-000000000001 | alice    | Alice Demo   | populada     | testpassword123
--   00000000-0000-0000-0000-000000000002 | bob      | Bob Demo     | populada     | testpassword123
--   00000000-0000-0000-0000-000000000003 | carol    | NULL         | NULL         | testpassword123
--
--   Carol fica com display_name/bio NULL para testar nullable em integration tests.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Inserir 3 users em auth.users
-- -----------------------------------------------------------------------------
-- Trigger auth_user_created (criado em 0002_profiles.sql) dispara AFTER INSERT
-- e cria 1 row em profiles para cada user. raw_user_meta_data->>'username' é
-- lido pelo trigger.
--
-- Campos obrigatórios em auth.users (descobertos via inspeção da tabela
-- gerenciada pelo Supabase Auth):
--   id, instance_id, email, encrypted_password (bcrypt via pgcrypto crypt+bf),
--   email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role,
--   created_at, updated_at
--
-- encrypted_password usa `extensions.crypt(password, extensions.gen_salt('bf'))`
-- — pgcrypto extension criada em 0002_profiles.sql. Schema qualification
-- (`extensions.*`) é necessária em Supabase managed: pgcrypto é instalado no
-- schema `extensions`, não em `public`, por convenção de segurança Supabase.
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  aud,
  role,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'alice@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(),
    '{"username":"alice"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'bob@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(),
    '{"username":"bob"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'carol@example.com',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(),
    '{"username":"carol"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Populate display_name + bio em alice e bob (carol fica NULL — teste de nullable)
-- -----------------------------------------------------------------------------
-- O trigger criou profiles apenas com (id, username). UPDATE direto é
-- idempotente (re-runs apenas reescrevem os mesmos valores).
UPDATE profiles
   SET display_name = 'Alice Demo',
       bio          = 'Building cool things at BioLink.'
 WHERE username = 'alice';

UPDATE profiles
   SET display_name = 'Bob Demo',
       bio          = 'Hello from BioLink.'
 WHERE username = 'bob';

-- carol: sem UPDATE deliberado — display_name + bio permanecem NULL.

-- -----------------------------------------------------------------------------
-- 3. Validação pós-seed (opcional — útil em troubleshooting via `psql -f seed.sql`)
-- -----------------------------------------------------------------------------
-- Comentado por padrão para não poluir logs em `supabase db reset`.
-- Descomentar localmente para verificar:
--
-- SELECT username, display_name, bio IS NULL AS bio_is_null
--   FROM profiles
--  ORDER BY username;
-- Expected:
--   alice | Alice Demo | f
--   bob   | Bob Demo   | f
--   carol | NULL       | t

-- =============================================================================
-- End of seed.sql
-- =============================================================================
