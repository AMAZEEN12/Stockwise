# Stockwise

Stock and customer-credit ledger for one demonstration shop (TeSA Cohort 6 capstone, Team 3 main product). Context for any AI agent or new team member. Read it at the start of every session.

> Commands below are **planned** (plan.md, Build stage). The first engineer to scaffold each part replaces "planned" with the verified command and its real healthy output.

## Commands
- Database (local): `docker compose up -d db` (healthy: `db ... Started`)
- Service build and test **(verified 2026-10-23)**: `cd service && ./mvnw verify` (healthy: `Tests run: 11, Failures: 0, Errors: 0, Skipped: 0` then `BUILD SUCCESS`). Needs **Docker Desktop running** for Testcontainers (Postgres 17). On Windows Docker Desktop is installed per-user at `%LOCALAPPDATA%\Programs\DockerDesktop`.
- Undo migrations (rollback): `cd service && ./mvnw -Pundo -Dundo.target=<n-1> exec:java` with `DATABASE_JDBC_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` set (verified by `MigrationRollbackIT`; not yet run against a real database)
- Service run: `cd service && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local,demo` (healthy: `Started StockwiseApplication`). `curl localhost:8080/api/v1/health` returns `{"status":"UP"}`.
- Contract lint **(verified 2026-10-23)**: `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` (healthy: `Woohoo! Your API description is valid.`)
- Mock server **(verified 2026-10-23)**: `npx @stoplight/prism-cli@5 mock contract/openapi.yaml --port 4710` (healthy: `Prism is listening on http://127.0.0.1:4710`)
- Web: `cd web && npm ci && npm run lint && npm run typecheck && npm test && npm run build`
- Web dev against the mock: `cd web && VITE_API_BASE_URL=http://127.0.0.1:4710 npm run dev`

## Conventions
- Java 25, Spring Boot 4, Maven wrapper, Flyway, Spring `JdbcClient` with **hand-written SQL, no JPA** (DM1, DM17, DM18). React 19 + TypeScript strict + Vite + Tailwind + TanStack Query (DM21).
- **Money is always integer kobo**: `BIGINT` in SQL, `long` in Java, JSON integers. Never `double`, `float`, `BigDecimal` or `numeric`. Format as ₦ only in `web/src/lib/money.ts`, using integer arithmetic.
- **Business rules live in the database**: `CHECK` constraints plus conditional `UPDATE … WHERE <guard> RETURNING`. Never read a value, check it in Java and then write it.
- Every POST that records money or stock takes an `Idempotency-Key` header (sales, restocks, repayments).
- The ledger is append-only. Corrections are reversals, never `UPDATE` or `DELETE` on movement or ledger rows.
- Times are stored in UTC. "Today" means the Africa/Lagos day (DM14).
- Contract first: no endpoint without its path in `contract/openapi.yaml`. Every contract change gets a dated line in `decisions.md` §3 signed by two engineers.
- Every business rule has a test that **fails when the rule is removed**.
- Every new migration `V<n>__x.sql` ships with `db/rollback/U<n>__x.sql` (DM13).
- Decision entries record "Decided by" and "Logged by" separately.

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
- Removing a CHECK that is the last item in a `CREATE TABLE` leaves a dangling comma. When proving a rule test fails, make sure it fails on the rule, not on a syntax error (rule-removal log, R12).
- Never leave backup or scratch files under `src/main/resources/db/`. `MigrationRollbackIT` treats every file there as a migration, and stale copies survive in `target/` until `./mvnw clean`.

## Verifying your work
Run these before reporting any task complete, and paste the output (full list in `sdlc/test-plan.md`):
- Service: `cd service && ./mvnw verify` (must end with `BUILD SUCCESS`. Includes Testcontainers integration, contract and migration up/down/up tests, and JaCoCo ≥ 80% on rule packages)
- Contract: `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` (valid, no errors)
- Web: `cd web && npm run lint && npm run typecheck && npm test -- --run` (zero errors and warnings, all tests green)
- UI change: `cd web && npx playwright test` (axe: 0 serious or critical issues)

If a test fails, fix the code, not the test. Never skip, disable or delete a failing test. On `fix/*` branches, CI rejects test edits after the failing test is committed. If you touched a business rule, also run its test with the guard removed once, confirm it fails, and log it in `docs/rule-removal-log.md`.

## Lifecycle work in progress
Artifacts live in `sdlc/`. Before doing any work, read `sdlc/WORKLOG.md` first: it holds the current state, the next action, every decision made so far, and the agreed conventions. Continue from its "Resume here" section, follow its decisions and conventions, and update it as you work. Then read `sdlc/intent.md`, `sdlc/spec.md` and `sdlc/plan.md` before changing code. Product decisions are in `decisions.md`.
