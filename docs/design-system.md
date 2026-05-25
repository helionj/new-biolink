# BioLink Design System

> **Inventário canônico** dos componentes do design system BioLink (Story 3.4).
> Source of truth: este documento + os arquivos em `components/ui/` (primitives) e `components/{feature}/` (feature components). Mudanças nos primitives requerem atualização manual deste doc — trade-off pragmático documentado em §Convenções.

---

## Visão Geral

O design system BioLink é construído sobre **shadcn/ui** (copy-paste, owned em `components/ui/`) + **@base-ui/react** (primitives a11y headless). Tokens de cor/spacing/radius vivem em `app/globals.css` via CSS variables sob `[data-theme="light|dark|brand"]` (Story 3.1/3.2). Não há dependência runtime — todos os componentes são "owned" e podem ser customizados localmente.

| Camada             | Tecnologia               | Story origem |
| ------------------ | ------------------------ | ------------ |
| Tokens (CSS vars)  | `app/globals.css`        | 3.1 / 3.2    |
| Primitives a11y    | `@base-ui/react`         | 1.5 / 1.8    |
| Shadcn ownership   | `components/ui/`         | 1.5 / 1.8    |
| Feature components | `components/{feature}/`  | 2.1+         |
| WCAG AA gate (CI)  | `scripts/check-contrast` | 3.2          |

---

## Primitives (`components/ui/`)

### Card (Story 3.4)

- **Path:** `components/ui/card.tsx`
- **API:** `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardAction>`, `<CardContent>`, `<CardFooter>`
- **Variantes:** `size` (`default` / `sm`) via `data-size` attribute
- **Tokens:** `--card`, `--card-foreground`, `--muted/50`, `--foreground/10` (ring)
- **A11y:** semantic HTML via `<div>`; ARIA aplicado pelo consumidor (`role="region"` opcional).
- **Uso típico:** containers de seção em `/dashboard/*`, MetricsCards (futuro), preview cards.
- **Test:** `tests/components/ui/card.test.tsx` (4 cenários — root, size variant, composição, snapshot).

### Avatar (Story 1.5 seed; tests + inventário Story 3.4)

- **Path:** `components/ui/avatar.tsx`
- **API:** `<Avatar>`, `<AvatarImage>`, `<AvatarFallback>`, `<AvatarBadge>`, `<AvatarGroup>`, `<AvatarGroupCount>`
- **Primitive base:** `@base-ui/react/avatar`
- **Variantes `size`:** `default` (size-8), `sm` (size-6), `lg` (size-10) via `data-size` attribute
- **Tokens:** `--background`, `--border`, `--muted`, `--muted-foreground`, `--primary`, `--primary-foreground` (badge)
- **Uso típico:** `<UserMenu>` (dashboard header), `<AvatarUpload>` (profile editor), `<PublicPage>` (página pública).
- **Test:** `tests/components/ui/avatar.test.tsx` (8 cenários — root, sizes, fallback, image+fallback degradação, badge, group, snapshot, data attributes).
- **Caveat de testes:** o `@base-ui/react/avatar` só monta o `<img>` no DOM após `onLoadingStatusChange="loaded"` — em jsdom esse evento não dispara para URLs externas. Testes do AvatarImage validam o **comportamento de degradação** (fallback visível durante loading) em vez do `<img>` final.

### Dialog ≡ Modal (Story 1.5 seed; tests + inventário Story 3.4)

> **Drift Resolution (Story 3.4 DEV-1):** o PRD §Epic 3 / Story 3.4 AC1 menciona "Modal"; a implementação canônica adotou `dialog.tsx` (convenção shadcn upstream + `@base-ui/react/dialog`). **Dialog ≡ Modal** — aliases semânticos do mesmo primitive. `docs/architecture.md` §Frontend Architecture L1027 ainda lista `modal.tsx` — drift cosmético registrado em backlog STORY-3.4-F1 (LOW).

