# Test plan: Stockwise, stock and customer credit for one small shop

Derived from: [spec.md](spec.md) (accepted 2026-10-23), [plan.md](plan.md) (accepted 2026-10-23) · Status: accepted (2026-10-23 by Nnaemeka Chukwuma)
Decisions in force: [decisions.md](../decisions.md) DM1-DM25 (testing: DM22 coverage, DM23 test protection, DM24 visual, DM25 evals)
Supporting skills: none

## Feedback loop
The agent (or engineer) runs these itself and iterates until they pass, before any human reviews the work. Each command exits non-zero on failure. These are the commands planned in plan.md; whoever scaffolds each part first verifies them and updates AGENTS.md.

| Check | Command | Passing looks like |
|-------|---------|--------------------|
| Service build + unit + integration + contract + coverage | `cd service && ./mvnw verify` (Docker running) | `BUILD SUCCESS`; `Tests run: N, Failures: 0, Errors: 0`; JaCoCo `All coverage checks have been met` |
| Migrations reversible | included in `verify` (`MigrationRollbackIT`) | up → down → up green for every `V<n>`/`U<n>` pair |
| Contract lint | `npx @redocly/cli lint contract/openapi.yaml` | `Woohoo! Your API description is valid.` |
| Web lint | `cd web && npm run lint` | 0 errors, 0 warnings |
| Web types | `cd web && npm run typecheck` (`tsc --noEmit`, strict) | no output, exit 0 |
| Web unit | `cd web && npm test -- --run` | `Test Files … passed`, 0 failed |
| Web e2e + accessibility | `cd web && npx playwright test` (against the mock locally, against the deployed site in `deploy.yml`) | all passed; axe: 0 serious or critical |
| Secrets | `gitleaks detect --no-banner` | `no leaks found` |
| Visual (UI only, after Monday, DM24) | `cd web && npx playwright test --project=visual` | no screenshot differences, or differences approved by Victor |
| Deployed concurrency | `node load/concurrency/last-unit.mjs --base $SERVICE_URL --n 10` | `201 x1, 409 x9, final quantity 0` |

## Done-targets
**Monday 26 Oct (MVP checkpoint)**
- `SaleConcurrencyIT` passes on `main` **and fails** on `evidence/no-stock-guard`. Both logs are saved as artifacts of `concurrency-evidence.yml` (S1, brief MVP item 2).
- `IdempotencyIT` passes: the same `Idempotency-Key` twice gives one sale (S2).
- `AuthorizationIT` passes, including assistant `POST /products` → 403.
- `NoFloatSchemaIT` and `MoneyJsonTest` pass (S4).
- `last-unit.mjs` against the deployed Stack V service: exactly one 201.
- The Monday journey runs end to end from a clean browser on the deployed address (manual run, recorded in the README).
- `ci.yml` is green and `deploy.yml` deployed both tiers (brief MVP item 3).

**Final (Tue 3 Nov)**
- Every test in the traceability table exists and passes. JaCoCo ≥ 80% on the rule packages (DM22).
- Every business rule's test has been run once with the rule removed and **seen to fail**. The run is recorded in `docs/rule-removal-log.md`: rule, what was removed, the failing test output, the date.
- k6 report with p50/p95/p99 and the saturation point. DM12 targets met or the miss reported.
- LCP and INP measured on the deployed address. NVDA or VoiceOver findings written up in the README.
- Visual baselines approved for the five key screens (DM24).

