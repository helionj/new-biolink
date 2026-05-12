# QA — Known Issues & Tech-Debt

Issues conhecidos no fluxo de QA deste projeto. Atualizar quando descoberto / resolvido.

---

## QA-001 — `@qa *review` trava em ambientes sem WSL/CodeRabbit

**Discovered:** 2026-05-07 (Story 1.1)
**Severity:** Medium
**Status:** Open — workaround manual aplicado em 1.1
**Affects:** Qualquer `@qa *review {storyId}` neste projeto

### Sintoma

Comando `@qa *review {storyId}` fica parado sem mensagem de erro. Não há output, não há prompt interativo visível, sessão precisa ser interrompida manualmente.

### Causa raiz

A task `.aiox-core/development/tasks/qa-review-story.md` inicia (Seção 0) com o **CodeRabbit Full Self-Healing Loop**, que executa:

```bash
wsl bash -c '... ~/.local/bin/coderabbit --prompt-only -t committed --base main'
```

Três incompatibilidades neste projeto:

1. Ambiente é macOS (darwin) — `wsl` não existe.
2. CodeRabbit CLI não está instalado (`~/.local/bin/coderabbit` ausente).
3. `coderabbit_integration` não está configurado em `.aiox-core/core-config.yaml` — mas a Seção 0 da task **não checa o flag** antes de executar; entra direto no loop e fica esperando output que nunca virá.

### Workaround atual

Para stories sem código funcional / sem testes (ex.: bootstrap, docs-only):

1. Pular `*review` e fazer **gate manual** com base no quality gate do `@architect` (typecheck/lint/build).
2. Criar gate file diretamente em `docs/qa/gates/{epic}.{story}-{slug}.yml` seguindo schema de `qa-gate.md`.
3. Popular seção `## QA Results` na story manualmente com os 7 checks.
4. Documentar no Change Log da story que foi gate manual + motivo.

**Exemplo aplicado:** Story 1.1 → `docs/qa/gates/1.1-bootstrap-do-projeto.yml` (Change Log v0.6).

Para stories com código funcional / testes a partir de 1.2+: avaliar antes de cada review se o workaround manual ainda é apropriado, ou se vale instalar CodeRabbit nativamente em macOS / patchar a task.

### Soluções permanentes possíveis

- **Upstream fix (preferido):** Adicionar guard `if (!coderabbit_integration?.enabled) skip Section 0` no template `qa-review-story.md`. Como o arquivo está em L2 (framework, never modify per `.claude/settings.json` deny rules + Constitution), isso requer PR no framework AIOX.
- **Local override:** Instalar CodeRabbit CLI nativamente em macOS (`brew install coderabbitai/cli/coderabbit` ou similar) + configurar `coderabbit_integration.enabled: true` em `core-config.yaml`. Removeria o hang, mas adiciona dependência externa.
- **Custom QA agent override:** Criar variante do agente `@qa` em `.aiox-core/development/agents/` (L3, mutable) que ignore Seção 0 — viola Article II (Agent Authority) se sobrepuser comportamento canônico, então não recomendado.

### Tracking

- Workaround documentado em Story 1.1 Change Log v0.6 e neste arquivo.
- Decisão sobre solução permanente: pendente. Reabrir antes de Story 1.2 entrar em QA.

---

## QA-002 — `pnpm-workspace.yaml` malformado quebra `pnpm <script>`

**Discovered:** 2026-05-08 (Story 1.1 pre-push)
**Severity:** Medium
**Status:** **Resolved** (2026-05-11, Story 1.2) — diagnóstico original incorreto; fix real abaixo.
**Affects:** Qualquer `pnpm <script>` (lint, typecheck, build, dev) e provavelmente CI futuro

### Sintoma

`pnpm lint` / `pnpm typecheck` / `pnpm build` falham com `sh: eslint: command not found` (ou equivalente). `node_modules/.bin/` não existe na raiz do projeto após `pnpm install`. Pacotes existem isolados em `node_modules/.pnpm/` mas sem symlinks hoisted.

