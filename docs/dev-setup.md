# BioLink — Dev Setup

Guia para conectar uma máquina nova ao BioLink em modo de desenvolvimento. Este projeto usa **Supabase remoto de dev** (free tier) — você **não** precisa rodar `supabase start`/Docker localmente.

> Por convenção, neste guia o termo "Supabase de dev" significa o projeto Supabase hospedado no `supabase.com/dashboard` dedicado a desenvolvimento. Produção tem projeto separado, configurado pelo @devops.

---

## 1. Pré-requisitos

| Ferramenta        | Versão mínima                                     | Verificar                      |
| ----------------- | ------------------------------------------------- | ------------------------------ |
| Node.js           | ≥ 20                                              | `node -v`                      |
| pnpm              | ≥ 9 (instalado como `pnpm@11.0.8` via `corepack`) | `pnpm -v`                      |
| Git               | qualquer recente                                  | `git --version`                |
| GitHub CLI (`gh`) | qualquer recente                                  | `gh --version`                 |
| Supabase CLI      | latest (instalada como devDep deste projeto)      | `pnpm exec supabase --version` |

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

| Variável                        | Escopo          | Onde obter                                     | Notas                                                                                                                                                |
| ------------------------------- | --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | client + server | Supabase Dashboard → API                       | Público (vai no bundle do browser)                                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase Dashboard → API                       | Público (RLS aplica)                                                                                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server-only** | Supabase Dashboard → API                       | Bypassa RLS — NUNCA prefixar com `NEXT_PUBLIC_`, NUNCA importar em Client Component (o `lib/supabase/admin.ts` lança erro se for chamado no browser) |
| `NEXT_PUBLIC_SITE_URL`          | client + server | `http://localhost:3000` (dev) / Vercel URL     | Base URL absoluta para `redirectTo` de emails Supabase Auth (Story 1.6). Zod `.url()`; build falha se ausente.                                       |
| `HASH_SALT`                     | **server-only** | `openssl rand -hex 32` (local), gerado por env | Hash de PII; ≥ 32 chars                                                                                                                              |

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

| Sintoma                                        | Causa provável                                         | Fix                                                     |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `Invalid environment variables` no boot        | Faltando key em `.env.local` ou `HASH_SALT` < 32 chars | Veja a lista de keys no erro; complete em `.env.local`. |
| `supabase: command not found`                  | CLI não está no PATH                                   | Use `pnpm exec supabase ...` ou instale globalmente.    |
| `Project not linked` ao rodar `pnpm db:types`  | Falta rodar `supabase link --project-ref`              | Execute o passo 2.4.                                    |
| `supabase link` pede senha do banco            | Esperado                                               | Cole a senha definida em 2.1.                           |
| `node_modules/.bin/` vazio após `pnpm install` | Cache pnpm corrompido                                  | `rm -rf node_modules && pnpm install`                   |

---

## 9. GitHub Actions Secrets (CI/CD)

Configurados pelo `@devops` durante Story 1.3 — listados aqui só para referência. Listar com `gh secret list --repo helionj/new-biolink`. **Valores nunca são commitados nem logados.**

| Secret                          | Origem                                                                              | Usado em                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard → Settings → API → Project URL                                   | job `build`                                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public                                   | job `build`                                                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Dashboard → Settings → API → service_role                                  | job `build`                                                              |
| `NEXT_PUBLIC_SITE_URL`          | URL do CI/preview (ex: `http://localhost:3000` para `pnpm build` em CI dev)         | job `build` (env compile-time é resolvido em build)                      |
| `HASH_SALT`                     | `openssl rand -hex 32` (≥ 32 chars; **diferente** do `.env.local` e do de produção) | job `build`                                                              |
| `SUPABASE_ACCESS_TOKEN`         | `supabase.com/dashboard/account/tokens` (Personal Access Token)                     | job `test-integration` (CLI auth para `supabase branches create/delete`) |
| `SUPABASE_PROJECT_REF`          | `ibpliihqaceafdykgwiu` (projeto Supabase de dev — parent dos branches PR)           | job `test-integration`                                                   |

> **Adicionar/atualizar secret:** `gh secret set <NAME> --repo helionj/new-biolink` (o `gh` lê o valor de stdin — nunca aparece no transcript).

