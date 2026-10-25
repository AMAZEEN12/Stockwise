# Stockwise

Stock and customer-credit ledger for one demonstration shop (TeSA Cohort 6 capstone, Team 3 main product). Context for any AI agent or new team member. Read it at the start of every session.

**Before starting any new task:** read `sdlc/WORKLOG.md` first, then this file, especially [Mistakes to avoid](#mistakes-to-avoid). Those corrections are standing instructions for future work, not a one-time cleanup. Before writing or copying frontend components, review the Tailwind replacements below; before finishing, check that the touched components do not reintroduce them. The decision and attribution are recorded as DM41 in `decisions.md`.

**Before frontend work:** read [.claude/skills/shared-components/SKILL.md](.claude/skills/shared-components/SKILL.md), inspect the actual local component APIs, and consult [Stockwise shared-component alignment](docs/shared-component-alignment.md) for approved local adaptations and pending owner proposals (DM55). Use shared primitives; retain Stockwise tokens and DM41's canonical classes. Victor approved local implementation; do not label proposed extensions as accepted by other engineers.

> Frontend commands below are implemented and verified; actual output is in sdlc/WORKLOG.md. Backend run/deployment commands remain planned. Earlier service results are upstream evidence, not this machine's verification.

Current frontend state (2026-10-25): Sales History on `feat/sales-history` (DM57-DM58; existing ID-only contract, non-interactive entries; see [implementation](docs/sales-history-ui.md)), Home/authentication, Products, New sale/Receipt, Customer Picker (`feat/customer-picker`) and Customers (`feat/customers-ui`). See [customer UI](docs/customers-ui.md), [customer proposals](docs/customers-contract-proposal.md), [products/sales UI](docs/products-sales-ui.md) and actual verification in `sdlc/WORKLOG.md`. Registration, settlement/quotes and idempotent customer creation remain pending API approval. Current customer POST is non-idempotent: no automatic retry; preserve uncertain user/service-bound attempts. Local design exports in `web/Screens/` are ignored, never runtime imports. Backend HTTP implementation remains with the service owners.

## Commands
- Database (local): `docker compose up -d db` (healthy: `db ... Started`)
- Service build and test **(verified 2026-10-23)**: `cd service && ./mvnw verify` (healthy: `Tests run: 11, Failures: 0, Errors: 0, Skipped: 0` then `BUILD SUCCESS`). Needs **Docker Desktop running** for Testcontainers (Postgres 17). On Windows Docker Desktop is installed per-user at `%LOCALAPPDATA%\Programs\DockerDesktop`.
- Undo migrations (rollback): `cd service && ./mvnw -Pundo -Dundo.target=<n-1> exec:java` with `DATABASE_JDBC_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` set (verified by `MigrationRollbackIT`; not yet run against a real database)
- Service run: `cd service && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local,demo` (healthy: `Started StockwiseApplication`). `curl localhost:8080/api/v1/health` returns `{"status":"UP"}`.
- Contract lint **(verified 2026-10-23)**: `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` (healthy: `Woohoo! Your API description is valid.`)
- Development simulation **(verified 2026-10-24)**: `cd web && npm run mock` (healthy: `Development simulation listening on http://127.0.0.1:4710`). In-memory products, customers, sales and mock sessions; not backend authentication or concurrency evidence. Restart to reset demonstration data. `npm run mock -- --role=ASSISTANT` or `--role=ADMIN` selects a simulated role. `npm run mock:prism` retains the original contract-only Prism mode; never start both on the same port. `npm run check:mock` checks actual browser authentication; `npm run check:shop` checks local API behavior. Public inputs in `.env.example` are not seeded accounts.
- Web (implemented): `cd web && npm ci && npm run lint && npm run typecheck && npm test -- --run && npm run build`. Lint uses ESLint with zero warnings; typecheck uses strict tsc; browser checks use `npx playwright test` after `npx playwright install chromium`. See WORKLOG for actual results.
- Web dev against the mock: `cd web && VITE_API_BASE_URL=http://127.0.0.1:4710 npm run dev`

## Conventions
- Java 25, Spring Boot 4, Maven wrapper, Flyway, Spring `JdbcClient` with **hand-written SQL, no JPA** (DM1, DM17, DM18). Frontend: React 19 + TypeScript strict + Vite + React Router **Data Mode**, Tailwind, Axios, Formik/Yup, Redux Toolkit and RTK Query (DM32 supersedes DM21's TanStack Query choice). Pin current compatible package versions when the runnable foundation is authorized; install nothing in the folder-only phase.
- **Money is always integer kobo**: `BIGINT` in SQL, `long` in Java, JSON integers. Never `double`, `float`, `BigDecimal` or `numeric`. Format as ₦ only in `web/src/lib/money.ts`, using integer arithmetic.
- **Business rules live in the database**: `CHECK` constraints plus conditional `UPDATE … WHERE <guard> RETURNING`. Never read a value, check it in Java and then write it.
- Every POST that records money or stock takes an `Idempotency-Key` header (sales, restocks, repayments).
- The ledger is append-only. Corrections are reversals, never `UPDATE` or `DELETE` on movement or ledger rows.
- Times are stored in UTC. "Today" means the Africa/Lagos day (DM14).
- Contract first: no endpoint without its path in `contract/openapi.yaml`. Every contract change gets a dated line in `decisions.md` §3 signed by two engineers.
- Every business rule has a test that **fails when the rule is removed**.
- Every new migration `V<n>__x.sql` ships with `db/rollback/U<n>__x.sql` (DM13).
- Decision entries record "Decided by" and "Logged by" separately.
- Frontend API calls: one file per resource in `web/src/service/api/` (for example `products.api.ts`), referencing URL definitions in `service/endpoints/`. The frontend `service/` is distinct from the root Java `service/`.
- The future `web/src/service/http-client.ts` owns shared Axios configuration, headers and error normalization. Preserve field errors and existing operation-specific headers, including `Idempotency-Key` and `If-Match`. Never generate a new submission key on a retry of the same write.
- Request/response models belong in `web/src/models/requests/` and `responses/`, derived from generated contract types. Yup form validation belongs in `web/src/schema/`; it does not replace the OpenAPI contract. Do not invent endpoints or wire models before the contract exists.
- Image files belong in `web/src/assets/images/`, with a central `index.ts` of named exports added when assets exist. Reusable UI belongs in `components/ui/`; feature-specific components stay with their feature. Shared hooks, constants and utilities belong in `shared/`.
- The **four interface engineers' agreement** adopts the shared React/TypeScript/Tailwind/Radix copy-in source (DM37, engineer count corrected by DM53). Victor Oyeleke confirmed and approved the correction on 2026-10-25; logged by Codex. Stockwise token values are authoritative; retain shared token names and source ownership. Read `docs/shared-component-alignment.md` for the approved Card and Select/Checkbox source clarifications; local extensions remain documented in `docs/auth-ui-implementation.md`. Shadcn is not required.
- Work on separate branches: `chore/web-structure` for the starter, `feat/<feature>` for features and `fix/<bug>` for fixes. Use descriptive commit subjects such as `feat(auth): add responsive login screens`. Review and merge gates in REVIEW.md still apply after the explicitly authorized initial documentation baseline on `main` (DM36).

## Architecture
- `contract/`: OpenAPI 3.1, the single source of the API, plus the mock.
- `service/`: Spring Boot app, package `ng.tesa.stockwise` (`config`, `auth`, `product`, `sale`, `restock`, `customer`, `reversal`, `history`, `dashboard`, `common`). Migrations in `src/main/resources/db/migration`, undo scripts in `db/rollback`, seed in `db/seed`.
- `web/`: React app. API types are generated from the contract into `src/api/schema.d.ts`.
- `load/`: k6 load tests and the deployed last-unit concurrency script.
- `.github/workflows/`: `ci.yml` (gate), `deploy.yml` (both hosting stacks, see `deploy-plan.md`), `concurrency-evidence.yml`.
- `docs/`: decision records, data model, AI log, friction notes.

## Protected paths
- `web/src/api/schema.d.ts` is generated. Regenerate it, never edit it by hand.
- An applied migration in `db/migration/` is frozen. Write a new `V<n+1>` instead.
- `deploy/*` branches are pushed only by the deploy workflow.
- `evidence/no-stock-guard` exists only to show the concurrency test failing. Never merge it.
- Don't edit test files during a bug fix (fix the code, not the test).

## Mistakes to avoid
Rule: when an agent makes the same mistake twice, the correction goes here.
- Keep Vite's watcher away from generated Playwright results/traces, reports, ignored mock scratch files and design exports. On Windows an exclusively locked trace can crash the dev server with EBUSY and cause unrelated connection-refused failures. Run expensive build checks separately from browser/axe runs on this machine (shared-component QA, 2026-10-25; logged by Codex).
- On Windows PowerShell, set `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)` before piping source text into Python, or use ASCII Unicode escapes. The default pipe encoding can replace punctuation with question marks. Use an explicit repository root in file-edit scripts and run npm commands from `web/`; verify the resulting copy before browser QA (shared-component alignment, 2026-10-25; logged by Codex).
- UI capture checks must verify computed layout as well as interaction: an existing Vite preview can retain an earlier plugin configuration after branch switching. Use a separate PLAYWRIGHT_PORT for current-config QA, preserve user-owned servers, and check fixed dialogs remain within the viewport. Tailwind v4 uses individual translate properties; mobile overrides need translate:none as well as transform:none (Customer Picker, 2026-10-25; logged by Codex).
- Browser mock routes ending in /customers must guard the HTTP method before handling POST; otherwise they can intercept the SPA document /app/customers and return JSON or hang navigation. Keep the actual browser/API journey without interception as a separate check (Customers, 2026-10-25; logged by Codex).
- Decorative error icons must use aria-hidden SVG rather than literal exclamation-mark text. Literal decoration contaminates exact visible-copy checks even when hidden from assistive technology; preserve the message and fix the icon instead of weakening assertions (auth and Sales checks, 2026-10-24; logged by Codex).
- Removing a CHECK that is the last item in a `CREATE TABLE` leaves a dangling comma. When proving a rule test fails, make sure it fails on the rule, not on a syntax error (rule-removal log, R12).
- Never leave backup or scratch files under `src/main/resources/db/`. `MigrationRollbackIT` treats every file there as a migration, and stale copies survive in `target/` until `./mvnw clean`.

### Recurring Tailwind class mistakes (DM41)

**Decided by:** Victor Oyeleke. **Logged by:** Codex. **Date:** 2026-10-24. Victor reaffirmed that this must guide every new task, not only the initial replacements.

| Do not reintroduce | Use instead |
|---|---|
| `focus-visible:[outline-offset:var(--focus-ring-offset)]` | `focus-visible:outline-offset-(--focus-ring-offset)` |
| `rounded-[var(--radius-md)]` | `rounded-md` |
| `font-[family-name:var(--font-sans)]` | `font-sans` |

Apply these replacements when creating, editing or copying shared components. Preserve Stockwise's existing `--radius-md: 10px`, Inter Tight `font-sans` mapping and configured focus offset. These particular arbitrary-value classes are valid syntax, but their canonical equivalents are the required project convention. Keep arbitrary values where no equivalent utility exists; do not change the design just to shorten a class.

## Verifying your work
Run these before reporting any task complete, and paste the output (full list in `sdlc/test-plan.md`):
- Service: `cd service && ./mvnw verify` (must end with `BUILD SUCCESS`. Includes Testcontainers integration, contract and migration up/down/up tests, and JaCoCo ≥ 80% on rule packages)
- Contract: `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` (valid, no errors)
- Web: `cd web && npm run lint && npm run typecheck && npm test -- --run` (zero errors and warnings, all tests green)
- UI change: `cd web && npx playwright test` (axe: 0 serious or critical issues)

If a test fails, fix the code, not the test. Never skip, disable or delete a failing test. On `fix/*` branches, CI rejects test edits after the failing test is committed. If you touched a business rule, also run its test with the guard removed once, confirm it fails, and log it in `docs/rule-removal-log.md`.

## Lifecycle work in progress
Artifacts live in `sdlc/`. Before doing any work, read `sdlc/WORKLOG.md` first: it holds the current state, the next action, every decision made so far, and the agreed conventions. Continue from its "Resume here" section, follow its decisions and conventions, and update it as you work. Then read `sdlc/intent.md`, `sdlc/spec.md` and `sdlc/plan.md` before changing code. Product decisions are in `decisions.md`.