### Causa raiz

`pnpm-workspace.yaml` contém apenas:

```yaml
allowBuilds:
  sharp: true
  unrs-resolver: true
```

`allowBuilds` **não é uma chave reconhecida pelo pnpm padrão** (provavelmente foi escrita pelo AIOX env-bootstrap como placeholder ou misturada com outra config). Sem o campo `packages:` válido, o pnpm trata o diretório como workspace root mas não cria os symlinks usuais em `node_modules/.bin/` na raiz.

### Workaround atual

`pnpm install --shamefully-hoist` força a criação de `node_modules/.bin/` com todos os bins hoisted. Aplicado nesta sessão antes do pre-push da Story 1.1.

### Soluções permanentes

1. **Recomendado — remover o arquivo:** Este projeto não tem sub-packages (`packages/`, `apps/`, etc.). Não há razão para `pnpm-workspace.yaml` existir. Deletar o arquivo restaura o comportamento padrão de pnpm em projeto single-package, e os bins voltam a `.bin/` automaticamente. Os `allowBuilds` correspondem a `pnpm.onlyBuiltDependencies` que **já está em `package.json`** — então o conteúdo é redundante.
2. **Alternativa — adicionar `.npmrc`:** Adicionar `shamefully-hoist=true` em `.npmrc` força hoisting permanentemente. Pior que (1) porque mantém o arquivo malformado e adiciona complexidade.
3. **Se workspace for desejado no futuro:** Criar `packages/` subdir com sub-packages reais e popular `pnpm-workspace.yaml` com `packages: ['packages/*']`. Não aplicável agora.

### Tracking

- Documentado em Story 1.1 Change Log v0.7.
- Endereçar em **Story 1.2 ou antes** — CI da Story 1.3 (GitHub Actions) vai falhar nas mesmas condições se não for resolvido.

### Resolução (2026-05-11, Story 1.2)

O diagnóstico original ("arquivo malformado, sem `packages:`") estava **incorreto**. Investigação durante Story 1.2 revelou:

1. `allowBuilds:` em `pnpm-workspace.yaml` **é uma chave válida** introduzida em pnpm 10+ — é o mecanismo oficial de aprovação de build scripts (`postinstall`, `install`, etc.) e substitui `pnpm.onlyBuiltDependencies` em `package.json`. Não requer `packages:` em repos single-package.
2. A causa raiz real do "comando não encontrado" em Story 1.1 era: scripts de build (`sharp install`, `unrs-resolver postinstall`) estavam **bloqueados aguardando aprovação** pelo pnpm 11; sem rodar, alguns binários hoisted ficavam ausentes em `node_modules/.bin/`.
3. O fix correto: `pnpm approve-builds --all` (uma vez por projeto) — escreve `pnpm-workspace.yaml` populado com todos os pacotes que têm build scripts. A partir daí, `pnpm install` roda os builds e cria os symlinks corretamente.
4. `--shamefully-hoist` "funcionou" em 1.1 mas por motivo errado (hoist global, não execução de postinstall).

**Estado final aplicado em Story 1.2:**

- ✅ `pnpm-workspace.yaml` **mantido** com `allowBuilds: { sharp, supabase, unrs-resolver }` (regenerado por `pnpm approve-builds --all`).
- ✅ `pnpm.onlyBuiltDependencies` **removido** de `package.json` (era redundância — `pnpm-workspace.yaml` é a single source of truth em pnpm 11).
- ✅ CI/dev podem rodar `pnpm install` direto, sem `--shamefully-hoist`.

**Lição:** quando um diagnóstico parece exigir "deletar arquivo de configuração que está sintaticamente correto", verificar a documentação da ferramenta antes de inferir malformação.

---

## CI-001 — `test-integration` SASL auth fail no Supabase Branching pooler

**Discovered:** 2026-05-12 (Story 1.3)
**Severity:** Medium (bloqueia AC2 de Story 1.3 — deferido para Story 1.4)
**Status:** Open — job desabilitado no MVP via comentário em `.github/workflows/ci.yml`
**Affects:** `.github/workflows/ci.yml` → job `test-integration`