---

## 10. Vercel Environment Variables (Deploy)

Configurados em **Vercel Project Settings → Environment Variables**. URL de produção: `https://new-biolink.vercel.app`.

| Variável                        | Production                                                                           | Preview                      | Development             |
| ------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- | ----------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | mesmo do GHA                                                                         | mesmo                        | mesmo                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | mesmo                                                                                | mesmo                        | mesmo                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | mesmo (`Encrypted`/`Sensitive`)                                                      | mesmo                        | mesmo                   |
| `NEXT_PUBLIC_SITE_URL`          | `https://new-biolink.vercel.app`                                                     | herda `$VERCEL_URL` ou vazio | `http://localhost:3000` |
| `HASH_SALT`                     | **novo** `openssl rand -hex 32` (≠ dev, ≠ CI; **não rotacionar** sem migration plan) | mesmo de Production          | local-dev value         |

> **Deployment Protection** está desabilitada para tornar Vercel Previews públicos (validação por reviewers externos sem login). Para features sensíveis pré-launch, esconder atrás de feature flag.

---

## 11. Husky + lint-staged + gitleaks (hooks locais)

Story 1.3 adicionou hooks Git que rodam automaticamente:

| Hook         | Comando                                                              | Bloqueia se                                                |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `pre-commit` | `pnpm exec lint-staged` + `gitleaks protect --staged` (se instalado) | ESLint/Prettier falha em staged OU gitleaks detecta secret |
| `pre-push`   | `pnpm typecheck`                                                     | TS reporta erro                                            |

**Instalar gitleaks localmente (opcional, recomendado):**

```bash
# macOS
brew install gitleaks

# Linux (binário)
# https://github.com/gitleaks/gitleaks/releases
```

Sem gitleaks local, o `pre-commit` mostra um warning e segue — o CI faz o scan canônico via `gitleaks/gitleaks-action@v2`, então não há risco de vazamento entrar em `main`.

**Allowlist** está em `.gitleaks.toml` (rules default + ignorar `.env.example`, `docs/*.md`, `pnpm-lock.yaml`).

---

## 12. Schema, migrations e seed (Story 1.4)

A partir da Story 1.4 o projeto tem schema real (`profiles` + RLS + trigger de bootstrap). Esta seção cobre o fluxo local de aplicar migrations e popular dados demo.

### Fluxo canônico

```bash
# 1. Garantir projeto linkado (Story 1.2 já fez):
pnpm exec supabase link --project-ref ibpliihqaceafdykgwiu

# 2. Aplicar migrations no projeto remoto linkado:
pnpm exec supabase db push

# 3. Regenerar tipos TypeScript a partir do schema atual:
pnpm db:types

# 4. (opcional, apenas dev) zerar projeto remoto + reaplicar tudo + carregar seed:
pnpm exec supabase db reset --linked
```

> ⚠️ **`supabase db reset --linked` é destrutivo** — drops todo o schema `public` do projeto remoto linkado e reaplica `migrations/*` em ordem + `seed.sql`. Usar **APENAS** em projeto de **dev** (`ibpliihqaceafdykgwiu`) ou no **projeto de CI dedicado** (alt B CI-001). **NUNCA** rodar contra produção.

### Arquivos relevantes

| Path                                     | Função                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `supabase/migrations/0001_init.sql`      | Placeholder vazio (Story 1.2 — reserva ordem)                       |
| `supabase/migrations/0002_profiles.sql`  | Schema profiles + RLS + trigger SECURITY DEFINER (Story 1.4)        |
| `supabase/rollbacks/0002_profiles_*.sql` | Rollback companion — DROPs em ordem reversa (Story 1.4)             |
| `supabase/seed.sql`                      | 3 profiles demo idempotentes (Story 1.4) — **não aplicado em prod** |

### Seed demo (Story 1.4)

`supabase/seed.sql` cria 3 users em `auth.users` que disparam o trigger `auth_user_created` e geram 3 rows em `profiles`:

| Username | Email             | Password        | display_name | bio                             |
| -------- | ----------------- | --------------- | ------------ | ------------------------------- |
| alice    | alice@example.com | testpassword123 | Alice Demo   | Building cool things…           |
| bob      | bob@example.com   | testpassword123 | Bob Demo     | Hello from BioLink.             |
| carol    | carol@example.com | testpassword123 | _NULL_       | _NULL_ (testa colunas nullable) |

