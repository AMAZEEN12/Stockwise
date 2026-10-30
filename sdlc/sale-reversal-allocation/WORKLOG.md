# Work log: Real Sale Reversal & Oldest-First Repayment Allocation

Change slug: `sale-reversal-allocation` · Started: 2026-10-30 · Last updated: 2026-10-30 by Nnaemeka Chukwuma (Data and rules owner)
Source document: `docs/oldest-outstanding-sale-allocation-proposal.md`, PR #40, and `Tesa cohort 6 software engineering capstone project.pdf` (Stockwise R11, R12)

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Stage:** Build (Execution step 1: OpenAPI contract definition)
- **Step:** SDLC artifact chain complete (intent, spec, plan, test-plan, release, EXECUTION all accepted). Ready to execute Step 1: contract additions in `contract/openapi.yaml`.
- **In progress:** Beginning implementation of Step 1 (`contract/openapi.yaml`).
- **Next action:** Update `contract/openapi.yaml` with `POST /sales/{saleId}/reversal` and `POST /reversals/authorizations`, run Redocly lint, and write `V6__sale_reversal_allocation.sql`.
- **Waiting on:** Nothing (ready to code).

## How to continue without the sdlc skill
1. Stages run in order: Plan (`intent.md`), Design (`spec.md`), Build (`plan.md` + repo `AGENTS.md`), Test (`test-plan.md`), Deploy (`release.md` + repo `REVIEW.md`), Maintain (`monitoring.md`), then `EXECUTION.md`.
2. Each stage reads the accepted artifact before it. Never write a later artifact before the earlier one is accepted.
3. Fill in what is already known, then ask the user at most 5 numbered questions, each with a suggested default. Never invent answers. Mark gaps `UNRESOLVED` and carry them forward.
4. Show a short summary of each artifact and get the user's confirmation, then set `Status: accepted` with the approver and date.
5. Keep requirement IDs (R1, N1, ...) the same across `spec.md`, `plan.md` and `test-plan.md`.
6. Update this log after every round of answers, artifact change and decision.
7. Templates: `<path to sdlc skill>/templates/`. If they're not available, copy the heading structure of the artifacts already in this folder.

## Artifact status
| Artifact | Status (missing / draft / accepted) | Approved by | Date |
|----------|-------------------------------------|-------------|------|
| intent.md | accepted | User / Nnaemeka Chukwuma | 2026-10-30 |
| spec.md | accepted | User / Nnaemeka Chukwuma | 2026-10-30 |
| plan.md | accepted | User / Nnaemeka Chukwuma | 2026-10-30 |
| AGENTS.md (repo) | accepted (existing) | Team 3 | 2026-10-23 |
| test-plan.md | accepted | User / Nnaemeka Chukwuma | 2026-10-30 |
| REVIEW.md (repo) | accepted (existing) | Isaac Bassey | 2026-10-23 |
| release.md | accepted | User / Nnaemeka Chukwuma | 2026-10-30 |
| monitoring.md | deferred (DM31) | Team 3 | 2026-10-23 |
| EXECUTION.md | accepted | User / Nnaemeka Chukwuma | 2026-10-30 |

## Conventions and guidelines
- **Stack and versions:** Java 25, Spring Boot 4.1.2, JdbcClient with plain SQL (no JPA), Flyway Community with undo script per migration, PostgreSQL 17, Testcontainers. Frontend: React 19, TypeScript strict, Vite, Tailwind v4, RTK Query.
- **Naming:** kebab-case slug `sale-reversal-allocation`, migrations `V6__sale_reversal_allocation.sql` with rollback `U6__sale_reversal_allocation.sql`.
- **Code and docs style:** Integer kobo (`long` in Java, `BIGINT` in SQL, `x-unit: kobo` in OpenAPI), never floating point. Concurrency checks strictly in the database (`CHECK` constraints and `UPDATE ... WHERE ... RETURNING`). Append-only ledger; corrections are reversals, never `UPDATE` or `DELETE` on movement or ledger entries.
- **Source of truth:** Repository (`contract/openapi.yaml`, `sdlc/`, `decisions.md`).
- **Policies in force:** TeSA Capstone Brief, RFC 9457 Problem Details, DM5 (excess repaid credit sale reversal converted to store credit), DM10 (OWNER/ADMIN direct reversal permissions, assistant reversal authorization OTP).
- **Supporting skills:** `sdlc`.
- **Approvers:** Product owner: Victor Oyeleke / Team 3; Data and rules owner: Nnaemeka Chukwuma; API and access owner / Tech lead: Isaac Bassey.

