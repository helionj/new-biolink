# BioLink — Dev Setup

Guia para conectar uma máquina nova ao BioLink em modo de desenvolvimento. Este projeto usa **Supabase remoto de dev** (free tier) — você **não** precisa rodar `supabase start`/Docker localmente.

> Por convenção, neste guia o termo "Supabase de dev" significa o projeto Supabase hospedado no `supabase.com/dashboard` dedicado a desenvolvimento. Produção tem projeto separado, configurado pelo @devops.

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|-----------|---------------|-----------|
| Node.js | ≥ 20 | `node -v` |
| pnpm | ≥ 9 (instalado como `pnpm@11.0.8` via `corepack`) | `pnpm -v` |
| Git | qualquer recente | `git --version` |
| GitHub CLI (`gh`) | qualquer recente | `gh --version` |
| Supabase CLI | latest (instalada como devDep deste projeto) | `pnpm exec supabase --version` |

Se você não tem `pnpm`, ative o gerenciador de pacotes via Corepack: `corepack enable && corepack prepare pnpm@11 --activate`.

Se preferir instalar a Supabase CLI globalmente em vez de usar `pnpm exec`, siga https://supabase.com/docs/guides/cli/getting-started — qualquer versão recente serve.

---

## 2. Conectar ao Supabase de dev

> Você não roda `supabase start`. O projeto consome o projeto remoto via URL/keys.

### 2.1 Criar o projeto remoto

1. Abra https://supabase.com/dashboard → **New project**.
2. Preencha:
   - **Name:** `biolink-dev` (ou similar)
   - **Database password:** gere e guarde no seu cofre de senhas — você só vai precisar para acessar o Postgres diretamente
   - **Region:** `South America (São Paulo)` (`sa-east-1`) ou a mais próxima
   - **Plan:** **Free**
3. Click **Create new project**. Provisionamento leva ~2 minutos.
4. Quando o projeto estiver "Healthy", abra **Project Settings → API** e copie:
   - **Project URL** → `https://<ref>.supabase.co`
   - **anon public** key
   - **service_role** key (clique em "Reveal" — esta chave bypassa RLS, trate como senha)
   - O **Project Ref** é o `<ref>` da URL acima.

### 2.2 Popular `.env.local`

Copie `.env.example` para `.env.local` (na raiz do repo) e preencha as chaves Supabase:

```bash
cp .env.example .env.local
```

```bash
# .env.local (NUNCA commitado)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

> `.env.local` está em `.gitignore`. Confira com `git check-ignore -v .env.local` antes de commitar qualquer coisa.

### 2.3 Gerar `HASH_SALT`

Salt para hash de PII (IPs/UAs em analytics, Story 4.x):

```bash
openssl rand -hex 32
```

Adicione o resultado a `.env.local`:

```bash
HASH_SALT=<64 hex chars gerado acima>
```

> `HASH_SALT` deve ter no mínimo 32 caracteres. Não rotacione sem migration plan — hashes existentes ficam órfãos.

### 2.4 Linkar o projeto à CLI

Liga o repo local ao projeto remoto (cria `.supabase/` local — já no `.gitignore`):

```bash
pnpm exec supabase login                       # autentica via browser
pnpm exec supabase link --project-ref <ref>    # <ref> = Project Ref do passo 2.1
```

A CLI pode pedir a senha do banco que você definiu em 2.1; cole quando solicitar.

---

## 3. Variáveis de ambiente — referência completa

| Variável | Escopo | Onde obter | Notas |
|----------|--------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase Dashboard → API | Público (vai no bundle do browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase Dashboard → API | Público (RLS aplica) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Supabase Dashboard → API | Bypassa RLS — NUNCA prefixar com `NEXT_PUBLIC_`, NUNCA importar em Client Component (o `lib/supabase/admin.ts` lança erro se for chamado no browser) |
| `HASH_SALT` | **server-only** | `openssl rand -hex 32` (local), gerado por env | Hash de PII; ≥ 32 chars |

Em **produção** (Story 1.3 — @devops):

- Todas as 4 variáveis são configuradas em **Vercel → Project Settings → Environment Variables**.
- Cópia idêntica vai para **GitHub Actions secrets** (CI/CD com Supabase Branching).
- Projeto Supabase de produção é **separado** do de dev.

---

## 4. Gerar tipos do schema

```bash
pnpm db:types
```

Isso roda `supabase gen types typescript --linked --schema public > lib/supabase/types.ts` e produz uma definição `Database` que tipa todos os clientes Supabase.

- Rode após cada alteração de schema (após `supabase db push` em Story 1.4+).
- Commite `lib/supabase/types.ts` (é gerado mas tracked — o CI deste projeto valida que ele está atualizado).

> **Schema vazio nesta story:** a migration `supabase/migrations/0001_init.sql` é apenas um placeholder até Story 1.4. O `pnpm db:types` ainda gera um arquivo válido com tipos do schema `auth` interno do Supabase, mesmo com `public` vazio.

---

## 5. Por que não `supabase start`?

`supabase start` sobe um stack local em Docker (Postgres, Auth, Storage, Realtime, Studio). Decidimos por **não** usar este caminho:

- Dev usa o projeto remoto free-tier — paridade total com prod.
- CI usa **Supabase Branching** (PRs ganham uma branch do banco automaticamente — Story 1.3).
- Sem dependência de Docker, mais leve em máquinas dev.
- Single source of truth para schema (o projeto remoto).

Se algum cenário pedir o stack local (ex.: experimentos destrutivos), você ainda pode rodar `pnpm exec supabase start` ad-hoc — mas não é o fluxo padrão.

---

## 6. Rodar a aplicação

```bash
pnpm dev
```

App em http://localhost:3000.

A primeira importação de `lib/env.ts` valida via Zod todas as 4 variáveis. Se algo estiver faltando ou inválido, **o boot do Next.js falha imediatamente** com mensagem listando as keys problemáticas. Isso é intencional — preferimos falhar cedo a vazar configs erradas para o runtime.

---

## 7. Verificação rápida (smoke test)

Depois do setup, rode:

```bash
pnpm typecheck    # tsc --noEmit deve passar
pnpm lint         # eslint deve passar
pnpm build        # next build deve passar (valida env vars no build)
pnpm db:types     # regenera lib/supabase/types.ts sem erro
```

Se os 4 comandos saírem com exit code `0`, seu ambiente está pronto.

---

## 8. Troubleshooting

| Sintoma | Causa provável | Fix |
|---------|---------------|-----|
| `Invalid environment variables` no boot | Faltando key em `.env.local` ou `HASH_SALT` < 32 chars | Veja a lista de keys no erro; complete em `.env.local`. |
| `supabase: command not found` | CLI não está no PATH | Use `pnpm exec supabase ...` ou instale globalmente. |
| `Project not linked` ao rodar `pnpm db:types` | Falta rodar `supabase link --project-ref` | Execute o passo 2.4. |
| `supabase link` pede senha do banco | Esperado | Cole a senha definida em 2.1. |
| `node_modules/.bin/` vazio após `pnpm install` | Cache pnpm corrompido | `rm -rf node_modules && pnpm install` |

---

## Referências

- [`docs/architecture.md`](architecture.md) §Frontend Services Layer > API Client Setup
- [`docs/architecture.md`](architecture.md) §Tech Stack
- Story 1.2 (esta) — onde a configuração inicial mora
- Story 1.3 — CI/CD com Supabase Branching e secrets em Vercel/GHA
- Story 1.4 — primeiro schema real