**Senhas demo são públicas e intencionalmente fracas — usar apenas em dev/CI.** UUIDs hardcoded (`0001…`/`0002…`/`0003…`) para reprodutibilidade.

### Smoke test pós-`db reset`

```bash
# Esperado: 3 rows após seed
pnpm exec supabase db reset --linked
psql "$DATABASE_URL" -c "SELECT count(*) FROM profiles;"  # → 3
psql "$DATABASE_URL" -c "SELECT username, display_name FROM profiles ORDER BY username;"
# alice | Alice Demo
# bob   | Bob Demo
# carol | NULL
```

> Não há `DATABASE_URL` no `.env.local` por padrão (cliente normal usa o Supabase JS SDK). Para `psql` ad-hoc, monte: `postgresql://postgres.<project_ref>:<db_password>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require`. Senha em dashboard Supabase → Project Settings → Database.

### Rollback em prod (Phase 2+)

Para reverter `0002_profiles.sql` em projeto remoto:

```bash
# 1. Snapshot pré-rollback (obrigatório)
pnpm exec supabase db dump --linked > .ai/snapshots/pre-rollback-$(date +%s).sql

# 2. Aplicar rollback companion
psql "$DATABASE_URL" -f supabase/rollbacks/0002_profiles_rollback.sql

# 3. Validar
psql "$DATABASE_URL" -c "\dt profiles"  # → relation does not exist
```

⚠️ **`profiles` cascateia em todas as tabelas filhas** (pages, links, etc. quando existirem). Rodar rollbacks em **ordem reversa** das migrations.

---

## 13. Configuração de Auth (Story 1.6 — definitivo)

> **Escopo:** Story 1.6 reverte o toggle transitório de 1.5 (`mailer_autoconfirm: true`) e habilita o fluxo definitivo de verificação de email + reset de senha via `/auth/callback` (PKCE `exchangeCodeForSession`) + Server Actions `requestPasswordReset` / `confirmPasswordReset` / `resendVerificationEmail`.

### Settings finais em `biolink-dev` (ref `ibpliihqaceafdykgwiu`)

| Setting                                                                        | Valor                                                                                                                                                    | Motivo                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mailer_autoconfirm` (Dashboard: **Auth → Providers → Email → Confirm email**) | `false` (requer confirmação)                                                                                                                             | AC1 de Story 1.6 — usuário precisa clicar no link do email antes de ter session ativa. Flow: signUp → email → `/auth/callback` → `exchangeCodeForSession` → dashboard. |
| `site_url`                                                                     | `http://localhost:3000`                                                                                                                                  | Base para `{{ .SiteURL }}` nos templates; em prod aponta para domínio Vercel.                                                                                          |
| `uri_allow_list`                                                               | `http://localhost:3000/auth/callback,https://*.vercel.app/auth/callback,https://new-biolink.vercel.app/auth/callback`                                    | Allowlist do `redirectTo` que Server Actions passam para `resetPasswordForEmail` — sem allowlist correto, Supabase recusa por segurança.                               |
| `mailer_subjects_confirmation`                                                 | `Confirme seu email no BioLink`                                                                                                                          | Template PT-BR do email de signup.                                                                                                                                     |
| `mailer_templates_confirmation_content`                                        | HTML PT-BR com `{{ .ConfirmationURL }}` apontando para `/auth/callback?code=...&type=signup`                                                             | Idem.                                                                                                                                                                  |
| `mailer_subjects_recovery`                                                     | `Redefina sua senha do BioLink`                                                                                                                          | Template PT-BR do email de password recovery.                                                                                                                          |
| `mailer_templates_recovery_content`                                            | HTML PT-BR com `{{ .ConfirmationURL }}` (Supabase injeta `code` + path do `redirectTo` da Server Action — `/auth/callback?next=/reset-password/confirm`) | Idem.                                                                                                                                                                  |
| `password_min_length`                                                          | `6` (default)                                                                                                                                            | Server-side; o validator Zod (`lib/validators/auth.ts`) impõe mínimo 8 chars no client + server-side parse.                                                            |

