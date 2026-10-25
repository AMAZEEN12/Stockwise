# Work log: Contract v0.2.0, the MVP-ready contract proposals

Change slug: `contract-v0-2` · Started: 2026-10-25 · Last updated: 2026-10-25 by the agent (for Nnaemeka Chukwuma, handover)
Source documents: [docs/customers-contract-proposal.md](../../docs/customers-contract-proposal.md) and [docs/products-sales-contract-proposal.md](../../docs/products-sales-contract-proposal.md). Both were proposed by Codex under Victor Oyeleke's UI work, and both are marked "pending Isaac Bassey and Nnaemeka Chukwuma" (not approved).
Parent chain: the main Stockwise artifacts in [sdlc/](../) (intent, spec, plan, test-plan, release are accepted). Its log is [sdlc/WORKLOG.md](../WORKLOG.md).

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Stage:** Build (short path, D3). Proposal **A is implemented and verified** on branch `feat/contract-v0-2`, in [PR #16](https://github.com/AMAZEEN12/Stockwise/pull/16), stacked on PR #15 (`docs/handover-log`). B, C and D are not started.
- **Step:** A done:
  - contract v0.2.0 (optional `Idempotency-Key` on `POST /customers`, 422 response);
  - migration V4 with its undo U4;
  - repository, controller and error mapping;
  - `CustomerIdempotencyIT` (7 tests);
  - the removal check (logged);
  - web types regenerated.
- **In progress:** nothing half-done. `intent.md`, `plan.md` and `test-plan.md` are **draft**: written and used, but not yet accepted by anyone.
- **Next action:**
  1. Ask the user to accept (or correct) intent.md, plan.md and test-plan.md, one at a time, with a decided-by question each.
  2. Then implement **B** (customer search/order definition and `CustomerPage.asOf`), **C** (`Kobo` maximum 9007199254740991 plus request validation) and **D** (`GET /product-categories`, the `active` filter on `GET /products`). Each needs a contract edit, a `decisions.md` §3 line, tests, regenerated web types and the checks in test-plan.md.
  3. Then write EXECUTION.md (short path) and add A-D rows to `docs/rule-removal-log.md` as each rule lands.
- **Waiting on:** the user (acceptance of the three drafts); Isaac Bassey (his half of the v0.2.0 line in `decisions.md` §3, and the migration review for V4, a release.md high-risk path); merging PR #15 first, so this branch's PR can target `main`.

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
| intent.md | **draft** (written 2026-10-25, used to build A; not yet accepted) | | 2026-10-25 |
| spec.md | missing (not needed on the short path) | | |
| plan.md | **draft** (A done; B-D listed) | | 2026-10-25 |
| test-plan.md | **draft** (A's tests listed and green) | | 2026-10-25 |
| release.md | missing (not needed on the short path; main release.md applies) | | |
| monitoring.md | missing (deferred for the whole product, DM31) | | |
| EXECUTION.md | missing | | |

## The proposals, labelled
From intake. The proposal files are the source; these labels are only for this log.

| # | Proposal | Touches | In scope (D1) |
|---|---|---|---|
| A (**done**) | `POST /customers` takes an `Idempotency-Key` (same key and body give the original 201; a different body gives 422 `IDEMPOTENCY_KEY_REUSED`) | contract, new migration V4 with its undo U4 (key and hash on `customer`), `CustomerRepository`, `CustomerController`, tests | **yes** |
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
| D3 | 2026-10-25 | Short SDLC path (intent, plan, test-plan, EXECUTION), with the artifacts written as **draft** and implementation started before their acceptance. | Q3 was not answered; the user then said "continue with the migration and record everything done in the log". So the suggested default (short path) was taken, and the order of work became A first (it carries the only migration). | Defaulted from the user's instruction (Nnaemeka Chukwuma); logged by Nnaemeka Chukwuma | intent.md, plan.md, test-plan.md | active |
| D4 | 2026-10-25 | Proposal A design: the header is **optional** (additive); key, hash and `created_by` are stored on the `customer` row; `UNIQUE (idempotency_key)` plus `ON CONFLICT DO NOTHING`; a replay must come from the same user with the same normalised body, otherwise 422; a CHECK requires key and hash together; keys are kept for the life of the customer. | A required header would break the v0.1.0 web (D1). Sales already keep their key on the row. A global UUID key with a same-user check is simpler than a per-user unique index. | agent proposal under D3, for Isaac Bassey's review | contract, V4, CustomerRepository | active |

## Questions and answers
| # | Date | Stage | Question | Answer | Status |
|---|------|-------|----------|--------|--------|
| Q1 | 2026-10-25 | Intake | Which proposals should this change implement? (Safe set now and the rest later / Everything now / Plan only) | "make it MVP ready" (taken as A-D now, E-H later: D1) | answered |
| Q2 | 2026-10-25 | Intake | Who should be recorded as the decision maker for the scope choice? | "request by victor and implemented by nnaemeka" | answered |
| Q3 | 2026-10-25 | Intake | Short path (intent, plan, test-plan, EXECUTION) or the full chain? Plus who decides. | Not answered directly; the next instruction was "continue with the migration and record everything done in the log", taken as the suggested default, the short path (D3) | defaulted |
| Q4 | 2026-10-25 | Build | Accept intent.md, plan.md and test-plan.md (drafts)? | not yet asked | **open** |

Facts settled at intake without asking (from the proposals and the main log): the target is the existing Stockwise repository; the repository is the source of truth; the policies are the TeSA brief; A's migration is a high-risk path needing Isaac Bassey's review; contract changes need two engineers in `decisions.md` §3; supporting skills: none for the backend (the local `shared-components` skill applies to web work only).

## Activity log
Append-only, newest last.
- 2026-10-25 · user · Ran `/sdlc implement these` with the two proposal files.
- 2026-10-25 · agent · Read both proposals and classified the entry route as "idea or brief" (proposals, not an external ticket system). Labelled them A-H and asked Q1/Q2 (answered), then Q3 (unanswered).
- 2026-10-25 · agent · Created this log for the handover (user: "update log in preparation for handover to new agent"). No code or contract changed for this change yet.
- 2026-10-25 · user · "continue with the migration and record everything done in the log".
- 2026-10-25 · agent · Took the short path (D3). Wrote `intent.md`, `plan.md` and `test-plan.md` as drafts. Created branch `feat/contract-v0-2` from `docs/handover-log`.
- 2026-10-25 · agent · Contract: `info.version` 0.2.0; `POST /customers` gets the optional `IdempotencyKeyOptional` header and a 422 `IDEMPOTENCY_KEY_REUSED` response, with the replay rules in its description. `decisions.md` §3 has a v0.2.0 line, agreed by Nnaemeka and pending Isaac. `redocly lint`: valid.
- 2026-10-25 · agent · Migration `V4__customer_idempotency.sql` (`idempotency_key`, `request_hash`, `created_by`; `customer_idempotency_key_uq`; `customer_key_and_hash_together`) and undo `U4__customer_idempotency.sql`. `MigrationRollbackIT`, `SchemaRulesIT` and `SeedVerificationIT` green.
- 2026-10-25 · agent · Code:
  - `common/IdempotencyKeyReused` (422), mapped in `ProblemHandler`;
  - `customer/CustomerRequestHash` (SHA-256 of the normalised body);
  - `CustomerRepository.create(New, key, createdBy)`, which runs `INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`, then on a replay checks the same user and hash;
  - `CustomerController` reads the optional header.
- 2026-10-25 · agent · `CustomerIdempotencyIT` (7 tests): replay returns the original (normalised body included), 10 parallel retries create one customer, a different body gets 422, another user gets 422, no header keeps the v0.1.0 behaviour, a malformed key gets 400, and the database CHECK holds. Removal check: without `ON CONFLICT` the test failed 4 of 7 (500 instead of 201/422); logged in `docs/rule-removal-log.md`.
- 2026-10-25 · agent · Results:
  - `./mvnw clean verify`: **95 tests, 0 failures**;
  - web: `npm ci`, `npm run generate:api` (schema.d.ts +24/-1, additive only: the optional header and the 422), `typecheck` clean, `lint` clean, `vitest` 27 of 27;
  - `check-migrations.sh` and `check-contract-log.sh` OK against `origin/main`.
- 2026-10-25 · agent · Committed `99bc2c9`, pushed `feat/contract-v0-2`, and opened [PR #16](https://github.com/AMAZEEN12/Stockwise/pull/16) (base `docs/handover-log`, 19 files). The description requests Isaac Bassey's review of V4 (high-risk path) and his half of the v0.2.0 sign-off; he can't be requested formally until AMAZEEN12 invites him as a collaborator.
