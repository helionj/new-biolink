-- =============================================================================
-- Migration: 0005_reorder_links_fn.sql
-- Story:     2.6 — Reordenação por Drag-and-Drop
-- Author:    @dev (Dex)
-- Date:      2026-05-19
-- Refs:      docs/architecture/schema-design.md §7 Q1 RESOLVED (linhas 899-926),
--            §Write Patterns (linha 336),
--            docs/architecture.md §Server Actions Inventário (linha 400),
--            §Workflow 3 (linhas 742-765)
--
-- Purpose:   Cria a função `reorder_links(uuid[])` que materializa o reorder
--            atômico decidido em schema-design.md §7 Q1 RESOLVED. Tudo num
--            ÚNICO statement UPDATE ... FROM unnest(...) WITH ORDINALITY,
--            executado em UMA transação Postgres (a própria função), de modo
--            que a constraint `uniq_links_page_position DEFERRABLE INITIALLY
--            DEFERRED` (criada em 0004) só é avaliada no COMMIT da função —
--            permitindo o swap sem coluna temporária.
--
--            Por que uma RPC: `supabase-js` (PostgREST) NÃO expõe transações
--            multi-statement no cliente — cada `.update()` é uma transação
--            isolada e a constraint DEFERRED reavalia no COMMIT de CADA uma.
--            N updates sequenciais falhariam em qualquer swap (violação
--            23505). Função Postgres chamada via `supabase.rpc(...)` é a
--            forma canônica Supabase de rodar múltiplos statements em uma
--            transação. NÃO é invenção: é a única materialização correta da
--            decisão arquitetural Q1 já fechada.
--
-- Scope:     Apenas a função `reorder_links` + GRANTs. NÃO altera a tabela
--            `links`, a constraint `uniq_links_page_position` (pertence a
--            0004), nem RLS policies (`links_update_own` aplica via
--            SECURITY INVOKER).
--
-- Naming:    Convenção real do repo `000N_*.sql` (sequencial; ver
--            0004_links.sql:26-28).
--
-- Rollback:  supabase/rollbacks/0005_reorder_links_fn_rollback.sql
--            DROP da função; NÃO toca a constraint de 0004.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Function: reorder_links(p_ordered_ids uuid[])
-- -----------------------------------------------------------------------------
-- SECURITY INVOKER (default, EXPLÍCITO p/ documentar a decisão): a função roda
-- com o role do chamador → `auth.uid()` é o do usuário JWT e as RLS policies
-- `links_update_own` continuam aplicando aos UPDATEs. Ids de outro usuário não
-- casam o WHERE `page_id = v_page_id` (resolvido de pages WHERE profile_id =
-- auth.uid()) → defense-in-depth sobre a própria RLS. NÃO usar SECURITY
-- DEFINER (executaria com privilégios do owner e contornaria RLS).
--
-- O corpo é um único UPDATE ... FROM unnest(...) WITH ORDINALITY:
--   - WITH ORDINALITY gera índice 1-based → vira `links.position` 1..N.
--   - Toda a função roda em 1 transação → constraint DEFERRED avalia só no
--     COMMIT da função → swap sem coluna temporária (schema-design §7 Q1).
--   - Gaps eventuais em `position` (após delete; ver Q1) normalizam aqui.
CREATE OR REPLACE FUNCTION reorder_links(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_page_id uuid;
BEGIN
  -- Guard: chamada sem JWT autenticado (auth.uid() é NULL em conexões anon
  -- ou service-role sem set_config). A Server Action já checa getUser() no
  -- boundary, mas defense-in-depth aqui evita a função ser usada como
  -- vetor lateral.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Resolve a page do usuário (1:1 garantida pelo trigger de 0002/0003).
  SELECT id INTO v_page_id FROM pages WHERE profile_id = v_user_id;

  IF v_page_id IS NULL THEN
    RAISE EXCEPTION 'Página não encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- Batch update em 1 transação (a própria função). A constraint
  -- uniq_links_page_position UNIQUE (page_id, position) DEFERRABLE INITIALLY
  -- DEFERRED (de 0004) só é verificada no COMMIT — permite swap sem coluna
  -- temporária. `WHERE links.page_id = v_page_id` é defense-in-depth sobre
  -- a RLS `links_update_own` (ids fora da page do usuário simplesmente não
  -- casam — operação no-op para eles, sem erro).
  UPDATE links
  SET position = ord.idx
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE links.id = ord.id
    AND links.page_id = v_page_id;
END;
$$;

COMMENT ON FUNCTION reorder_links(uuid[]) IS
  'Reorder atômico dos links do usuário autenticado (Story 2.6). Materializa o padrão BEGIN; UPDATE×N; COMMIT; decidido em schema-design.md §7 Q1 RESOLVED (linhas 899-926), num único UPDATE com WITH ORDINALITY. SECURITY INVOKER preserva auth.uid() + RLS links_update_own.';

-- -----------------------------------------------------------------------------
-- 2. GRANTs — least-privilege
-- -----------------------------------------------------------------------------
-- Por default Postgres concede EXECUTE em funções a PUBLIC. Revogar e
-- conceder explicitamente apenas a `authenticated` espelha a postura
-- least-privilege das RLS policies de 0004 (linka_*_own sempre filtram por
-- auth.uid()). Anon e service-role (este último faz bypass de RLS, então
-- não deve depender desta função para reorder em nome de usuário) NÃO
-- recebem EXECUTE explicitamente.
REVOKE EXECUTE ON FUNCTION reorder_links(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reorder_links(uuid[]) FROM anon;
GRANT  EXECUTE ON FUNCTION reorder_links(uuid[]) TO   authenticated;

-- =============================================================================
-- End of migration 0005_reorder_links_fn.sql
-- =============================================================================
