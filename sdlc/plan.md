# Plan: Stockwise, stock and customer credit for one small shop

Derived from: [intent.md](intent.md) (accepted 2026-10-23), [spec.md](spec.md) (accepted 2026-10-23, revised with DM5-DM16) · Status: accepted
Accepted by: Nnaemeka Chukwuma (2026-10-23) · Higher-risk sign-off: Isaac Bassey (team lead, DM7). Required for the sale transaction, the store-credit logic and every migration.
Decisions in force: [decisions.md](../decisions.md) DM1-DM21 · Deployment: [deploy-plan.md](../deploy-plan.md)
Supporting skills: none

All paths are relative to the **Stockwise repository root** (the local `stockwise/` folder, DM19). Java package root: `ng.tesa.stockwise`.

## Area owners (DM8, DM21)
| Area | Owner | Owns in this plan |
|----|----|----|
| Data and rules | Nnaemeka Chukwuma | `service/src/main/resources/db/**`, the `*Repository` classes, the rule services (sale, store credit, reversal), rule tests, seed data |
| API and access | Isaac Bassey | `contract/**`, controllers, `config/Security*`, JWT, problem details, idempotency filter, contract tests |
| Delivery and evidence | Blessing Nwafor | `.github/**`, `service/Dockerfile`, deploy wiring for both stacks, logging config, load test, smoke tests, README evidence |
| Interface | Victor Oyeleke | `web/**`, accessibility and performance measurement |

Each area owner reviews the others' pull requests (the brief requires cross-review). The engineer who owns a rule writes its unit and integration tests.

## Files that change
Every file is **new**. The repository is greenfield.

### Repository root
| File | Requirements |
|----|----|
| `README.md`: problem, users, both stacks, setup, demo credentials, screenshots, free-tier terms checked (with dates), performance and load figures, screen-reader findings, known limitations, simulated features | R20, N8, N9, N14 |
| `AGENTS.md`, `REVIEW.md` (Stage 5), `decisions.md` (exists), `deploy-plan.md` (exists) | - |
| `docs/decision-records/ADR-001-stock-guard.md` … `ADR-005-*.md`: five records (context, decision, rejected alternatives, cost, reversal observation). Planned: 001 stock guard, 002 idempotency keys, 003 store credit (design problem), 004 JdbcClient over JPA, 005 undo-script migrations | rubric |
| `docs/ai-log.md`, `docs/friction-notes.md`, `docs/data-model.md` (5 queries, index analysis, index not created) | rubric, spec data model |
| `.gitignore`, `.editorconfig`, `.gitleaks.toml` | N2 |
| `docker-compose.yml`: Postgres 17 for local development | N15 |

### Contract (`contract/`)
| File | Requirements |
|----|----|
| `contract/openapi.yaml`: OpenAPI 3.1. Every path, method, status code and problem+json error shape. Money fields `type: integer, format: int64, x-unit: kobo`. `Idempotency-Key` and `X-Request-Id` headers. Safe or idempotent noted per operation | N5, R5, R16, all endpoints |
| `contract/redocly.yaml`: lint rules | N5 |
| `contract/README.md`: `npx @stoplight/prism-cli mock contract/openapi.yaml` (one command) | N5 |