- **Path:** `components/ui/dialog.tsx`
- **API:** `<Dialog>`, `<DialogTrigger>`, `<DialogContent>`, `<DialogOverlay>`, `<DialogClose>`, `<DialogHeader>`, `<DialogFooter>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogPortal>`
- **Primitive base:** `@base-ui/react/dialog`
- **A11y (Story 3.4 AC3):**
  - **Focus trap:** automático (via `@base-ui/react/dialog`).
  - **ESC fecha:** `onKeyDown` → `onOpenChange(false)`.
  - **Click outside fecha:** click no `<DialogOverlay>` (configurável via `dismissible` prop do base-ui).
  - **ARIA:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` ↔ `<DialogTitle>` + `aria-describedby` ↔ `<DialogDescription>`.
- **Tokens:** `--popover`, `--popover-foreground`, `--foreground/10` (ring), `--muted/50` (footer).
- **Uso típico:** `<AddLinkModal>` (Story 2.5), confirmações destrutivas (delete link/account).
- **Test:** `tests/components/ui/dialog.test.tsx` (8 cenários — controlado, trigger, ESC, overlay click, close button, ARIA, DialogClose, snapshot).

### Outros primitives (Stories 1.5 / 1.8)

| Primitive     | Path                              | Notas                                                                                                                                                 |
| ------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button        | `components/ui/button.tsx`        | Variantes `default/destructive/outline/secondary/ghost/link`; sizes `default/sm/lg/icon/icon-sm`; polimórfico via `render` (`@base-ui/react/button`). |
| Input         | `components/ui/input.tsx`         | Types `text/email/password/...`; `aria-invalid` automático com `<FormControl>`.                                                                       |
| Form          | `components/ui/form.tsx`          | Wrappers para `react-hook-form` + `zodResolver` — `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`.             |
| Label         | `components/ui/label.tsx`         | Peer de `<FormItem>`; auto-associa via `htmlFor`.                                                                                                     |
| Sonner/Toast  | `components/ui/sonner.tsx`        | `<Toaster/>` global em `app/layout.tsx`; chamadas via `lib/toast.ts` helper.                                                                          |
| Switch        | `components/ui/switch.tsx`        | Toggle controlado (Story 2.5 `LinkRow` visibilidade).                                                                                                 |
| Dropdown Menu | `components/ui/dropdown-menu.tsx` | `<UserMenu>` (dashboard header).                                                                                                                      |
| Sheet         | `components/ui/sheet.tsx`         | Drawer mobile (`<MobileDrawer>` Story 2.4).                                                                                                           |
| Alert Dialog  | `components/ui/alert-dialog.tsx`  | Confirmações destrutivas (`DeleteLinkDialog`).                                                                                                        |

---

## Feature Components

### AvatarUpload (Story 3.4)

- **Path:** `components/profile/AvatarUpload.tsx`
- **Consumido por:** `app/dashboard/profile/page.tsx`
- **Server Action:** `uploadAvatar(formData: FormData)` em `server/profile/actions.ts`
- **Storage:** bucket `avatars` (RLS em `0006_storage_avatars.sql`), path `{auth.uid()}/avatar.{ext}`
- **Validação:** `UploadAvatarInput` Zod (`lib/validators/profile.ts`) — max 1 MB, jpg/png/webp
- **UX:** optimistic preview via `URL.createObjectURL` + rollback em erro; `useTransition` para `isPending`; toast feedback.
- **Test:** `tests/components/features/profile/AvatarUpload.test.tsx` (7 cenários — fallback initials, fallback ausente quando URL set, click programático no input, sucesso, erro rollback, disabled durante pending).

### Outros feature components (referência)

| Component                            | Path                                              | Story |
| ------------------------------------ | ------------------------------------------------- | ----- |
| `<UsernameForm>`                     | `components/profile/UsernameForm.tsx`             | 2.1   |
| `<UsernameAvailabilityHint>`         | `components/profile/UsernameAvailabilityHint.tsx` | 2.1   |
| `<LinkList>` / `<LinkRow>`           | `components/links/`                               | 2.6   |
| `<AddLinkModal>`                     | `components/links/AddLinkModal.tsx`               | 2.5   |
| `<DeleteLinkDialog>`                 | `components/links/DeleteLinkDialog.tsx`           | 2.5   |
| `<ThemeSelector>` / `<ThemePreview>` | `components/theme/`                               | 3.3   |
| `<PublicPage>` / `<PublicLinkCard>`  | `components/public/`                              | 2.7   |

---

## Tokens (`app/globals.css`)

> Definidos sob `[data-theme="light|dark|brand"]` (Story 3.1 arquitetura, Story 3.2 paletas finais). 3 paletas validadas WCAG AA via `pnpm check:contrast` (27/27 PASS baseline pós-3.2).

| Token                  | Light     | Dark      | Brand     |
| ---------------------- | --------- | --------- | --------- |
| `--background`         | `#ffffff` | `#09090b` | `#faf5ff` |
| `--foreground`         | `#0f172a` | `#fafafa` | `#2e1065` |
| `--primary`            | `#7c3aed` | `#a78bfa` | `#7c3aed` |
| `--primary-foreground` | `#ffffff` | `#1e1b4b` | `#ffffff` |
| `--muted`              | `#f1f5f9` | `#27272a` | `#ede9fe` |
| `--muted-foreground`   | `#475569` | `#a1a1aa` | `#5b21b6` |
| `--card`               | `#ffffff` | `#09090b` | `#ffffff` |
| `--card-foreground`    | `#0f172a` | `#fafafa` | `#2e1065` |

