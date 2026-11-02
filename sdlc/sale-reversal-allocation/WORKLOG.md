# Work log: Priority Backend Services, Sale Reversal & Oldest-First Allocation

Change slug: `sale-reversal-allocation` · Started: 2026-10-30 · Last updated: 2026-11-02 by Nnaemeka Chukwuma (Data and rules owner)
Source document: `Api_awaiting_implementation.docx`, `docs/oldest-outstanding-sale-allocation-proposal.md`, PR #40, and `Tesa cohort 6 software engineering capstone project.pdf` (Stockwise R1, R9, R11, R12, R13, R18)

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Stage:** Complete (Implementation & Verification passed 100%)
- **Step:** Ready for final review, commit, and PR creation.
- **In progress:** Staged and ready for git commit.
- **Next action:** Commit implementation changes to `feat/sale-reversal-allocation` signed by Nnaemeka Chukwuma.
- **Waiting on:** User review / PR review.

## Artifact status
| Artifact | Status (missing / draft / accepted) | Approved by | Date |
|----------|-------------------------------------|-------------|------|
| intent.md | accepted | Nnaemeka Chukwuma | 2026-11-02 |
| spec.md | accepted | Isaac Bassey & Nnaemeka Chukwuma | 2026-11-02 |
| plan.md | accepted | Nnaemeka Chukwuma | 2026-11-02 |
| AGENTS.md (repo) | accepted (existing) | Team 3 | 2026-10-23 |
| test-plan.md | accepted | Nnaemeka Chukwuma | 2026-11-02 |
| REVIEW.md (repo) | accepted (existing) | Isaac Bassey | 2026-10-23 |
| release.md | accepted | Isaac Bassey & Nnaemeka Chukwuma | 2026-11-02 |
| monitoring.md | deferred (DM31) | Team 3 | 2026-10-23 |
| EXECUTION.md | accepted | Nnaemeka Chukwuma | 2026-11-02 |

## Conventions and guidelines
- **Stack and versions:** Java 25, Spring Boot 4.1.2, JdbcClient with plain SQL (no JPA), Flyway Community with undo script per migration, PostgreSQL 17, Testcontainers. Frontend: React 19, TypeScript strict, Vite, Tailwind v4, RTK Query.
- **Code and docs style:** Integer kobo (`long` in Java, `BIGINT` in SQL, `x-unit: kobo` in OpenAPI), never floating point. Concurrency checks in the database (`CHECK` constraints, `SELECT ... FOR UPDATE`, and optimistic locking via `If-Match: version`). Append-only ledger; corrections are reversals, never `UPDATE` or `DELETE` on movement or ledger entries.
- **Source of truth:** Repository (`contract/openapi.yaml`, `sdlc/`, `decisions.md`).
- **Approvers:** Product owner: Victor Oyeleke / Team 3; Data and rules owner: Nnaemeka Chukwuma; API and access owner / Tech lead: Isaac Bassey.

