-- =============================================================================
-- Migration: 0004_links.sql
-- Story:     2.3 — Schema de Links e RLS
-- Author:    @data-engineer (Dara)
-- Date:      2026-05-18
-- Refs:      docs/architecture/schema-design.md §4 #links (linhas 501-549),
--            §6 Indexing (linhas 745-810), §7 Q1 RESOLVED (linhas 899-925),
--            §8 RLS (linhas 951-961)
--            docs/architecture.md §RLS (linhas 965-985)
--
-- Purpose:   Terceiro DDL de domínio. Cria:
--            - Table links (N:1 com pages, FR6/FR7/FR8)
--            - 2 índices: idx_links_page_id (FK, AP-2) +
--              idx_links_page_id_position_visible (parcial, AP-1, Q4 RESOLVED)
--            - Constraint uniq_links_page_position UNIQUE DEFERRABLE (AC2 + AC4)
--            - Trigger trg_links_set_updated_at (reusa set_updated_at() de 0002)
--            - 5 RLS policies: select_own, select_public, insert_own,
--              update_own, delete_own (composite JOIN a pages)
--
-- Scope:     Apenas links + índices + trigger updated_at + RLS. Extensions
--            (citext/pgcrypto), set_updated_at(), profiles, pages e o trigger
--            on_auth_user_created/auth_user_created pertencem a 0002/0003
--            (REUSE, NÃO recriados/estendidos aqui). links NÃO é bootstrapado
--            no signup — é conteúdo user-created (Stories 2.5/2.6).
--
-- Naming:    Convenção real do repo `000N_*.sql` (NÃO o YYYYMMDDHHMMSS de
--            schema-design.md §10 — drift doc↔repo documentado, DEV-1; a
--            sequência 0001→0002→0003→0004 é determinística).
--
-- Rollback:  supabase/rollbacks/0004_links_rollback.sql
--            (DEVE rodar ANTES do rollback de 0003 — links tem FK pages(id))
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: links
-- -----------------------------------------------------------------------------
-- Items clicáveis na página pública, N:1 com pages (FR6, FR7, FR8). DDL canônico
-- verbatim de schema-design.md §4 #links (linhas 522-541) — NÃO o de
-- architecture.md §Database Schema (mais frouxo; DEV-3).
--
-- Constraints:
--   - id:          gen_random_uuid() (não-sequencial; segurança em URLs futuras
--                  /api/links/{id} — schema-design.md §7, padrão de pages.id)
--   - page_id:     NOT NULL FK pages(id) ON DELETE CASCADE (cascade chain:
--                  auth.users → profiles → pages → links — schema-design.md §2)
--   - title:       NOT NULL, length BETWEEN 1 AND 100 (rejeita título vazio)
--   - url:         NOT NULL, regex ^https?://
--   - icon:        nullable, slug lucide-react ^[a-z0-9-]{1,40}$
--   - is_visible:  boolean NOT NULL DEFAULT true (filtro da policy pública)
--   - position:    integer NOT NULL CHECK (>= 0)
--   - uniq_links_page_position: UNIQUE (page_id, position) DEFERRABLE INITIALLY
--                  DEFERRED — cobre AC2 (position UNIQUE per page_id) e é o
--                  primitivo do reorder atômico (AC4, Story 2.6; ver §7 abaixo)
CREATE TABLE IF NOT EXISTS links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  url         text NOT NULL CHECK (url ~* '^https?://'),
  icon        text CHECK (icon IS NULL OR icon ~ '^[a-z0-9-]{1,40}$'),
  is_visible  boolean NOT NULL DEFAULT true,
  position    integer NOT NULL CHECK (position >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_links_page_position
    UNIQUE (page_id, position) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  links            IS 'Items clicáveis na página pública (FR6, FR7, FR8).';
COMMENT ON COLUMN links.id         IS 'PK independente (gen_random_uuid) — segurança em URLs futuras /api/links/{id}.';
COMMENT ON COLUMN links.page_id    IS 'FK pages(id) ON DELETE CASCADE — links somem quando a page some.';
COMMENT ON COLUMN links.title      IS 'Rótulo do link (1-100 chars; rejeita vazio).';
COMMENT ON COLUMN links.url        IS 'Destino http(s). Validation semântica adicional em Server Action (Story 2.5).';
COMMENT ON COLUMN links.icon       IS 'Slug opcional lucide-react (^[a-z0-9-]{1,40}$). NULL OK.';
COMMENT ON COLUMN links.is_visible IS 'Visibilidade pública do link. Default true; filtro da policy links_select_public.';
COMMENT ON COLUMN links.position   IS 'Ordem de exibição (UNIQUE per page, DEFERRABLE para reorder atômico).';

-- -----------------------------------------------------------------------------
-- 2. Índices (schema-design.md §6 — Q4 RESOLVED)
-- -----------------------------------------------------------------------------
-- Postgres NÃO cria índice automático para colunas FK → idx_links_page_id é
-- manual (serve AP-2 dashboard list, §6 L750). idx_links_page_id_position_visible
-- é PARCIAL (Q4 RESOLVED, §6 L757-768): serve a query mais crítica AP-1 (render
-- público ordenado), permite index-only scan. O índice automático da constraint
-- UNIQUE (page_id, position) NÃO serve queries — é só integridade (§6 L745) →
-- os 2 índices abaixo continuam necessários.
CREATE INDEX IF NOT EXISTS idx_links_page_id ON links (page_id);
CREATE INDEX IF NOT EXISTS idx_links_page_id_position_visible
  ON links (page_id, position) WHERE is_visible = true;

-- -----------------------------------------------------------------------------
-- 3. Trigger: trg_links_set_updated_at
-- -----------------------------------------------------------------------------
-- Mantém links.updated_at fresh em todo UPDATE. Reusa set_updated_at()
-- criada em 0002 (IDS REUSE — NÃO recriar a função; mesmo padrão de 0003).
DROP TRIGGER IF EXISTS trg_links_set_updated_at ON links;
CREATE TRIGGER trg_links_set_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- 4a. SELECT — duas policies permissivas separadas (OR-combinadas pelo Postgres).
--     Casa o naming verbatim do AC3 ("select_own + select_public") e espelha o
--     estilo "1 policy por preocupação" de 0002/0003 (DEV-2). Funcionalmente
--     idêntico ao predicado SELECT combinado de architecture.md §RLS L966-976.
--     Predicado composto: ownership/publicação vivem em `pages` (links não tem
--     profile_id) → subquery EXISTS … JOIN pages.
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

DROP POLICY IF EXISTS links_select_public ON links;
CREATE POLICY links_select_public
  ON links
  FOR SELECT
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_id AND p.is_published = true
    )
  );