## Decisions
Append-only. To change a decision, add a new entry that supersedes it.
| ID | Date | Decision | Reason | Decided by | Affects | Status |
|----|------|----------|--------|------------|---------|--------|
| D1 | 2026-10-30 | Change slug `sale-reversal-allocation` in `sdlc/sale-reversal-allocation/`. | Intake scope selection. | User / Nnaemeka Chukwuma | all artifacts | active |
| D2 | 2026-10-30 | Full SDLC chain: intent, spec, plan, test-plan, release, EXECUTION. | Financial money allocation, stock reversals, and ledger integrity are high-risk. | User (A3) | all artifacts | active |
| D3 | 2026-10-30 | Adopt Victor's PR #40 policy directions: manual review on unallocatable legacy balance; block repayment reversal if credit already spent; restore original store credit spent on reversed sale. | Business rule clarity and debt/credit balance safety. | User (A2) / Victor Oyeleke | spec.md, plan.md | active |
| D4 | 2026-10-30 | Deterministic `(created_at, id)` repayment allocation: repayments clear oldest eligible unpaid credit sales first with customer UUID isolation. | Resolves multi-sale debt reversal (R11/R12) without negative debt balances. | Nnaemeka Chukwuma (DM72) | spec.md, plan.md | active |
| D5 | 2026-10-30 | Reconcile merged feature sign-offs in `decisions.md` §3 (restocks PR #38, customer balance activity PR #25, dashboard/ledger PR #33). | Housekeeping: complete two-engineer agreement records for merged code. | User (A4) / Nnaemeka Chukwuma | decisions.md | active |

## Questions and answers
| # | Date | Stage | Question | Answer | Status |
|---|------|-------|----------|--------|--------|
| Q1 | 2026-10-30 | Intake | Which proposal should we take through the SDLC artifact chain? | "create all required open api contracts and backend services as per the contract" (Item 1: Real sale reversal and oldest-first repayment allocation) | answered |
| Q2 | 2026-10-30 | Intake | How should Victor's financial policy directions in PR #40 be incorporated into Item 1? | Accept Victor's PR #40 policy directions into intent and spec | answered |
| Q3 | 2026-10-30 | Intake | Which SDLC path depth should we follow for this change? | Full chain (intent, spec, plan, test-plan, release, EXECUTION) | answered |
| Q4 | 2026-10-30 | Intake | Should we reconcile the two-engineer sign-off records in decisions.md §3 for already-merged features? | Yes, record Nnaemeka Chukwuma's sign-off for PR #38, PR #25, and PR #33 | answered |
| Q5 | 2026-10-30 | Intake | Are there any additional supporting skills or external policies to load? | None (rely on existing repository conventions, TeSA capstone brief, and integer kobo rules) | answered |

## Activity log
Append-only, newest last.
- 2026-10-30 11:41 · user · Triggered `/sdlc work on this` with the "Proposals awaiting agreement" document.
- 2026-10-30 11:44 · agent · Ran Step 0 Intake, asked Q1-Q5 via `ask_question`.
- 2026-10-30 11:59 · user · Answered Q1-Q5 (proceed with real sale reversal & allocation, full chain, PR #40 directions, reconcile merged sign-offs).
- 2026-10-30 12:01 · agent · Reconciled two-engineer sign-off records in `decisions.md` §3 for restocks (PR #38), customer activity (PR #25), and dashboard/ledger (PR #33).
- 2026-10-30 12:02 · agent · Created `sdlc/sale-reversal-allocation/WORKLOG.md` and initiated Stage 1 Plan (`intent.md`).
