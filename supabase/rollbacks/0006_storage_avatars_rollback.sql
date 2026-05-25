-- =============================================================================
-- Rollback: 0006_storage_avatars_rollback.sql
-- Companion to: supabase/migrations/0006_storage_avatars.sql
-- Story:        3.4
-- Author:       @data-engineer (Dara)
-- Date:         2026-05-25
--
-- Purpose:      Reverter completamente migration 0006_storage_avatars.sql.
--               DROPs em ordem reversa de dependências.
--
-- Pre-condition: ALWAYS snapshot before running this in prod.
--                Esta operação é DESTRUTIVA — `storage.objects` órfãos em
--                `bucket_id='avatars'` BLOQUEIAM o DELETE do bucket (FK
--                implícita objects → buckets). Em ambientes com data, purgar
--                ANTES:
--
--                  DELETE FROM storage.objects WHERE bucket_id = 'avatars';
--
--                Side effect: todas as URLs em `profiles.avatar_url` que
--                apontam para o bucket apontarão para 404 — UI tem fallback
--                (initials via AvatarFallback), mas re-upload é necessário
--                para restaurar.
--
-- Idempotência: Todos os DROPs usam IF EXISTS — safe para re-run.
--
-- NOT rolled back: `profiles.avatar_url` column / CHECK constraint.
--                  Razão: a coluna foi criada em 0002_profiles.sql (Story 1.4)
--                  e independe deste bucket — outras stories podem usar URLs
--                  externas no futuro. Rollback de 0006 NÃO toca em profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS Policies — derrubar antes de remover o bucket (auditoria explícita;
--    policies sobreviveriam ao DELETE do bucket porque são em storage.objects,
--    não em storage.buckets, então DROP explícito é obrigatório).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS avatars_select_public ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_own    ON storage.objects;
DROP POLICY IF EXISTS avatars_update_own    ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_own    ON storage.objects;

-- -----------------------------------------------------------------------------
-- 2. Bucket — remover linha de storage.buckets
-- -----------------------------------------------------------------------------
-- DELETE (não DROP) porque storage.buckets é uma tabela, não um schema-object.
-- Se houver objetos órfãos (storage.objects.bucket_id='avatars'), este DELETE
-- falha com FK violation — purgar primeiro (ver Pre-condition no header).
DELETE FROM storage.buckets WHERE id = 'avatars';

-- =============================================================================
-- End of rollback 0006_storage_avatars_rollback.sql
-- Verify post-rollback:
--   SELECT id FROM storage.buckets WHERE id = 'avatars';
--     → 0 rows
--   SELECT policyname FROM pg_policies
--     WHERE schemaname='storage' AND tablename='objects'
--     AND policyname LIKE 'avatars_%';
--     → 0 rows
-- =============================================================================
