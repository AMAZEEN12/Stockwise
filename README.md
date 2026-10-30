# Stockwise

Know your stock. Trust your credit. Stockwise keeps one small shop's stock and its customers' credit in one ledger. Its key rule: **stock never falls below zero, even when two phones sell the last unit at the same moment.** TeSA Cohort 6 capstone, Team 3 main product.

- **Problem:** a shopkeeper loses track of what is left on the shelf and who owes what. Two assistants can sell the same last item, and credit lives in a notebook nobody can reconcile.
- **Users:** the **owner** (adds products, sees everything), the **assistant** at the till (records sales, adds customers), and an **admin** (reads everything; reversals come after the MVP).
- **What the MVP does:** log in by role, add and find products, add customers, and record paid and credit sales. Each sale takes stock in one guarded database transaction, and safe retries mean a dropped connection never records a sale twice.

Requirements: [sdlc/intent.md](sdlc/intent.md) and [sdlc/spec.md](sdlc/spec.md). Build plan: [sdlc/plan.md](sdlc/plan.md). Decisions: [decisions.md](decisions.md). Hosting: [deploy-plan.md](deploy-plan.md).

## Live addresses
| Stack | Web | Service |
|----|----|----|
| V: Vercel + Render + Neon (official, DM9) | https://stockwise-smoky.vercel.app/ | https://stockwise-yc54.onrender.com |
| Q: Qocent + Neon (parallel, pending funding, PD5a) | _to be added at deploy_ | _to be added at deploy_ |

The free Render service sleeps after 15 minutes idle, and the first request after that takes about a minute.

## Demo credentials
All data is fictional demonstration data (Monday seed, DM16). The three accounts share one password: **`Stockwise-Demo-2026`**.

| Role | Email | Can |
|----|----|----|
| Owner | `owner@stockwise.test` | everything in the MVP, including adding products |
| Assistant | `assistant@stockwise.test` | record sales, add customers, read everything |
| Admin | `admin@stockwise.test` | read everything (reversals after the MVP) |

These accounts exist only where the service runs with the `demo` profile. The web app's own development simulation (`npm run mock`) uses different, simulated accounts; see [web/README.md](web/README.md).

The seed holds 20 products, 5 customers and 33 sales over the last 7 days. It also has every awkward case: sold out, exactly at threshold, low, archived, a very long name, a customer who owes ₦22,800, a fully repaid customer, and a customer holding ₦6,000 of store credit after a reversal (the design problem, DM5).

## Simulated or not yet built
Labelled honestly, as the brief requires (R20):
- **Sign-up (registration):** there is no registration endpoint yet; the proposal is still pending API approval. Use the demo accounts.
- **Restocks, repayments, reversals, the customer ledger, movement history and the dashboard:** after the MVP (plan steps 15-17). In the seed, the repayments and the one reversal exist only as ledger and stock-movement rows.
- **Store credit spending:** the seeded store credit shows on the customer, but sales don't draw it down yet (plan step 16).
- **Web development simulation:** `npm run mock` in `web/` keeps fictional data in memory and accepts any valid login shape. It is not the real service and is not security or concurrency evidence.

## The key rule, proved
`SaleConcurrencyIT` sends 10 sales of the last unit at once against real Postgres: exactly one is recorded, and nine get `409 INSUFFICIENT_STOCK`. On the branch `evidence/no-stock-guard`, which removes the guarded update and its CHECK constraint, the same test fails: all 10 sell the last unit. Both logs: [docs/evidence/concurrency/](docs/evidence/concurrency/README.md). Every rule test was also seen failing with its protection removed: [docs/rule-removal-log.md](docs/rule-removal-log.md).

## Layout
| Folder | What |
|----|----|
| `service/` | Spring Boot 4.1.2 HTTP service: Java 25, Maven wrapper, JdbcClient with plain SQL (no JPA), Flyway with hand-written undo scripts, PostgreSQL 17 |
| `web/` | React 19 + TypeScript (strict) + Vite + Tailwind 4 + RTK Query |
| `contract/` | OpenAPI 3.1 contract v0.1.0, lint rules, mock |
| `tools/seed/` | Generator for the demo seed |
| `docs/` | Evidence, rule-removal log, design notes |

## Run it locally
You need Java 25, Node 24 and Docker Desktop.

1. Start the database (Postgres 17):

   ```bash
   docker compose up -d db
   ```

2. Start the service with the demo data. `JWT_SECRET` is required, at least 32 bytes:

   ```bash
   cd service && JWT_SECRET="$(openssl rand -base64 48)" ./mvnw spring-boot:run -Dspring-boot.run.profiles=local,demo
   ```

   It listens on http://localhost:8080. `curl localhost:8080/api/v1/health` answers `{"service":"stockwise","status":"UP",...}`.

