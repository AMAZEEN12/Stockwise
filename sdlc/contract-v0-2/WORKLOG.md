# Work log: Contract v0.2.0, the MVP-ready contract proposals

Change slug: `contract-v0-2` · Started: 2026-10-25 · Last updated: 2026-10-25 by the agent (for Nnaemeka Chukwuma, handover)
Source documents: [docs/customers-contract-proposal.md](../../docs/customers-contract-proposal.md) and [docs/products-sales-contract-proposal.md](../../docs/products-sales-contract-proposal.md). Both were proposed by Codex under Victor Oyeleke's UI work, and both are marked "pending Isaac Bassey and Nnaemeka Chukwuma" (not approved).
Parent chain: the main Stockwise artifacts in [sdlc/](../) (intent, spec, plan, test-plan, release are accepted). Its log is [sdlc/WORKLOG.md](../WORKLOG.md).

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Stage:** Intake (Step 0), nearly done. No artifact written yet; no code changed.
- **Step:** Intake answers recorded (Q1, Q2). The path question (Q3) was asked but not answered.
- **In progress:** nothing half-done.
- **Next action:** Ask the user Q3 again, as one question with a decided-by question beside it (user preference): "Short path (intent, plan, test-plan, EXECUTION in this folder) or full chain?" The suggested default is the short path, because the main Stockwise spec, release and REVIEW still govern. Then write `intent.md` from the sdlc templates for proposals **A-D only** (see D1), and show a 5-10 line summary for confirmation before writing the next artifact.
- **Waiting on:** the user (Q3). Later: two-engineer sign-off of the contract change (Isaac Bassey and Nnaemeka Chukwuma) in `decisions.md` §3 before the contract is merged. CI blocks a contract change without a `decisions.md` change (`.github/scripts/check-contract-log.sh`).

## How to continue without the sdlc skill
1. Stages run in order: Plan (intent.md), Design (spec.md), Build (plan.md), Test (test-plan.md), Deploy (release.md), Maintain (monitoring.md), then EXECUTION.md. If the short path is chosen, write only intent.md, plan.md, test-plan.md and EXECUTION.md. EXECUTION.md then says why spec, release and monitoring aren't repeated: the main Stockwise ones apply.
2. Each stage reads the accepted artifact before it. Never write a later artifact before the earlier one is accepted.
3. Fill in what is already known, then ask only about gaps. Never invent answers. Mark gaps `UNRESOLVED` and carry them forward.
4. Show a short summary of each artifact and get the user's confirmation, then set `Status: accepted` with the approver and date.
5. Keep requirement IDs the same across the artifacts of this change.
6. Update this log after every answer, artifact change and decision.
7. Templates: `../.claude/skills/sdlc/templates/` in the local workspace (the parent folder of the `stockwise/` repository). If they aren't available, copy the heading structure of the main artifacts in `sdlc/`.

## Artifact status
| Artifact | Status (missing / draft / accepted) | Approved by | Date |
|----------|-------------------------------------|-------------|------|
| intent.md | missing | | |
| spec.md | missing (not needed on the short path) | | |
| plan.md | missing | | |
| test-plan.md | missing | | |
| release.md | missing (not needed on the short path; main release.md applies) | | |
| monitoring.md | missing (deferred for the whole product, DM31) | | |
| EXECUTION.md | missing | | |

## The proposals, labelled
From intake. The proposal files are the source; these labels are only for this log.