### Service (`service/`)
| File | Requirements |
|----|----|
| `pom.xml`, `mvnw`, `.mvn/wrapper/*`: Java 25, Spring Boot 4 (web, security, validation, jdbc, actuator), Flyway, PostgreSQL driver, jjwt or Spring Security OAuth2 resource server (HS256), Testcontainers, `swagger-request-validator` for contract tests | DM1, DM17 |
| `Dockerfile`: multi-stage, `eclipse-temurin:25-jdk` to build, `25-jre` to run, `-XX:MaxRAMPercentage=75` | deploy-plan §2 |
| `src/main/resources/application.yml`: `server.port=${PORT:8080}`, datasource from `DATABASE_URL`, `spring.jackson` strict number settings, JSON logging, `app.timezone=Africa/Lagos` | N1, N6, DM14 |
| `…/StockwiseApplication.java`, `…/web/RootController.java` (200 on `/`, `/api/v1/health`) | deploy-plan §2 |
| `…/config/SecurityConfig.java`, `JwtService.java`, `CurrentUser.java`: roles re-read from the database per request, 8-hour tokens | R15, N2, N3, DM15 |
| `…/config/JacksonConfig.java`: `ACCEPT_FLOAT_AS_INT` off, `ALLOW_COERCION_OF_SCALARS` off | N1 |
| `…/config/RequestIdFilter.java`: read or generate `X-Request-Id`, MDC, echo the header | N6 |
| `…/config/CorsConfig.java`: origins from `CORS_ALLOWED_ORIGINS` | deploy-plan §2 |
| `…/common/ProblemHandler.java`, `ErrorCode.java`: RFC 9457 responses with `code` and `requestId` | spec "Interfaces" |
| `…/common/Idempotency.java`: key and request-hash handling shared by sales, restocks and repayments | R5 |
| `…/auth/AuthController.java`, `UserRepository.java` | R15 |
| `…/product/ProductController.java`, `ProductService.java`, `ProductRepository.java`: catalogue, search and filter, `PATCH` with `If-Match` version (archive/unarchive) | R1, R2, R18 |
| `…/sale/SaleController.java`, `SaleService.java`, `SaleRepository.java`: the guarded transaction (lines ordered by `product_id`), copied prices, movements, credit, store-credit draw | R3, R4, R5, R8, R12 |
| `…/restock/*`: restock create and list | R6 |
| `…/customer/CustomerController.java`, `CustomerRepository.java`, `LedgerRepository.java`, `RepaymentService.java`: ledger with running balance, guarded repayment | R7, R9, R10 |
| `…/reversal/ReversalController.java`, `ReversalService.java`: unique-per-entry, inverse deltas, partial-repayment-to-store-credit | R11, R12 |
| `…/history/MovementController.java` | R13 |
| `…/dashboard/DashboardController.java`, `DashboardQueries.java`: computed when read, Lagos "today", `computedAt`, `isDemonstrationData` | R14 |
| `src/main/resources/db/migration/V1__users.sql` | R15 |
| `…/V2__products.sql`: `CHECK (quantity >= 0)` and the other constraints, indexes | R1, R4 |
| `…/V3__customers_sales_ledger.sql`: sale (idempotency unique, credit CHECK), sale_line, stock_movement, ledger_entry, customer (balance and store credit `CHECK >= 0`) | R3, R5, R8, R10, R12 |
| `…/V4__restock_repayment_reversal.sql`: `UNIQUE (entry_type, entry_id)` | R6, R9, R11 |
| `…/V5__append_only.sql`: trigger that raises on UPDATE or DELETE of movement and ledger rows | spec data model |
| `src/main/resources/db/rollback/U1__…sql` … `U5__…sql`: one hand-written undo per migration | N12, DM13 |
| `src/main/resources/db/seed/R__seed_demo.sql` (Flyway repeatable, profile `demo`): the Monday subset, then the full volume | R19, DM16 |
| `src/test/java/**/MoneyJsonTest.java`, `RoleMatrixTest.java`, `IdempotencyHashTest.java` (unit) | N1, R15, R5 |
| `src/test/java/**/it/SaleConcurrencyIT.java`: N parallel sales of the last unit | R4 |
| `…/it/IdempotencyIT.java`, `RepaymentConcurrencyIT.java`, `ReversalIT.java`, `StoreCreditIT.java`, `AuthorizationIT.java`, `NoFloatSchemaIT.java`, `ReconciliationIT.java`, `DashboardIT.java`, `MigrationRollbackIT.java` | R5, R9, R11, R12, R15, N1, R10, R13, R14, N12 |
| `…/contract/ContractIT.java`: every response is validated against `contract/openapi.yaml` | N5 |