3. Start the web app against it:

   ```bash
   cd web && npm ci && VITE_API_BASE_URL=http://localhost:8080/api/v1 npm run dev
   ```

## Configuration
| Variable | Default | Notes |
|----|----|----|
| `PORT` | `8080` | Set by the host |
| `DATABASE_JDBC_URL` | `jdbc:postgresql://localhost:5432/stockwise` | Neon: the **pooled** endpoint, `jdbc:postgresql://<host>/<db>?sslmode=require` |
| `DATABASE_JDBC_URL_DIRECT` | same as above | Neon: the **direct** endpoint, used only by Flyway migrations (in prod, `deploy.yml` migrates) |
| `FLYWAY_ON_STARTUP` | `false` in `prod` | `true` makes the service migrate at start-up instead of `deploy.yml` |
| `APP_VERSION` / `RENDER_GIT_COMMIT` | project version | Reported by `/api/v1/health`; `deploy.yml` waits for its commit |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | `stockwise` / `stockwise` | Secrets in deployment |
| `JWT_SECRET` | none: **required** | At least 32 bytes. The service refuses to start without it |
| `CORS_ALLOWED_ORIGINS` | none (`local` adds the Vite dev server) | Comma-separated deployed web addresses |
| `SPRING_PROFILES_ACTIVE` | `prod` in the image | `local` allows the Vite dev server origin; `demo` adds the Monday seed at start-up (does nothing if data exists). On Render the seed comes from `deploy.yml` with `SEED_DEMO=true` |
| `DB_POOL_SIZE` | `10` | Connection pool size |
| `LOGGING_STRUCTURED_FORMAT_CONSOLE` | none | `ecs` for JSON logs in deployment; every line carries the `requestId` |
| `VITE_API_BASE_URL` (web, build time) | `http://127.0.0.1:4710` (mock) | The service's `/api/v1` address. Public, not a secret |

## Checks
| What | Command |
|----|----|
| Service (needs Docker) | `cd service && ./mvnw verify` |
| Web | `cd web && npm run lint && npm run typecheck && npm test -- --run && npm run build` |
| Contract | `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` |
| Smoke a live deploy | `API_URL=… WEB_URL=… scripts/smoke.sh` |
| Last-unit test, deployed | `API_URL=…/api/v1 OWNER_PASSWORD=… node load/concurrency/last-unit.mjs` |
| Load | see [load/README.md](load/README.md) |

GitHub Actions:
- `ci.yml` is the gate: guards, secret scan, contract lint, service tests and web checks. A red job means nothing deploys.
- `deploy.yml` runs the gate, waits for the `production` approval, migrates Neon, deploys Vercel and Render, then smoke-checks.
- `concurrency-evidence.yml` is manual: it passes with the guard and fails without it.

Setup of secrets and hosts: [docs/deploy-setup.md](docs/deploy-setup.md). The Monday demo script: [docs/demo-runbook.md](docs/demo-runbook.md). Backend layout: [BACKEND-STRUCTURE.md](BACKEND-STRUCTURE.md).

`./mvnw verify` runs 88 tests against real Postgres 17 in Docker: migrations up, down and up; schema rules; the sale transaction and its concurrency and idempotency; repositories; the seed; and every endpoint over HTTP, including the role checks. For the web checks, see [web/README.md](web/README.md).

## Free tier terms checked
From [deploy-plan.md](deploy-plan.md) §1. Each provider's own pages were read on **2026-10-23**.

| Provider | What it says |
|----|----|
| Render | Free web service sleeps after 15 min idle and takes about 1 min to wake. 750 free instance hours per workspace per month. Free Postgres expires after 30 days, so **we don't use it**. |
| Neon | Free plan is permanent with no card. 1 GB storage and 100 CU-hours per project per month; scales to zero after 5 min. |
| Vercel | Hobby is for personal, non-commercial use, with hard usage caps. |
| Qocent | Not free: prepaid credits only. Used only if the programme supplies them (PD5a). |

## Performance and load
Measured on 2026-10-28 from a GitHub Actions runner against the live free-tier services (Render free, 0.1 CPU; Neon free), so network time is included. Nine valid runs; raw output and a run-by-run table are in [docs/evidence/load-2026-10-28/](docs/evidence/load-2026-10-28/). Tuning applied after run 3: database pool 20, JVM flags `-XX:+UseSerialGC -XX:TieredStopAtLevel=1`, debug logging off.