### Sintoma

Job `test-integration` no CI conseguia criar branch Supabase via `supabase --experimental branches create`, obter `POSTGRES_URL` do pooler IPv4, mas falhava em `supabase db push --db-url "$SUPABASE_DB_URL"` com:

```
failed to connect to postgres: failed to connect to `host=aws-1-sa-east-1.pooler.supabase.com user=postgres database=postgres`:
failed SASL auth (FATAL: password authentication failed for user "postgres" (SQLSTATE 28P01))
Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD
```

### Cadeia de bugs descobertos (4 resolvidos, 1 bloqueio)

Durante validação real do pipeline via PR de teste (Story 1.3 / PR #1):

| # | Bug | Resolução |
|---|-----|-----------|
| 1 | `pnpm@11.x` requer Node ≥ 22.13 (`node:sqlite` builtin) | Downgrade para `pnpm@10.33.4` (commit `86316fe`) |
| 2 | `supabase branches create` exige flag `--experimental` na CLI moderna | Adicionado `--experimental` aos 4 invocations (commit `48fc78d`) |
| 3 | JSON de `branches get` mudou para uppercase env-var-shaped keys (não há mais `.db_url` assumido por arch §1888) | Trocar `.db_url` → `.POSTGRES_URL_NON_POOLING` (commit `0f7ea79`) |
| 4 | Runners GitHub-hosted sem IPv6 + Supabase Direct Connection IPv6-only sem IPv4 add-on pago | Trocar para `POSTGRES_URL` (pooler com IPv4) (commit `d9a15d6`) |
| **5** | **SASL auth fail no pooler — user "postgres" sem suffix `.project_ref` esperado pelo Supavisor** | **Bloqueado — deferido para Story 1.4** |

### Causa raiz provável

Pooler Supavisor da Supabase aceita usernames no formato `postgres.<project_ref>` (com suffix do branch/projeto). O `POSTGRES_URL` retornado pela API de branches da CLI v2.98.2 tem credenciais embedded em formato que provavelmente não inclui esse suffix (ou inclui mas a senha é diferente da database password do branch). Não há campo `db_password` explícito no JSON para construir URL manualmente.

### Workaround atual (MVP)

Job `test-integration` **comentado** em `.github/workflows/ci.yml` (linhas ~86-153). Story 1.3 fecha com AC2 marcado como DEFERIDO. Comentário no workflow documenta os 5 bloqueios + plano de re-ativação em Story 1.4.

Branch protection rule de `main` deve listar os **6 jobs verdes** restantes (install, lint, typecheck, test-unit, test-components, build, gitleaks, audit — sem test-integration).

### Resolução planejada (Story 1.4)

Story 1.4 introduz primeiro DDL real (RLS policies + auth tables) e portanto **precisa** de test-integration funcional para validar políticas. Plano:

1. **Investigar API direta da Supabase** — `https://api.supabase.com/v1/branches/{id}/credentials` (ou endpoint similar) pode retornar `db_user`/`db_password` separados em vez de URL pre-construído.
2. **Construir URL manualmente** com formato `postgresql://postgres.<branch_ref>:<password>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres` (suffix `.<branch_ref>` no user).
3. **Alternativa:** considerar `supabase db push --linked` apontando para projeto separado de "CI" em vez de Branching (single projeto compartilhado, com truncate antes de cada test). Trade-off: perde isolamento de PR mas evita pooler auth.
4. **Alternativa cara:** habilitar IPv4 add-on Supabase no projeto parent (paid, $4/mês) — permite usar `POSTGRES_URL_NON_POOLING` (direct) sem network unreachable.

Decisão final entre (2), (3), (4) deve ser feita por @architect + @data-engineer no início de Story 1.4.

### Tracking

- Story 1.3 Change Log v0.5 documenta cadeia completa de descoberta.
- Re-habilitar este job é tarefa explícita de Story 1.4.