## Traceability
| Requirement | Test(s) | Type |
|-------------|---------|------|
| R1 catalogue | `ProductIT`; `e2e/products.spec.ts` | integration, e2e |
| R2 search/filter | `ProductSearchIT`; `e2e/products.spec.ts` (combine and clear) | integration, e2e |
| R3 record sale | `SaleIT` (multi-line, 400 on 0, -1, 1.5; nothing recorded on 409) | integration |
| R4 stock ≥ 0 under concurrency | `SaleConcurrencyIT` (10 threads, last unit, `CountDownLatch` start); `last-unit.mjs` (deployed); evidence branch failing log | integration, deployed, evidence |
| R5 idempotency | `IdempotencyIT` (sequential, parallel, same key with a different body → 422; restock and repayment variants); `IdempotencyHashTest` | integration, unit |
| R6 restock | `RestockIT` | integration |
| R7 customers | `CustomerIT` | integration |
| R8 credit needs a customer | `SaleIT#creditWithoutCustomer`; `ConstraintIT#saleCreditCheck` (direct SQL insert rejected) | integration |
| R9 repayment ≤ balance | `RepaymentConcurrencyIT` (two parallel repayments summing over the balance → one 409) | integration |
| R10 ledger | `ReconciliationIT#ledgerMatchesBalance` | integration |
| R11 reversals | `ReversalIT` (stock and balance restored, both visible, parallel double reversal → one, restock reversal below zero → 409, ADMIN allowed, ASSISTANT 403) | integration |
| R12 store credit | `StoreCreditIT` (₦10,000 / ₦6,000 → credit ₦6,000; next ₦4,000 sale leaves ₦2,000; parallel double-spend blocked; fails with the guard removed) | integration |
| R13 movement history | `ReconciliationIT#movementsMatchQuantity` | integration |
| R14 dashboard | `DashboardIT` (matches hand SQL; moves on reversal; sale at 00:30 WAT counts as today) | integration |
| R15 auth/roles | `AuthorizationIT` (each role × each write endpoint; 401 missing or expired; demotion takes effect next request); `RoleMatrixTest` | integration, unit |
| R16 naira/kobo | `money.test.ts` (45000 → "₦450.00", 0, 1, 99, large values); redocly custom rule for money fields | unit, lint |
| R17 five states | `e2e/states.spec.ts` (empty via a fresh account or filter, error via route interception); per-screen checklist | e2e, manual |
| R18 optimistic archive | `e2e/archive-conflict.spec.ts` (two tabs → revert plus message) | e2e |
| R19 seed | `SeedVerificationIT` (Monday subset now, full counts later; every awkward case present) | integration |
| R20 labelling/credentials | pre-checkpoint clean-browser checklist | manual |
| N1 money exactness | `MoneyJsonTest`; `NoFloatSchemaIT` (no `numeric`, `real` or `double` columns) | unit, integration |
| N2 security | `AuthorizationIT`; gitleaks in CI | integration, CI |
| N3 role re-read | `AuthorizationIT#demotionImmediate` | integration |
| N4 DB-level protection | each rule test above plus `docs/rule-removal-log.md` | evidence |
| N5 contract | redocly lint; `ContractIT` (every response validated); post-deploy contract check | lint, contract |
| N6 request ID | `RequestIdFilterTest`; manual cross-tier trace in the README | unit, manual |
| N7 service performance | `load/k6/sales.js`, `dashboard.js` | load |
| N8 web performance | Lighthouse / WebPageTest on the deployed address | manual measurement |
| N9 accessibility | axe in Playwright; NVDA or VoiceOver pass | e2e, manual |
| N10 responsive | Playwright 360 px project; visual baselines (DM24) | e2e, visual |
| N11 slow network | manual throttled and offline test; `client.test.ts` retries with the same key | manual, unit |
| N12 migrations | `MigrationRollbackIT` | integration |
| N13 demo data | seed review checklist | manual |
| N14 free tier | README "Free tier terms checked" table | manual |
| N15 test levels | `ci.yml` runs unit, integration and contract; a failure blocks deploy | CI |

## Test design notes
- **Concurrency tests** start all threads on one `CountDownLatch` so the requests really overlap. Each test asserts the final database state (quantity, row counts), not just HTTP codes. Every one runs 20 times in a loop locally before first merge to catch flakiness.
- **"Fails when removed" evidence** (brief, rubric "Verification" 13 points): for the stock guard, a dedicated `evidence/no-stock-guard` branch run by `concurrency-evidence.yml`. For the other rules, a local run with the guard commented out, logged in `docs/rule-removal-log.md`. Never commit a disabled guard to `main`.
- **Integration tests use real Postgres 17** via Testcontainers (the brief: "against a real database rather than a substitute"). No H2.
- **Test data:** each integration test creates its own rows. Only `SeedVerificationIT` reads the seed.

## Bug fixes: test first
1. Reproduce the bug as a failing test, and confirm it fails for the expected reason.
2. Commit the test on a `fix/<slug>` branch.
3. Fix the code without editing the test. CI enforces this (DM23).

## Protecting the loop
- **Guardrail (DM23):** a CI job `test-guard` on `fix/*` branches or PRs labelled `bug` fails if any file matching `service/src/test/**` or `web/**/*.{test,spec}.*` changes in commits after the first commit that touched tests. Its message names the files and says "Fix the code, not the test".
- **CODEOWNERS:** `service/src/test/**/sale/**`, `**/customer/**` and `**/reversal/**` → Nnaemeka Chukwuma. `service/src/test/**/auth/**` and `contract/**` → Isaac Bassey. `.github/**` → Blessing Nwafor. `web/**` → Victor Oyeleke. Branch protection requires code-owner review.
- **Review rule** (REVIEW.md, Stage 5): reject any diff that deletes, skips (`@Disabled`, `.skip`) or loosens an assertion without a decision entry.

## Evals (ongoing agent work), DM25
- Suite location: `evals/`, one folder per case with `task.md`, `accepted.diff` and `must-pass.txt` (test names).
- Cases: 10-20 real tasks the team did with AI help, collected from day 6 (current count: 0).
- Runs: manually, on any change to `AGENTS.md`, `REVIEW.md` or `decisions.md` conventions, before merging that change.
- Gate: none (informational). Record the pass rate in `evals/RESULTS.md` with the date.
- Rule: every bug an AI tool introduced and the team caught adds one eval **and** an AI-log entry (the brief requires at least one "checked it and found it wrong" case).

## Open questions
- [ ] Is a Spring Boot 4-compatible `swagger-request-validator` (or an alternative contract validator) available? Verify in plan step 3; fallback: Schemathesis run from CI against the deployed service. (owner: Isaac Bassey) · UNRESOLVED
- [ ] Will the k6 load test against Render free and Neon free stay within their terms? (spec C8; owner: Blessing Nwafor) · UNRESOLVED

## Measurement
- Leading: first-pass CI success rate for agent-written changes; eval pass rate over time.
- Lagging: review time per PR; change failure rate; regressions caught in CI versus in production.