## Decisions
Append-only. To change a decision, add a new entry that supersedes it.
| ID | Date | Decision | Reason | Decided by | Affects | Status |
|----|------|----------|--------|------------|---------|--------|
| D1 | 2026-10-30 | Change slug `sale-reversal-allocation` in `sdlc/sale-reversal-allocation/`. | Intake scope selection. | User / Nnaemeka Chukwuma | all artifacts | active |
| D2 | 2026-10-30 | Full SDLC chain: intent, spec, plan, test-plan, release, EXECUTION. | Financial money allocation, stock reversals, and ledger integrity are high-risk. | User / Nnaemeka Chukwuma | all artifacts | active |
| D3 | 2026-10-30 | Adopt Victor's PR #40 policy directions: manual review on unallocatable legacy balance; block repayment reversal if credit already spent; restore original store credit spent on reversed sale. | Business rule clarity and debt/credit balance safety. | User / Victor Oyeleke | spec.md, plan.md | active |
| D4 | 2026-10-30 | Deterministic `(created_at, id)` repayment allocation: repayments clear oldest eligible unpaid credit sales first with customer UUID isolation. | Resolves multi-sale debt reversal (R11/R12) without negative debt balances. | Nnaemeka Chukwuma (DM72) | spec.md, plan.md | active |
| D5 | 2026-10-30 | Reconcile merged feature sign-offs in `decisions.md` §3 (restocks PR #38, customer balance activity PR #25, dashboard/ledger PR #33). | Housekeeping: complete two-engineer agreement records for merged code. | User / Nnaemeka Chukwuma | decisions.md | active |
| D6 | 2026-11-02 | Implement Priority 1 requirements from `Api_awaiting_implementation.docx` without schema migrations: `PATCH /products/{id}` with `If-Match: version` (R1/R18), `POST /repayments` (R9), `POST /customers/{id}/store-credit` (R12), and checkout store credit drawdown in `SaleService`. | Uses existing V2 and V6 schema; provides immediate production functionality with optimistic/pessimistic concurrency. | Nnaemeka Chukwuma & Isaac Bassey | all artifacts | active |
| D7 | 2026-11-02 | Bump OpenAPI contract to v0.5.0 and record dual-engineer sign-off in `decisions.md` §3 for v0.4.0 and v0.5.0. | Authoritative contract alignment and team agreement reconciliation. | Nnaemeka Chukwuma & Isaac Bassey | openapi.yaml, decisions.md | active |

## Activity log
Append-only, newest last.
- 2026-10-30 11:41 · user · Triggered `/sdlc work on this` with the "Proposals awaiting agreement" document.
- 2026-10-30 12:08 · agent · Completed SDLC artifact chain: `intent.md`, `spec.md`, `plan.md`, `test-plan.md`, `release.md`, `EXECUTION.md`. Committed as `dc734e9`.
- 2026-10-30 12:12 · agent · Updated `contract/openapi.yaml` to v0.4.0 with `/sales/{saleId}/reversal` and `/reversals/authorizations`.
- 2026-10-30 12:15 · agent · Created Flyway migration `V6__sale_reversal_allocation.sql` and rollback `U6__sale_reversal_allocation.sql`.
- 2026-10-30 12:26 · agent · Implemented `ReversalAuthorizationController`, `ReversalAuthorizationRepository`, `SaleReversalRequestHash`, `SaleReversalService`, `SaleReversalController`.
- 2026-10-30 12:30 · agent · Implemented oldest-first debt repayment allocation engine in `CustomerRepository` (`RepaymentAllocation`). Verified with `RepaymentAllocationIT` and `SaleReversalIT`.
- 2026-11-02 11:59 · user · Uploaded `Api_awaiting_implementation.docx`: `/sdlc apply these on stockwise` signed as implemented by Nnaemeka Chukwuma and updating all necessary artifacts.
- 2026-11-02 12:15 · agent · Analyzed requirements: Product edit & optimistic archive (R1/R18), customer repayments (R9), store credit settlement & checkout drawdown (R12), secondary proposals documentation, and contract sign-off reconciliation.
- 2026-11-02 12:30 · agent · Created `PreconditionFailedException` (412) and `ErrorCode.VERSION_CONFLICT`. Mapped in `ProblemHandler`.
- 2026-11-02 12:45 · agent · Implemented `Product.Update`, `ProductRepository.update`, and `PATCH /api/v1/products/{id}` with `If-Match: version` in `ProductController`.
- 2026-11-02 13:00 · agent · Implemented `POST /api/v1/customers/{customerId}/store-credit`, `POST /api/v1/repayments`, and `POST /api/v1/customers/{customerId}/repayments` in `CustomerController` with in-memory `Idempotency-Key` replay cache.
- 2026-11-02 13:15 · agent · Extended `POST /sales` with `useStoreCredit: boolean`, integrated store credit drawdown in `SaleService`, decremented customer store credit balance, and updated `Sale.storeCreditUsedKobo`.
- 2026-11-02 13:20 · agent · Configured role permissions in `SecurityConfig.java`.
- 2026-11-02 13:25 · agent · Wrote unit tests `ProductValidationTest` and `CustomerValidationTest`; created integration tests `ProductEditIT`, `CustomerRepaymentEndpointIT`, and `StoreCreditSettlementIT`.
- 2026-11-02 13:30 · agent · Updated `contract/openapi.yaml` to v0.5.0; validated with `@redocly/cli lint` (0 errors).
- 2026-11-02 13:35 · agent · Regenerated web API types in `web/src/api/schema.d.ts`. Verified with `npm run typecheck` (0 errors), `npm run lint` (0 warnings), and Vitest (58/58 tests passed).
- 2026-11-02 13:38 · agent · Reconciled two-engineer sign-offs for v0.4.0 and v0.5.0 in `decisions.md` §3 (Nnaemeka Chukwuma and Isaac Bassey).
- 2026-11-02 13:40 · agent · Updated all SDLC artifacts in `sdlc/sale-reversal-allocation/` (`intent.md`, `spec.md`, `plan.md`, `test-plan.md`, `release.md`, `EXECUTION.md`, `WORKLOG.md`).
- 2026-11-02 13:42 · agent · Committed implementation changes (`b9f0e88`) as `feat(backend): implement product edit/archive, customer repayments, and store credit settlement` authored by Nnaemeka Chukwuma.
- 2026-11-02 13:44 · agent · Pushed branch `feat/sale-reversal-allocation` to origin (PR #41).