Inventário completo (border/ring/destructive/popover/etc.) em `app/globals.css`.

---

## Convenções

- **Importações:** sempre `@/components/ui/{primitive}` (TS path alias).
- **Customização:** override de classes via `className` (mergeado com `cn()` de `@/lib/utils`).
- **Variantes adicionais:** estender via `cva()` no arquivo do primitive (não fork).
- **A11y:** todo primitive interativo deve passar pelo gate `@qa` com checagem manual de teclado + leitor de tela smoke.
- **Documentação:** este doc é Markdown estático — mudanças nos primitives requerem update manual. Considerado over-engineering automatizar parsing dos `.tsx` para gerar a referência (trade-off pragmático, mesmo aplicado em `scripts/check-contrast.mjs`).

---

## Cobertura de Testes

| Componente   | Story origem | Cobertura alvo | Test file                                                 |
| ------------ | ------------ | -------------- | --------------------------------------------------------- |
| Button       | 1.8          | 100%           | `tests/components/ui/button.test.tsx`                     |
| Input        | 1.8          | 100%           | `tests/components/ui/input.test.tsx`                      |
| Form         | 1.8          | 88.88%         | `tests/components/ui/form.test.tsx`                       |
| Sonner/Toast | 1.8          | 100%           | `tests/components/ui/sonner.test.tsx`                     |
| Card         | 3.4          | 100% (novo)    | `tests/components/ui/card.test.tsx`                       |
| Avatar       | 3.4          | ≥ 50%          | `tests/components/ui/avatar.test.tsx`                     |
| Dialog       | 3.4          | ≥ 50%          | `tests/components/ui/dialog.test.tsx`                     |
| AvatarUpload | 3.4          | ≥ 50%          | `tests/components/features/profile/AvatarUpload.test.tsx` |

---

## Storage Integration (Story 3.4)

- **Bucket:** `avatars` — público (`public: true`, 1 MB, jpg/png/webp), DEV-5 ratificado por `@data-engineer`.
- **RLS:** 4 policies em `storage.objects` — `avatars_select_public` (qualquer um SELECT), `avatars_insert_own` / `avatars_update_own` / `avatars_delete_own` (path check `{auth.uid()}/`).
- **Migration:** `supabase/migrations/0006_storage_avatars.sql` + rollback companion.
- **Integration test:** `tests/integration/rls/storage.test.ts` (5 cenários AC2 a-e).
- **Schema doc:** `docs/architecture/schema-design.md` Change Log v0.5.

---

## Backlog / Drift

- **STORY-3.1-F1** (LOW): refactor `@custom-variant dark` para eliminar `.dark` (mantém `[data-theme="dark"]` único). Bloqueado por shadcn primitives que dependem do `dark:` Tailwind variant.
- **STORY-3.2-F1** (LOW): refactor `scripts/check-contrast.mjs` para parser CSS automatizado (eliminar duplicação de paletas).
- **STORY-3.4-F1** (LOW — novo): `docs/architecture.md` §Frontend Architecture L1027 lista `modal.tsx`, mas o código adota `dialog.tsx` (precedente upstream + 4 consumidores em produção). Atualizar arch.md para refletir Dialog ≡ Modal (drift cosmético).
- **STORY-3.4-F2** (LOW — novo): ext change cleanup. Trocar avatar jpg→png deixa o `.jpg` antigo órfão no bucket (path determinístico `{uid}/avatar.{ext}` é estável por ext). 99% dos usuários trocam jpg→jpg — mitigação postergada para Story 4.5 (deleteAccount) que já varre todos os objetos do user.
