# Test plan: Stockwise, stock and customer credit for one small shop

2026-10-26 amendment, DM63-DM64 (scope decided by Victor Oyeleke; technical checks/logged by Codex): [sales usability sequence](../docs/sales-usability-plan.md). First catalogue branch covers immediate alphabetical products, paging/prefix reload, archived-only pages, out-of-stock disabling, name/reference search/reset, stale/error retry, query isolation, safe amounts and desktop/mobile keyboard/layout/axe. Retain all prior sale/recovery assertions. Run current contract lint, service verify, frontend lint/typecheck/unit/build and full browser regression; record actual outcomes and setup limits in WORKLOG. Later fix branches add regressions before the fix without subsequently editing them.

2026-10-26 amendment, DM66 (decided by Victor Oyeleke; logged by Codex): verify selected rows remain visible across search/pagination, quantity controls stay horizontal with 44px targets, minus stops at one, typed limits and stock maxima remain enforced, zero-stock conflict rows remain removable and continue blocking confirmation, Refresh occupies the catalogue heading, genuine empty/no-result states remain, and 360px layouts have no horizontal overflow. Existing tests remain unchanged on this fix branch.

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

**Home/authentication implementation (2026-10-24, DM37–DM40)**

- DM41–DM42 follow-up: verify canonical utility output still gives 10px radius, Inter Tight and 2px focus offset. Run `npm run mock` plus `npm run dev`, then `npm run check:mock` for actual, un-intercepted HTTP/browser session creation, /me, autofill, refresh and logout. Lint both the authoritative contract and generated mock copy. Keep fixture credentials explicitly simulated and source OpenAPI unchanged.

- Run real ESLint, strict typecheck, unit tests, production build, generated API types and contract lint under web; never substitute typecheck for lint.
- Playwright at 1440×900 and 360×880, 2×: capture Home, default auth, validation, loading, waking, 401, network failure and sign-up; verify no horizontal overflow, keyboard dismissal/focus return, duplicate-submit protection, exact request body, /me bearer header, tab refresh/logout and no unapproved registration writes.
- Axe: zero serious/critical violations in auth states. Network interceptions are contract-shaped test doubles, not proof of deployed service integration.
- Visual captures are review artifacts, not automatically approved baselines. Reconstructed coin and unverified interpolation must be reported honestly. Actual output is recorded in WORKLOG.

**Frontend phase 2 (2026-10-24, DM36)**

- Compare the folder tree with `docs/frontend-architecture.md`; all 27 `.gitkeep` placeholders and `web/src/service/http-client.ts` must be zero-byte files.
- Confirm there is no package manifest, dependency installation, application configuration, generated schema or UI implementation. Review changed Markdown links, decision references and staged whitespace.
- After publication, compare local baseline/starter commit IDs with the remote branch heads; confirm the PR targets `main` and remains unmerged.
- Runtime checks above are unavailable until service/contract/web scaffolding exists; do not report them as passed. This scoped preparation changes no business rules or rendered UI.

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
| N11 slow network | manual throttled and offline test; future `service/http-client.test.ts` retries with the same key | manual, unit |
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

## Shared-component alignment coverage, 2026-10-25 (DM55)

Approved by Victor Oyeleke; logged by Codex. Keep existing auth/product/customer/sale/recovery assertions. Add unit coverage for ConfirmDialog's disabled acceptance, same-tick duplicate submission, asynchronous failure and caller-owned close transition. Add desktop/mobile browser checks for Select keyboard selection and clear-focus restoration, Checkbox Space toggling with disabled confirmation and token-based focus, and automatic success-toast expiry. Continue axe, narrow/short viewport and actual local API checks; captures are evidence for human comparison, not automatic design approval. The active API contract and backend rule-removal tests are unchanged.

## Open questions
- [ ] Is a Spring Boot 4-compatible `swagger-request-validator` (or an alternative contract validator) available? Verify in plan step 3; fallback: Schemathesis run from CI against the deployed service. (owner: Isaac Bassey) · UNRESOLVED
- [ ] Will the k6 load test against Render free and Neon free stay within their terms? (spec C8; owner: Blessing Nwafor) · UNRESOLVED

## Measurement
- Leading: first-pass CI success rate for agent-written changes; eval pass rate over time.
- Lagging: review time per PR; change failure rate; regressions caught in CI versus in production.

Sales History verification (DM57-DM58): unit-check Lagos midnight, inclusive seven-day/year/leap boundaries and invalid money/identity/time. Browser-check the 12 supplied states at 2x; read-only ID-based rendering; date/payment filters; pagination retention/retry; malformed/duplicate records; ADMIN access; session errors; midnight refresh; confirmed first-row highlights and toast expiry. Keep assertions/timeouts unchanged. Run check:sales-history without interception, frontend checks and contract lint; record service limitations and measured visual differences. UI dates mean Lagos calendar dates and freshness means last successful retrieval, not server snapshot time.

Role landing verification (DM60-DM61): replace the obsolete Workspace success expectation with Products while retaining pending/waking, duplicate-submit, /me bearer, refresh and logout checks. New desktop/mobile checks cover all three roles with no POST on demo fill, /me role precedence, safe return links, permission loss, old bookmarks, service failure/retry and 401. check:roles uses actual isolated mock/browser sessions to prove role/token/replay isolation and the explicit CLI override. Pure URL-policy tests reject external/traversal targets. Record exact results and preserve unrelated supplied files.