### Interface (`web/`), owned by Victor (DM21)
| File | Requirements |
|----|----|
| `package.json`, `vite.config.ts`, `tsconfig.json` (strict, `noImplicitAny`), `eslint.config.js`, `tailwind.config.ts` | brief interface tier |
| `src/api/schema.d.ts` (generated by `openapi-typescript`), `src/api/client.ts` (bearer token, `X-Request-Id`, `Idempotency-Key` generation and retry) | N5, N6, N11, R5 |
| `src/lib/money.ts`: kobo to "₦45,000.00" using integer arithmetic only | R16 |
| `src/components/**`: from the shared component set (day 2), plus `StateView` covering loading, empty, error, success and confirm | R17 |
| `src/routes/Login.tsx`, `Dashboard.tsx`, `Products*.tsx`, `NewSale.tsx`, `Customers*.tsx`, `CustomerLedger.tsx`, `Restock.tsx`, `SaleDetail.tsx`, `History.tsx` | R1-R14 |
| `src/routes/Products.tsx`: optimistic archive with rollback | R18 |
| `src/**/*.test.tsx` (Vitest), `e2e/*.spec.ts` (Playwright journeys, axe checks, 360 px viewport) | R17, N9, N10 |
| `vercel.json` (`git.deploymentEnabled: false`) | deploy-plan §4 |