-- 4b. INSERT — apenas owner da page. WITH CHECK valida que page_id pertence ao
--     usuário autenticado → faz AC5 "inserir link em página de outro usuário
--     deve falhar" (verbatim architecture.md §RLS L977-979).
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

-- 4c. UPDATE — apenas owner. WITH CHECK (simetria anti-reassign) impede mover
--     um link para a page de outro user via UPDATE de page_id — mesmo hardening
--     de pages_update_own (0003:106-110), padrão validado 2.2.
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

-- 4d. DELETE — apenas owner (verbatim architecture.md §RLS L983-985).
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

-- -----------------------------------------------------------------------------
-- 5. AC4 — contiguidade de `position`: SEM trigger de compactação
-- -----------------------------------------------------------------------------
-- schema-design.md §7 Q1 RESOLVED (linhas 899-925) decidiu EXPLICITAMENTE:
--   `UNIQUE (page_id, position) DEFERRABLE INITIALLY DEFERRED`
--   + leave gaps on delete (NÃO compactar).
-- Trigger shift-on-delete foi REJEITADO por arch (lock contention em alta
-- concorrência; compactar não traz benefício funcional — o client ordena por
-- `position ASC` e ignora gaps; gaps normalizam quando o usuário reordena).
--
-- O entregável de SCHEMA que satisfaz AC4 é a constraint DEFERRABLE acima — o
-- primitivo que habilita o reorder atômico (UPDATE batch numa transação onde o
-- uniqueness check é DEFERRED até COMMIT → swap sem coluna temporária):
--
--   BEGIN;
--     UPDATE links SET position = 0 WHERE id = '...' AND page_id = 'X';
--     UPDATE links SET position = 1 WHERE id = '...' AND page_id = 'X';
--     ...
--   COMMIT;  -- uniqueness (DEFERRED) avaliado só aqui
--
-- A lógica "garante position contígua após delete" é responsabilidade da
-- Server Action reorderLinks() da Story 2.6 (fora de escopo de 2.3) — NÃO um
-- trigger. Criar tal trigger contrariaria Q1 RESOLVED (decisão arquitetural
-- fechada). Ver Dev Notes §DEV-4 (deviation APPROVED-by-arch).

-- =============================================================================
-- End of migration 0004_links.sql
-- =============================================================================
