-- =============================================================================
-- Migration: 0006_storage_avatars.sql
-- Story:     3.4 — Conclusão do Design System (Card, Avatar Upload, Modal)
-- Author:    @data-engineer (Dara)  -- co-execução; @dev primário nas Tasks 2-8
-- Date:      2026-05-25
-- Refs:      docs/architecture/schema-design.md §Storage Integration (linhas
--              1033-1073) — DDL canônico (4 RLS policies verbatim);
--            docs/architecture.md §Tech Stack L178 (size limit 1 MB);
--            docs/prd.md §FR13 (avatar público em /@<username>);
--            docs/stories/3.4.conclusao-design-system.story.md Task 1.
--
-- Purpose:   Primeira migration de Storage do projeto. Cria:
--            - Bucket `avatars` em `storage.buckets` (public:true, 1 MB,
--              jpg/png/webp)
--            - 4 RLS policies em `storage.objects` (select_public, insert_own,
--              update_own, delete_own) com path convention
--              `{auth.uid()}/<filename>.{ext}`
--
-- Scope:     Apenas Storage (bucket + RLS). NÃO altera `profiles.avatar_url`
--            (CHECK `^https?://` já cobre Storage public URL — story Task 1.6).
--            NÃO toca outras tabelas/funções/triggers. `set_updated_at()` e o
--            trigger `on_auth_user_created()` permanecem como em 0002/0003.
--
-- DEV-5 — Ratificação @data-engineer (override pragmático de schema-design.md
--         L1040 "public: false"):
--   ► Decisão: `public: true`.
--   ► Justificativa:
--     1. NFR LCP: página pública /@<username> (Story 2.7) renderiza avatar
--        via next/image priority em SSR. `createSignedUrl` adiciona round-trip
--        de assinatura ANTES de servir HTML — regredindo LCP ~100ms+.
--     2. RLS preserva invariantes de write (INSERT/UPDATE/DELETE permanecem
--        owner-only). `public:true` apenas remove o overhead de signing no
--        SELECT — operação cujo invariante de segurança é "qualquer um pode
--        ver o avatar" (avatar é público por design — FR13).
--     3. `profiles.avatar_url` (text) armazena URL estável; signed URL
--        persistida no DB seria anti-pattern (URL temporária em coluna
--        permanente).
--   ► Forma de reverter (caso ataque econômico de hotlinking se materialize):
--        UPDATE storage.buckets SET public = false WHERE id = 'avatars';
--        (não requer recriar URLs em profiles — Supabase Storage path serve
--        ambos os modos; `avatars_select_public` policy continua autorizando.)
--   ► Change Log: append v0.5 em schema-design.md (sub-task 1.7).
--
-- Naming:    Sequência `000N_*.sql` (precedente 0001→0005). Próxima Story que
--            tocar Storage estende este arquivo via CREATE/DROP idempotentes
--            ou cria 0007_*.sql.
--
-- Rollback:  supabase/rollbacks/0006_storage_avatars_rollback.sql
--            (rollback é destrutivo — objetos em storage.objects órfãos devem
--            ser purged via `DELETE FROM storage.objects WHERE bucket_id =
--            'avatars'` ANTES do rollback em ambientes com data; ver header
--            do rollback companion).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bucket: avatars
-- -----------------------------------------------------------------------------
-- Criado via SQL (não Supabase Dashboard) para CI/CD-friendly migrations.
-- ON CONFLICT DO NOTHING permite re-aplicar a migration sem 23505 (idempotência).
--
-- Configuração:
--   - public: true   — DEV-5 (ver header); RLS no objeto faz o filtro real
--   - file_size_limit: 1048576 bytes (1 MB) — FR13 / arch §Tech Stack L178
--   - allowed_mime_types: jpg/png/webp — espelhado em lib/validators/profile.ts
--                                        (UploadAvatarInput, Task 3 da story).
--                                        MANTER EM SINCRONIA com TS validator.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies em storage.objects (verbatim schema-design.md L1044-1068)
-- -----------------------------------------------------------------------------
-- storage.objects já tem RLS habilitado pelo Supabase (não é necessário
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY — Supabase faz no
-- bootstrap do schema `storage`).
--
-- Path convention: `{auth.uid()}/<filename>.{ext}` (schema-design.md L1071).
-- `storage.foldername(name)[1]` retorna o primeiro segmento do path do objeto
-- (helper canônico do Supabase Storage para esse pattern).
--
-- Todos os DROP POLICY IF EXISTS antes do CREATE — idempotência (precedente
-- verbatim de 0002/0003/0004).

-- 2a. SELECT — público.
--     Avatar é descobrível na URL pública (`/@<username>`) — autorização
--     pública é o invariante intencional (FR13).
DROP POLICY IF EXISTS avatars_select_public ON storage.objects;
CREATE POLICY avatars_select_public
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 2b. INSERT — apenas owner, apenas na própria pasta.
--     WITH CHECK garante que `auth.uid()::text` é o primeiro segmento do path
--     — anon (auth.uid() = NULL) falha o comparison e é negado implicitamente.
DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2c. UPDATE — apenas owner sobrescreve seu próprio objeto.
--     Mesmo path check do INSERT — necessário para `upsert:true` (Server
--     Action `uploadAvatar` Task 2 usa upsert para overwrite no path
--     determinístico `{uid}/avatar.{ext}` — DEV-4 da story).
DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2d. DELETE — apenas owner deleta seu próprio objeto.
--     Essencial para:
--     - Rollback de upload em erro (Server Action Task 2 chama
--       `storage.from('avatars').remove([path])` se UPDATE em profiles falha)
--     - Story 4.5 deleteAccount (cleanup de objetos do user removido)
--     - Cleanup de ext change (jpg→png deixa o antigo órfão — DEV-4 trade-off
--       mitigado por best-effort remove())
DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- End of migration 0006_storage_avatars.sql
-- Post-conditions (validar via 1.8 smoke):
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id='avatars';
--     → 1 row (public=true, file_size_limit=1048576)
--   SELECT policyname FROM pg_policies
--     WHERE schemaname='storage' AND tablename='objects'
--     AND policyname LIKE 'avatars_%';
--     → 4 rows (select_public, insert_own, update_own, delete_own)
-- =============================================================================