| # | Proposal | Touches | In scope (D1) |
|---|---|---|---|
| A | `POST /customers` takes an `Idempotency-Key` (same key and body give the original 201; a different body gives 422 `IDEMPOTENCY_KEY_REUSED`) | contract, new migration V4 with its undo U4 (key and hash on `customer`), `CustomerRepository`, `CustomerController`, tests | **yes** |
| B | Customer search and order defined (trimmed, case-insensitive, stable order with UUID tie-break); `asOf` on `CustomerPage`; duplicate names allowed; validation rules and field names documented | contract wording; `asOf` in the response | **yes** |
| C | Money bounded to 0..9007199254740991 kobo (JavaScript's safe integer range) in requests and responses, including totals | contract (`maximum` on `Kobo`), request validation | **yes** |
| D | `GET /product-categories` (complete sorted list); optional `active` filter on `GET /products` | contract, `ProductRepository`, `ProductController`, tests | **yes** |
| E | `SaleLineCreate.expectedUnitPriceKobo` checked inside the guarded `UPDATE`; 409 `PRODUCT_CHANGED`; `Problem.conflicts` | contract, sale transaction (high-risk) | no: after Monday |
| F | Sale settlement: subtotal, store credit applied (`min(credit, subtotal)` atomically), amount due (DM5, spec R12) | sale transaction, store-credit guard (plan step 16) | no: after Monday |
| G | `POST /sale-quotes` | new resource and table | no: after Monday |
| H | `GET /sale-submissions/{idempotencyKey}` | new read endpoint | no: after Monday |

## Conventions and guidelines
- **Everything in the main log's Conventions applies** ([sdlc/WORKLOG.md](../WORKLOG.md)): Java 25, Spring Boot 4.1.2, JdbcClient with plain SQL, Flyway with an undo script per migration, integer kobo, rules in the database, one test per rule that fails when the rule is removed, Testcontainers Postgres 17.
- **Contract first:** change `contract/openapi.yaml` before any controller. Bump `info.version` to `0.2.0`. Add a dated `decisions.md` §3 line naming two engineers (Isaac Bassey and Nnaemeka Chukwuma). Lint with `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml`.
- **Additive only for A-D:** no field the web already reads may change meaning or disappear. After the contract changes, regenerate the web types with `cd web && npm run generate:api` and check that `npm run typecheck` still passes.
- **Frozen migrations:** V1-V3 are applied. A needs a new `V4__customer_idempotency.sql` (name to be confirmed in plan.md) with `db/rollback/U4__customer_idempotency.sql`. `MigrationRollbackIT` must stay green.
- **Branch:** work on a new `feat/contract-v0-2` branch from `origin/main`, never on `main`. Open a PR; no force pushes.
- **Commits and PRs:** no Claude or agent attribution lines (user instruction, 2026-10-25).
- **Source of truth:** the repository.
- **Approvers:** requester Victor Oyeleke; implementer Nnaemeka Chukwuma; contract sign-off Isaac Bassey and Nnaemeka Chukwuma; migration review Isaac Bassey (release.md high-risk path).
- **User preferences:** ask decisions one at a time, with plain explanations and concrete examples, and ask each time who to record as the decision maker. Record "Decided by" and "Logged by" separately; Nnaemeka Chukwuma is the logger.

## Decisions
Append-only. To change a decision, add a new entry that supersedes it.
| ID | Date | Decision | Reason | Decided by | Affects | Status |
|----|------|----------|--------|------------|---------|--------|
| D1 | 2026-10-25 | Scope is "MVP ready": implement proposals A-D as contract v0.2.0 before the Monday checkpoint. E-H (price guard, store-credit settlement, quotes, submission lookup) are planned as a later change after Monday. | The user answered "make it MVP ready". A-D are additive, so the web built on v0.1.0 keeps working. E-H change the sale transaction (a high-risk path) the night before the demo, and store credit is planned for step 16. | Requested by Victor Oyeleke, implemented by Nnaemeka Chukwuma (user's wording); logged by Nnaemeka Chukwuma | all artifacts of this change | active |
| D2 | 2026-10-25 | Change slug `contract-v0-2`, artifacts in `stockwise/sdlc/contract-v0-2/`. | Proposed at intake; not objected to. | agent proposal, not yet explicitly confirmed | this folder | active |

## Questions and answers
| # | Date | Stage | Question | Answer | Status |
|---|------|-------|----------|--------|--------|
| Q1 | 2026-10-25 | Intake | Which proposals should this change implement? (Safe set now and the rest later / Everything now / Plan only) | "make it MVP ready" (taken as A-D now, E-H later: D1) | answered |
| Q2 | 2026-10-25 | Intake | Who should be recorded as the decision maker for the scope choice? | "request by victor and implemented by nnaemeka" | answered |
| Q3 | 2026-10-25 | Intake | Short path (intent, plan, test-plan, EXECUTION) or the full chain? Plus who decides. | not answered: the user moved on to the handover | **open** |

Facts settled at intake without asking (from the proposals and the main log): the target is the existing Stockwise repository; the repository is the source of truth; the policies are the TeSA brief; A's migration is a high-risk path needing Isaac Bassey's review; contract changes need two engineers in `decisions.md` §3; supporting skills: none for the backend (the local `shared-components` skill applies to web work only).

## Activity log
Append-only, newest last.
- 2026-10-25 · user · Ran `/sdlc implement these` with the two proposal files.
- 2026-10-25 · agent · Read both proposals and classified the entry route as "idea or brief" (proposals, not an external ticket system). Labelled them A-H and asked Q1/Q2 (answered), then Q3 (unanswered).
- 2026-10-25 · agent · Created this log for the handover (user: "update log in preparation for handover to new agent"). No code or contract changed for this change yet.