### Pipeline, load and evidence
| File | Requirements |
|----|----|
| `.github/workflows/ci.yml`: on PR and push. Service `./mvnw verify` (unit + Testcontainers + contract), migration up/down/up, web lint, typecheck, test and build, `redocly lint`, gitleaks | N5, N12, N15 |
| `.github/workflows/deploy.yml`: on `main`. Gate, then `flyway migrate` (Neon direct URL), then deploy Stack V (Vercel CLI + Render hook) **and** Stack Q (subtree push to `deploy/*`), then smoke and the contract check against the deployed service. GitHub `production` environment requires Isaac's approval | deploy-plan §2-§6 |
| `.github/workflows/concurrency-evidence.yml`: manual. Runs `SaleConcurrencyIT` on `main` (expect pass) and on branch `evidence/no-stock-guard` (expect **fail**) and uploads both logs as artifacts | R4 (S1) |
| `load/k6/sales.js`, `load/k6/dashboard.js`: ramp until p95 breaks the DM12 target, reporting p50/p95/p99 and the saturation point | N7 |
| `load/concurrency/last-unit.mjs`: fires N parallel `POST /sales` at the **deployed** service and asserts one 201 and N-1 409s | R4 (the brief's "against the deployed service") |

## Order of work
The calendar follows the brief's suggested path. Today is Fri 23 Oct, Day 3.

**Fri 23 Oct: foundations (nothing waits on anything else here)**
1. Create the GitHub repository, push this folder, and set branch protection on `main` (PR plus one review) and on `deploy/*` (bot only). (Blessing)
2. `contract/openapi.yaml` v0.1 with the **Monday paths only** (`/auth/sessions`, `/me`, `/products` GET and POST, `/customers` GET and POST, `/sales` POST and GET, `/health`), plus the Prism mock. Log the change in decisions.md, signed by two engineers. (Isaac + Nnaemeka) Covers N5, R16.
3. Walking skeleton: Spring Boot app answering `/` and `/api/v1/health`, Dockerfile, `ci.yml`, `deploy.yml` deploying the skeleton to **both** stacks. The Qocent day-1 spike questions are answered in decisions.md (PD5b). (Blessing)
4. Migrations V1-V3, each with its undo script, plus `MigrationRollbackIT`. (Nnaemeka) Covers N12, R4 backstop.
5. Web scaffold, routes and the shared components, built against the mock. (Victor)
6. **Record the Monday journey run against the deployed skeleton and log any divergences** (the brief's day-4 check).

**Sat 24 Oct: the rule**
7. Auth, roles, JWT, `AuthorizationIT` (wrong role gets 403, fails when the check is removed). (Isaac) Covers R15, N2, N3.
8. Products create and list, plus search and filter. (Isaac + Nnaemeka) Covers R1, R2.
9. **Sale transaction with the guarded update, idempotency and credit.** `SaleConcurrencyIT`, `IdempotencyIT`, `NoFloatSchemaIT`, `MoneyJsonTest`. (Nnaemeka; Isaac reviews) Covers R3, R4, R5, R8, N1.
10. Screens for the Monday journey: login, add product, new sale (paid and credit), customer picker, all five states. (Victor) Covers R17.

**Sun 25 Oct: proof**
11. Branch `evidence/no-stock-guard` removes the `AND quantity >= :q` guard **and** the CHECK constraint. Run `concurrency-evidence.yml` and keep the failing log. (Nnaemeka)
12. Run `last-unit.mjs` against the deployed service. (Blessing)
13. Monday seed subset (DM16), demo accounts, README demo credentials and simulated-feature labels. (Nnaemeka + Blessing) Covers R19, R20.
14. Run the full Monday journey from a clean browser on both stacks. Note any divergences. (all)

**Mon 26 Oct:** rehearse the 10 slides and present.

**After Monday (days 6-14)**
15. Restock, repayments (guarded), the customer ledger with running balance. (Covers R6, R7, R9, R10)
16. Reversals and store credit (`ReversalIT`, `StoreCreditIT`, `RepaymentConcurrencyIT`). ADR-003. (Covers R11, R12)
17. Movement history, dashboard, `ReconciliationIT`, `DashboardIT`. (Covers R13, R14)
18. Optimistic archive with rollback, slow-network and offline behaviour. (Covers R18, N11)
19. Contract complete, plus `ContractIT` against the deployed service in `deploy.yml`. (Covers N5)
20. Full seed volumes. (Covers R19)
21. k6 load test and saturation point. LCP and INP measured on the deployed address. NVDA or VoiceOver pass. (Covers N7, N8, N9)
22. Five ADRs, the data-model query analysis, AI log, friction notes, walkthrough video, README final pass.

## Parallelization
- **Independent** (separate branches, different files): contract v0.1 (`contract/`) · walking skeleton and pipelines (`.github/`, `service/Dockerfile`, `RootController`) · migrations (`db/`) · web scaffold (`web/`). These are steps 2, 3, 4 and 5, all on Friday.
- **Sequential:**
  - The contract comes before any controller code (brief: no implementation of paths that aren't in the contract).
  - Migrations V1-V3 come before the repositories and the sale service.
  - Auth (step 7) comes before any role-protected endpoint test.
  - The sale service (step 9) comes before the evidence branch (step 11) and the deployed concurrency run (step 12).
  - Repayments (step 15) come before reversals and store credit (step 16), because they share `customer` and `ledger_entry`.
- **Conflict boundary inside `service/`:** Isaac owns `config/`, `auth/` and `*Controller.java`. Nnaemeka owns `db/`, `*Repository.java` and `*Service.java` for the sale, reversal and customer packages. Agree method signatures in the PR description before starting.

## Risks
| Risk | What it could break | Mitigation |
|------|---------------------|------------|
| Sale transaction ordering (multi-line sale, guarded updates, idempotency insert, credit and store credit in one transaction) | Overselling, deadlocks, or a duplicate sale. This is the core of the marks. | Update lines in `product_id` order. The idempotency row is inserted first. The concurrency and idempotency tests run before merge. Isaac reviews. |
| Java 25 / Spring Boot 4 library compatibility (Testcontainers, jjwt, swagger-request-validator) | Build fails on Friday and the skeleton slips | Pin versions in step 3. If something blocks, fall back to Spring Boot 3.5 / Java 21 and record the change in decisions.md (spec C7). |
| Qocent unknowns (Java support, health check on `/`, monorepo layout, cost) | Stack Q doesn't deploy | Step 3 spike. Stack V is the official address (DM9). The subtree push removes the monorepo question. |
| Render cold start (~1 min plus JVM) | A demo stalls, or a refused user is left on a spinner | A "service waking up" interface state after 3 s. Warm the service before demos. JVM flags. |
| `evidence/no-stock-guard` drifting from `main` | The failing-test evidence is no longer believable | Rebase the branch right before each evidence run. The diff must stay one line plus one constraint. |
| Neon pooled endpoint with Flyway | Migration lock errors | Migrations use `DATABASE_URL_DIRECT` (deploy-plan §2). |
| Interface engineer carrying two interfaces | Genie or Stockwise screens slip | The shared component set. A service engineer who finishes early takes Genie's basic screens and logs it (brief). |

**Riskiest step:** step 9, the sale transaction. It combines the concurrency guard, idempotency and credit in one code path. The concurrency rubric category (22 points) mostly rides on it.

## Alternatives considered
- **`SELECT … FOR UPDATE`, then check, then update:** rejected. It's correct under a lock, but it reads like the "read then write in application code" pattern the brief rejects, and it holds locks longer. A single conditional `UPDATE … WHERE quantity >= :q` is atomic and self-explaining.
- **SERIALIZABLE isolation with retry:** rejected. Retry loops hide the rule, and the failing-test demo becomes non-deterministic.
- **Java `synchronized` or application locks:** rejected. They fail as soon as there are two instances, and the brief requires protection in the database.
- **JPA / Hibernate:** rejected (DM18). Caching and flush ordering can mask races.
- **Storing dashboard totals:** rejected. The brief requires figures computed from the records.
- **Redis or a separate idempotency store:** rejected. It's extra infrastructure. A unique column in the same transaction is enough.
- **Liquibase:** rejected (DM13).
- **A feature flag that switches the stock guard off at runtime:** rejected. It's dangerous in production. A separate evidence branch is used instead.

## Key queries and indexes (feeds `docs/data-model.md`)
Row counts are estimates for the full seed: about 120 products and about 60 days × 40 sales, so roughly 2,400 sales and 6,000 lines.

| # | Query | Index | Rows examined vs returned | Grows badly? |
|----|----|----|----|----|
| Q1 | Product list filtered by category and active | `product (active, category)` | ~10-30 examined, ~10-30 returned | No |
| Q2 | Low-stock list | partial index `product WHERE quantity <= low_stock_threshold AND active` | only the low rows | No |
| Q3 | Today's sales (Lagos day) | `sale (created_at)` | ~40 examined, ~40 returned | No (range scan) |
| Q4 | Customer ledger | `ledger_entry (customer_id, created_at)` | one customer's entries | No |
| Q5 | Idempotency replay lookup | unique index `sale (idempotency_key)` | 1 examined, 1 returned | No |
| Not created | `pg_trgm` GIN index on `product.name` for keyword search | - | A sequential scan of about 120 rows is cheaper than maintaining the index | Revisit above about 10k products |

Each row is confirmed with `EXPLAIN (ANALYZE, BUFFERS)` on the full seed, with the output pasted into `docs/data-model.md`.

## Proof
| Requirement | Test or check that proves it |
|-------------|------------------------------|
| R1 | `ProductIT` (create, edit, archive, 409 on duplicate reference). Playwright product flow |
| R2 | `ProductSearchIT` (filter combinations over the seed). Playwright clear-filters check |
| R3 | `SaleIT` (multi-line, 400 on bad quantities, nothing recorded on 409) |
| R4 | `SaleConcurrencyIT` (Testcontainers) **plus** `last-unit.mjs` (deployed). Failing log from `evidence/no-stock-guard` |
| R5 | `IdempotencyIT` (sequential and parallel replays, 422 on a reused key with a different body) |
| R6 | `RestockIT` |
| R7 | `CustomerIT` |
| R8 | `SaleIT` credit case. Constraint test (insert without customer is rejected) |
| R9 | `RepaymentConcurrencyIT` |
| R10 | `ReconciliationIT` (balance = sum of ledger, running balance correct) |
| R11 | `ReversalIT` (restores stock and balance, both entries visible, parallel double reversal gives one) |
| R12 | `StoreCreditIT` (₦10,000 / ₦6,000 / reversal gives store credit ₦6,000; the next sale draws it; parallel sales can't double-spend; fails without the guard) |
| R13 | `ReconciliationIT` (movement sum = quantity) |
| R14 | `DashboardIT` (matches hand SQL, moves on reversal, Lagos midnight boundary at 00:30 WAT) |
| R15 | `AuthorizationIT` (wrong role gets 403, fails when the check is removed. Missing or expired token gets 401) |
| R16 | `money.test.ts`. Contract lint rule (money fields must be integer int64 with `x-unit`) |
| R17 | Per-screen state checklist. Playwright drives empty and error states |
| R18 | Playwright two-tab archive conflict test |
| R19 | `SeedVerificationIT` (counts and awkward cases) |
| R20 | Pre-checkpoint clean-browser checklist |
| N1 | `MoneyJsonTest`, `NoFloatSchemaIT` |
| N2, N3 | `AuthorizationIT`, gitleaks in CI |
| N4 | One "fails when removed" test per rule (R4, R5, R8, R9, R11, R12) |
| N5 | `redocly lint`, `ContractIT`, post-deploy contract check |
| N6 | `RequestIdFilterTest`. Manual trace of one journey in the README |
| N7 | k6 report in the README |
| N8 | Lighthouse or WebPageTest on the deployed address, in the README |
| N9 | Playwright + axe in CI. Manual NVDA or VoiceOver notes |
| N10 | Playwright at a 360 px viewport |
| N11 | Manual throttled and offline test, written up in the README |
| N12 | `MigrationRollbackIT` (up, down, up) |
| N13 | Seed review checklist |
| N14 | README "Free tier terms checked" table |
| N15 | `ci.yml` runs all three test levels; a failure blocks `deploy.yml` |

## Plan maintenance
If implementation departs from this plan, update this file in the same commit as the code.

**Departures recorded:**
- 2026-10-23, step 4: the Maven project (`service/pom.xml`, Maven wrapper) was created in step 4, not step 3, because the migration tests need it. Versions: Spring Boot **4.1.2** (latest stable; 4.2.0-RC1 not used), which manages Flyway 12.4.0, Testcontainers 2.0.5 and the Postgres driver 42.7.14. Step 3 (Blessing) still adds the Spring Boot application class, `spring-boot-maven-plugin`, the Dockerfile and the health endpoints. The pom deliberately has no `spring-boot-maven-plugin` yet, so `package` doesn't need a main class.
- 2026-10-23, step 4: V3 also adds `sale_reference_seq` (sale references `S-000001`), the `OPENING` movement type (so a product's opening stock reconciles with its movements, R13), and a `sale_line_total_matches` CHECK. `SchemaRulesIT` covers the database-level rules R4 (backstop), R5, R8, R9, R12 and N1 now, ahead of the service tests.
- 2026-10-23, step 4: the undo runner is `ng.tesa.stockwise.db.MigrationUndo` (`./mvnw -Pundo -Dundo.target=<n-1> exec:java`). It finds `U<v>__<description>.sql` from Flyway's history description and runs each undo plus its history-row delete in one transaction.

## Measurement
- Leading: share of changes that merge from the first implementation pass; time from plan acceptance to merged PR.
- Lagging: rework cycles per change; whether the merged diff still matches this plan.