### Como aplicar (canônico — Story 1.6)

```bash
PROJECT_REF=ibpliihqaceafdykgwiu
TOKEN=$SUPABASE_ACCESS_TOKEN  # do .env.local

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_autoconfirm": false,
    "site_url": "http://localhost:3000",
    "uri_allow_list": "http://localhost:3000/auth/callback,https://*.vercel.app/auth/callback,https://new-biolink.vercel.app/auth/callback",
    "mailer_subjects_confirmation": "Confirme seu email no BioLink",
    "mailer_templates_confirmation_content": "<h2>Bem-vindo(a) ao BioLink!</h2><p>Clique no link abaixo para confirmar seu email e acessar sua conta:</p><p><a href=\"{{ .ConfirmationURL }}\">Confirmar email</a></p><p>Se você não criou esta conta, ignore este email.</p>",
    "mailer_subjects_recovery": "Redefina sua senha do BioLink",
    "mailer_templates_recovery_content": "<h2>Redefinição de senha</h2><p>Recebemos um pedido para redefinir sua senha. Clique no link abaixo para escolher uma nova senha:</p><p><a href=\"{{ .ConfirmationURL }}\">Redefinir senha</a></p><p>O link expira em 1 hora. Se você não solicitou redefinição, ignore este email.</p>"
  }'
```

Templates `mailer_subjects_*` para `magic_link`, `invite` e `email_change` permanecem com strings default em inglês — revisitar quando features futuras (magic link, admin invite, profile edit) os exigirem.

`{{ .ConfirmationURL }}` é o placeholder do template engine GoTrue. Supabase substitui pelo URL completo `${site_url}` + path do `redirectTo` que a Server Action passa (`/auth/callback?code=...&type=signup` para signup, `/auth/callback?code=...&next=/reset-password/confirm` para recovery).

### Impacto em CI

- `tests/integration/server-actions/auth.test.ts` foi atualizado nesta story para o novo modelo: o cenário de signUp passa a verificar `auth.users.email_confirmed_at IS NULL` (não confirmado pós-signUp) em vez de aguardar `NEXT_REDIRECT`. Profile row continua existindo via trigger `on_auth_user_created` (Story 1.4 — disparado independente de confirmação).
- Novos cenários cobrem `requestPasswordReset` (anti-enumeration), `confirmPasswordReset` (auth guard) e `resendVerificationEmail` (auth guard).
- `pnpm build` em CI exige `NEXT_PUBLIC_SITE_URL` em GH Secrets/Vars (env compile-time é resolvido em build). Handoff a @devops antes do PR merge.

### Reativar em produção (`biolink-prod`)

`biolink-prod` (a ser criado em pipeline de release pública) **DEVE** receber o mesmo payload com `PROJECT_REF` correspondente — `mailer_autoconfirm: false`, templates PT-BR aplicados, allowlist apontando para `https://new-biolink.vercel.app/auth/callback` + Vercel previews. Cross-ref Story 1.3 (secrets pipeline) e Story 1.6 (este capítulo).

### Histórico — Story 1.5 (transitório, revertido)

Story 1.5 aplicou `mailer_autoconfirm: true` como decisão transitória para destravar o fluxo `signUp → /dashboard` enquanto o callback handler ainda não existia. Comando de referência:

```bash
PROJECT_REF=ibpliihqaceafdykgwiu
TOKEN=$SUPABASE_ACCESS_TOKEN
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mailer_autoconfirm": true}'
```

Story 1.6 reverteu este toggle e implementou o fluxo definitivo. Esta sub-seção fica como histórico para reviewers que precisarem entender a trajetória.

---

## Referências

- [`docs/architecture.md`](architecture.md) §Frontend Services Layer > API Client Setup
- [`docs/architecture.md`](architecture.md) §Tech Stack
- [`docs/architecture.md`](architecture.md) §CI/CD Pipeline (Story 1.3)
- Story 1.2 — setup inicial Supabase clients + env validation
- Story 1.3 — CI/CD pipeline, Husky, secrets em Vercel/GHA
- Story 1.4 — primeiro schema real
- Story 1.5 — UI Auth (signup/login/logout) + decisão `mailer_autoconfirm` transitória