| Measure | Target (DM12) | Result |
|----|----|----|
| `POST /sales` p95, 3 tills, steady, sales spread across 20 products (warm) | ≤ 500 ms | **Not met: p95 656 ms** (median 605 ms, slowest 717 ms, 136 requests, no failures) |
| `POST /sales` p95, ramp, every sale on one product | ≤ 500 ms | **Not met:** p95 1.45 to 1.69 s at 6 to 7 virtual users (9 runs) |
| `POST /sales` p95, ramp, sales spread across 20 products | ≤ 500 ms | **Not met:** p95 660 to 667 ms at 4 virtual users (2 runs, about 55 requests each) |
| Dashboard p95 (warm) | ≤ 800 ms | Read paths only (product and sales lists; no `GET /dashboard` yet). After tuning, held to 38 to 50 virtual users (29 to 41 requests/s); p95 800 to 832 ms where each run stopped |
| Product catalogue p95 (warm) | 500 ms yardstick | After tuning, held to 30 to 47 virtual users (26 to 41 requests/s); p95 505 to 543 ms where each run stopped |
| Saturation point | reported | Sales: 4 to 7 virtual users (about 2.5 sales/s). Reads: about 30 to 50 virtual users |
| Cold start (Render) | reported separately | **Not measured yet** (the one attempt on 2026-10-28 answered in 0.3 s because the service had not gone to sleep) |
| Last-unit test, 10 devices, 3 rounds | one 201, nine 409, stock 0 | **Passed in all 9 runs, on the deployed service** |
| LCP (Lighthouse, deployed address, 2026-10-30) | ≤ 2.5 s | **Met, narrowly:** 2.4 s mobile, 0.5 s desktop (one run each) |
| INP (web-vitals, deployed address, 2026-10-30) | ≤ 200 ms | **Not met, by 16 ms:** 216 ms worst interaction in the session (it read 40 ms early on and rose later) |
| CLS, TBT, Lighthouse scores (deployed address, 2026-10-30) | reported | CLS 0 mobile / 0.001 desktop. TBT 180 ms mobile / 0 ms desktop. Performance 90 mobile / 100 desktop. Accessibility 100 both (automated). Detail: [docs/evidence/web-vitals-2026-10-30/](docs/evidence/web-vitals-2026-10-30/README.md) |

How to read this:
- Each k6 ramp test stops itself the moment p95 passes its target, so the p95 shown "at stop" is always just over the target. The user count at that moment is the saturation point.
- The steady test is the fairest sales figure: 3 tills, each selling about every 2 seconds, after a 20 second warm-up. Its times are tight (median 605 ms, p99 675 ms), which points to a fixed cost per sale on this hardware rather than queueing.
- Spreading sales across products cut p95 by more than half (about 1.5 s to about 0.66 s) but did not reach 500 ms.
- LCP and CLS come from Lighthouse on the opening screen, a lab run with simulated mobile throttling. INP comes from the web-vitals library during a real session and is the slowest interaction seen, so it rose from 40 ms to 216 ms as more of the app was used. Neither is field data from real shops.

## Known limitations
- No sign-up, password reset or email (see "Simulated or not yet built").
- Tokens last 8 hours and can't be revoked early, although removing a user or changing their role takes effect on their next request (DM15).
- No rate limit on login yet.
- Render's free service sleeps; open the service address about 2 minutes before a demo.
- Free-tier compute caps limit the load figures; they will be reported as measured, with the date.
- - **`POST /sales` does not meet the 500 ms target on the free tier.** Over 6 runs on 2026-10-28, p95 was 1.48 to 1.69 s (median about 0.9 s) and the test stopped at 6 to 7 concurrent virtual users (about 2.5 sales per second). The service runs on Render's free plan (0.1 CPU) with Neon's free database, and each sale makes about 8 database calls. The reads meet their targets at far higher load (dashboard and catalogue held to 38 to 50 virtual users). The load test sends every sale to a single product, which also makes sales queue on one stock row, so this is a worst case. We have not isolated how much of the slowdown comes from the free server's CPU and how much from that single-row queueing. The stock guard itself is not affected: the last-unit test passed in every run (one sale succeeds, nine are refused, stock stays at zero).
- **Cold start.** Render's free service sleeps after 15 minutes idle and takes about a minute to wake. Open the service address about 2 minutes before a demo.
- **Measured from a GitHub-hosted runner** against the live free-tier services, so network time is included.
- **INP is 216 ms, over the 200 ms target (DM12).** Measured on 2026-10-30 with the web-vitals library on the deployed web address. It read 40 ms early in the session and rose later, because INP reports the worst interaction. The interaction responsible is [name it / not identified]. We report it as measured. LCP on mobile passes by only 0.1 s (2.4 s against 2.5 s).