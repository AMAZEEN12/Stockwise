# Work log: Stockwise (Team 3 main product)

Change slug: `stockwise` · Started: 2026-10-23 · Last updated: 2026-10-25 by Codex (logging assistant for Victor Oyeleke)
Source document: `Tesa cohort 6 software engineering capstone project.pdf` (TeSA Africa, "Four Real-World Products", 26 pages; Stockwise is product 3, pages 10-11; shared requirements pages 23-26)

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Documentation publication completed, 2026-10-25 (DM54):** committed the approved correction as 285cf91 (docs(ui): align shared component agreement and source notes), pushed fix/shared-component-documentation, and opened [PR #6](https://github.com/AMAZEEN12/Stockwise/pull/6) into main. GitHub confirmed open, non-draft and not merged. The branch starts directly from origin/main (c3633df) and includes only Markdown; the original feat/customers-ui workspace and its independent edits are preserved. Decided by Victor Oyeleke (publication scope); Codex (isolation/adaptation). Logged by Codex.
- **Shared-source documentation correction, 2026-10-25 (DM53):** Victor confirmed and approved four interface engineers, matching upstream. Current guidance is corrected; earlier references to five are historical and superseded. Approved Card and Select/Checkbox source clarifications, immutable revision links and owners are in docs/shared-component-alignment.md. This round updates Markdown only; component migration proposals remain pending. Decided by and approved by Victor Oyeleke; logged by Codex.
- **Current publication:** persistent guidance commit 2f15ec4 confirmed; Victor's recent Home/CSS/Screens changes committed as e200ce0 and pushed before PR creation (DM43). [PR #3](https://github.com/AMAZEEN12/Stockwise/pull/3) is open from feat/auth-ui into main, not merged. Human review is next; no deployment was performed.
- **Standing instruction reaffirmed by Victor:** before every new task, read root AGENTS.md, including Mistakes to avoid. DM41's three Tailwind replacements are persistent frontend conventions; the startup reminder, exact mapping and Victor/Codex attribution are now explicit there. Existing component replacements remain applied.
- **Current alignment follow-up:** Applied/verified canonical Tailwind replacements (DM41). Victor selected contract mock development (DM42); local mock-only configuration is set, and actual browser sign-in/refresh/logout passed. Task-owned mock/Vite processes were stopped after implementation verification; no currently running preview is claimed. Victor's supplied Home/CSS refinements are committed; web/Screens stays local and ignored under DM45. His example D badge is vite.config.ts: current web/vite.config.ts exists and is tracked; the precise IDE view cannot be reproduced from Git.
- **Stage:** Frontend implementation authorized by Victor on 2026-10-24, following review of all 16 references.
- **In progress:** Home and authentication UI is in open PR #3; Products and Sales are in open PRs #4 and #5. Merged API/database work from PR #2 is retained. Main now includes merged structure PR #1 (2d170e6); its work-log conflict was reconciled on Products and carried into Sales without application changes.
- **Next action:** Human review of PRs #3, #4 and #5 in that order, including captured Products/Sales screens and remaining visual differences. Sales/store-credit review requires Isaac Bassey's sign-off under REVIEW.md. API owners must resolve registration, authoritative credit settlement, price guards, recovery lookup and pending two-engineer contract sign-off. No automatic main merge or deployment.
- **Waiting on:** Registration API approval, seeded demo credentials, backend authentication implementation, and the two-engineer contract sign-off still marked pending in the merged log.
- **Backend, step 9 (Nnaemeka Chukwuma, Data and rules), 2026-10-25:** the sale transaction's service part (`SaleService`, `SaleRepository`) is in [PR #7](https://github.com/AMAZEEN12/Stockwise/pull/7) from `feat/sale-transaction` into main, after PR #2 merged. `./mvnw clean verify`: 32 tests green; `SaleConcurrencyIT` and `IdempotencyIT` looped 20/20; five removal checks in `docs/rule-removal-log.md`. Next: Isaac Bassey reviews PR #7 (riskiest step, REVIEW.md) and writes `SaleController` and `ProblemHandler` from the signature and error mapping in plan.md "Departures recorded". Store-credit draw comes with step 16. Isaac isn't a repo collaborator yet, so the owner (AMAZEEN12) must invite him. Next for Nnaemeka: `evidence/no-stock-guard` (step 12) and the Monday seed (step 14).
- **Backend before Monday (Nnaemeka Chukwuma, Data and rules), 2026-10-25:** branch `feat/monday-data` (stacked on PR #7) adds `ProductRepository`, `CustomerRepository`, the Monday seed with demo logins (`SeedVerificationIT`), and the step 12 evidence logs (`docs/evidence/concurrency/`, from branch `evidence/no-stock-guard`). Full build: 57 tests green. Nnaemeka's half of the v0.1.0 contract sign-off is recorded in decisions.md §3; Isaac's is still pending. Blocking the Monday journey, outside this area: `StockwiseApplication`, `application.yml` with the demo seed location, the Dockerfile, CI and deploy (Blessing), and auth plus the controllers (Isaac).

## How to continue without the sdlc skill
1. Stages run in order: Plan (intent.md), Design (spec.md), Build (plan.md + repo AGENTS.md), Test (test-plan.md), Deploy (release.md + repo REVIEW.md), Maintain (monitoring.md), then EXECUTION.md.
2. Each stage reads the accepted artifact before it. Never write a later artifact before the earlier one is accepted.
3. Fill in what is already known, then ask the user at most 5 numbered questions, each with a suggested default. Never invent answers. Mark gaps `UNRESOLVED` and carry them forward.
4. Show a short summary of each artifact and get the user's confirmation, then set `Status: accepted` with the approver and date.
5. Keep requirement IDs (R1, N1, ...) the same across spec.md, plan.md and test-plan.md.
6. Update this log after every round of answers, artifact change and decision.
7. Templates: `.claude/skills/sdlc/templates/`. If they're not available, copy the heading structure of the artifacts already in this folder.
8. Stockwise (main product) goes first; the side project Genie has its own chain in its own repository (`genie/sdlc/` in the local workspace) and follows the lighter "Side project standard".

## Artifact status
| Artifact | Status (missing / draft / accepted) | Approved by | Date |
|----------|-------------------------------------|-------------|------|
| intent.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| spec.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| plan.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| Frontend phase 2 amendment and docs/frontend-architecture.md | accepted (DM32-DM36; other area approvals unchanged) | Victor Oyeleke | 2026-10-24 |
| AGENTS.md (repo) | draft (commands planned, not yet verified) | | 2026-10-23 |
| test-plan.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| REVIEW.md (repo) | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| release.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| monitoring.md | deferred (DM31) | Team 3 | 2026-10-23 |
| EXECUTION.md | written (runbook) | Nnaemeka Chukwuma | 2026-10-23 |

## Conventions and guidelines
- **Stack and versions:** service: Java 25, Spring Boot 4, Flyway, JUnit + Testcontainers, PostgreSQL (DM1). Hosting: Vercel + Render + Neon, terms to verify (DM2). Auth: email+password, bcrypt, JWT bearer (DM3). Interface constraints from the brief: React interface with React Router (or equivalent) and Tailwind or plain CSS, typed models (no `any`); own HTTP service; free managed Postgres; GitHub Actions deploys both tiers; free tiers only.
- **Naming:** change slugs `stockwise` and `genie`. Two repositories (DM19): this one is `stockwise/` (code, `sdlc/`, `AGENTS.md`, `decisions.md`, `deploy-plan.md`). Genie is a separate repository. Artifacts are independent (DM20).
- **Code and docs style:** frontend folder map and conventions are in `docs/frontend-architecture.md` (DM32–DM40, DM53). One API file per resource, central endpoints, Axios HTTP client, Formik/Yup, Redux Toolkit/RTK Query, React Router Data Mode and Tailwind v4. Four engineers' shared copy-in source adopted; count confirmed and approved by Victor under DM53. Stockwise tokens override neutral values. Read docs/shared-component-alignment.md for approved source clarifications. Shadcn is not required. Use feature branches and descriptive commits. Backend conventions remain unchanged.
- **Versions (verified on Maven Central 2026-10-23):** Spring Boot 4.1.2 parent (manages Flyway 12.4.0, Testcontainers 2.0.5, postgresql 42.7.14, failsafe 3.5.6); exec-maven-plugin 3.6.4; Maven wrapper pinned to 3.9.16. Integration tests are `*IT` classes, run by Failsafe in `./mvnw verify`, against `postgres:17-alpine`.
- **Docker:** Docker Desktop must be running (per-user install at `%LOCALAPPDATA%/Programs/DockerDesktop`).
- **Local ports:** the Prism mock runs on **4710**, not its default 4010. Windows on Nnaemeka's machine reserves TCP 3965-4064 (Hyper-V/WSL). The mock serves paths at the root; the real service serves them under `/api/v1` on 8080. Prism returns 422 for invalid requests, while the real service returns 400 `VALIDATION_FAILED`.
- **Source of truth:** the repository. The Markdown artifacts are authoritative; the TeSA PDF brief is the originating record.
- **Policies in force:** TeSA brief sections "Shared technical requirements", "Shared rules for fairness", "Delivery and cost" and the assessment rubric (PDF pages 3, 23-26). No other organisational policy supplied.
- **Supporting skills:** none.
- **Approvers:** product owner: Nnaemeka Chukwuma (acting). Team lead and technical sign-off: Isaac Bassey. Area owners: Nnaemeka (Data and rules), Isaac (API and access), Blessing Nwafor (Delivery and evidence). Supervisor: Goodnews (reviews at checkpoints).
- **User preferences for this workflow:** structured multiple-choice questions with a recommended default, asked one decision at a time, with plain explanations and concrete examples. For every decision, also ask who to record as the decision maker (options: Team 3, a named engineer, the supervisor). Record "Decided by" and "Logged by" separately. Nnaemeka Chukwuma is the existing decision-log owner and historical logger. Victor explicitly owns DM32-DM36; Codex records those entries as logging assistant, without attributing wider team approval. Do not re-ask these settled choices.

## Decisions
Append-only. To change a decision, add a new entry that supersedes it.
| ID | Date | Decision | Reason | Decided by | Affects | Status |
|----|------|----------|--------|------------|---------|--------|
| D1 | 2026-10-23 | The SDLC chain covers Team 3: Stockwise (main) and Genie (side), one change folder each, Stockwise first | The user's team allocation; the main product carries the marks | user | all | active |
| D2 | 2026-10-23 | (superseded by D15) Layout: this folder is the parent, with subfolder `stockwise/` (main) and `genie/` (side). SDLC artifacts live in `sdlc/<slug>/` at the parent; AGENTS.md and REVIEW.md at the parent | User asked for a parent folder with two subfolders | user | plan.md, AGENTS.md | active |
| D3 | 2026-10-23 | Source of truth is the repository | No external tracker named; the brief is a PDF | agent (default, not objected) | all headers | active |
| D4 | 2026-10-23 | The user approves artifacts for now; a team lead is not designated yet | User's answer at intake | user | all | active |
| D5 | 2026-10-23 | Plan against a final submission date of Tue 3 Nov 2026 (Day 14), marked UNRESOLVED until a facilitator confirms | The brief leaves the date to the facilitators | Nnaemeka Chukwuma | intent.md, EXECUTION.md | active |
| D7 | 2026-10-23 | Service stack: Java 25 + Spring Boot 4 + Flyway + JUnit/Testcontainers + PostgreSQL | User's choice (the agent had recommended Node/TS) | Nnaemeka Chukwuma | spec.md, plan.md | active |
| D8 | 2026-10-23 | Hosting: Vercel + Render + Neon, pending pricing-page verification | User's choice | Nnaemeka Chukwuma | spec.md, release.md | active |
| D9 | 2026-10-23 | Auth: email+password with bcrypt, JWT bearer, roles OWNER/ASSISTANT/ADMIN | User's choice | Nnaemeka Chukwuma | spec.md | active |
| D10 | 2026-10-23 | Keep all three PD1 options (A allow/refund owed, B block, C store credit) open until team members confirm. Until then the service refuses that case with REVERSAL_NEEDS_DECISION | User: "keeps all 3 options open until other team members can confirm" | Nnaemeka Chukwuma | spec.md R12 | active |
| D11 | 2026-10-23 | Pending and made decisions for the product live in `stockwise/decisions.md` (also the brief's decisions file and contract change log) | User asked for decisions to be written in decisions.md | Nnaemeka Chukwuma | all | active |
| D12 | 2026-10-23 | Resolve pending decisions one at a time. PD1 option C (store credit), PD2 3 Nov final with the 26 Oct presentation, PD3 lead Isaac Bassey, PD4 Nnaemeka Data and rules / Isaac API and access / Blessing Delivery, PD5 both stacks in parallel (Stack V official until Qocent funding is known), PD6 OWNER and ADMIN may reverse. Full text: `stockwise/decisions.md` DM5-DM10 | User's answers | Nnaemeka Chukwuma | spec.md, plan.md, release.md | active |
| D13 | 2026-10-23 | Created `deploy-plan.md` (repo root) covering Qocent + Neon and Vercel + Render + Neon for both products | User asked for a deploy plan for both stacks after reading apps.qocent.com | agent | release.md | active (draft) |
| D14 | 2026-10-23 | Attribution correction: every decision in D1-D13 and DM1-DM11 recorded as decided by "user" or "Nnaemeka Chukwuma" was made by **Team 3 as a team** and only **logged** by Nnaemeka Chukwuma. From now on, record "Decided by" and "Logged by" separately, and ask who to record as the decision maker for each new decision | User's instruction | Team 3 (logged by Nnaemeka Chukwuma) | all decision tables | active |
| D15 | 2026-10-23 | Build answers: Maven wrapper (DM17, Blessing Nwafor), JdbcClient plain SQL (DM18, Nnaemeka Chukwuma), two repos (DM19, Team 3), independent per-repo artifacts (DM20, Team 3). Supersedes D2's single-folder artifact layout: artifacts moved from `sdlc/stockwise/` to `stockwise/sdlc/`, from `sdlc/genie/` to `genie/sdlc/`, and `deploy-plan.md` moved to `stockwise/deploy-plan.md` | User's answers | Team 3 (logged by Nnaemeka Chukwuma) | all paths | active |
| D16 | 2026-10-23 | Web tooling Vite + React + TS (DM21, Victor Oyeleke). The user re-asked the question and gave the same answer, so DM21 stands | User's answer | Victor Oyeleke (logged by Nnaemeka Chukwuma) | plan.md | active |
| D17 | 2026-10-23 | Test answers: coverage 80% on rule packages (DM22, Team 3), CI test guard plus CODEOWNERS (DM23, Team 3), Playwright screenshots of key screens (DM24, Victor Oyeleke), small eval suite after Monday (DM25, Team 3) | User's answers | as listed (logged by Nnaemeka Chukwuma) | test-plan.md, AGENTS.md | active |
| D18 | 2026-10-23 | Deploy answers: release manager Isaac Bassey with Blessing Nwafor as backup (DM26, Isaac), staging after Monday (DM27, Isaac), rollback rehearsals Sat 24 Oct plus two after Monday (DM28, Team 3), no AI agent in CI (DM29, Team 3), reviews with 5 nits and one code-owner approval, plus Isaac for high-risk code (DM30, Isaac) | User's answers | as listed (logged by Nnaemeka Chukwuma) | release.md, REVIEW.md | active |
| D19 | 2026-10-23 | Monitoring postponed (DM31). monitoring.md is a deferred placeholder | User answered "monitoring should be postponed" to Maintain 1 | Team 3 (logged by Nnaemeka Chukwuma) | monitoring.md, EXECUTION.md | active |
| D6 | 2026-10-23 | Propose "reversing a partly repaid credit sale (negative balance)" as Stockwise's design problem, pending Goodnews's agreement | The brief names no design problem for Stockwise | Nnaemeka Chukwuma | intent.md, spec.md | active |
| D20 | 2026-10-24 | Frontend phase 2 accepted: folders/docs and empty HTTP-client file; resource API files, central endpoints, image exports, app-wide foundational tokens, Formik/Yup, Axios, Redux Toolkit/RTK Query and Router Data Mode. Shared-component agreement pending and shadcn not required. Bootstrap docs on main then publish starter on a separate branch/PR. Details DM32-DM36 | Victor's answers and explicit implementation request in this conversation | Victor Oyeleke (logged by Codex, logging assistant) | frontend docs, plan, spec, AGENTS.md | active |

## Questions and answers
| # | Date | Stage | Question | Answer | Status |
|---|------|-------|----------|--------|--------|
| Q1 | 2026-10-23 | Intake | Which products does the chain cover? | Stockwise + Genie | answered |
| Q2 | 2026-10-23 | Intake | Who accepts intent / signs off artifacts? | "Me, not lead yet" | answered |
| Q3 | 2026-10-23 | Intake | Which service-tier area do you own? | "work on all service tiers" | answered |
| Q4 | 2026-10-23 | Intake | Repository layout? | "a parent folder with 2 subfolders one for main and one for side project" | answered |
| Q5 | 2026-10-23 | Intake | Team lead for Team 3? | not designated yet | open |
| Q6 | 2026-10-23 | Intake | Final submission date (brief asks facilitators to confirm) | "Tue 3 Nov, unconfirmed": plan for 3 Nov, carry as UNRESOLVED (owner Goodnews) | open |
| Q7 | 2026-10-23 | Plan | Name to record as author/approver? | Nnaemeka Chukwuma | answered |
| Q9 | 2026-10-23 | Design | Service stack? | "java 25 and spring boot 4, flyway, JUnit + Test containers, postgresql for database" | answered |
| Q10 | 2026-10-23 | Design | Hosting? | Vercel + Render + Neon | answered |
| Q11 | 2026-10-23 | Design | Auth? | Email+password, JWT bearer | answered |
| Q13 | 2026-10-23 | Maintain | What runs the monitoring checks? | "monitoring should be postponed" (decided by Team 3) | answered (deferred) |
| Q12 | 2026-10-23 | Design | Provisional rule for the design problem? | "keeps all 3 options open until other team members can confirm, write decisions that need to be confirmed/made in decisions.md" | answered (PD1 open) |
| Q8 | 2026-10-23 | Plan | How to handle Stockwise's missing design problem? | "Propose one, ask Goodnews" | answered (proposal UNRESOLVED) |
| Q14 | 2026-10-24 | Frontend phase 2 | Starter scope? | Folders, documentation, `.gitkeep` placeholders and one explicitly requested empty `http-client.ts`; frontend and docs only | answered |
| Q15 | 2026-10-24 | Frontend phase 2 | API and asset separation? | One file per resource, central endpoint definitions, central image named exports | answered |
| Q16 | 2026-10-24 | Frontend phase 2 | Components and tokens? | `components/ui/` plus `shared/` utilities; app-wide foundational tokens, login-specific hero/coin/wordmark; shared-component agreement pending, shadcn not required | answered |
| Q17 | 2026-10-24 | Frontend phase 2 | Attribution? | Decided by Victor Oyeleke; Codex as logging assistant; no implied cross-team approval | answered |
| Q18 | 2026-10-24 | Frontend phase 2 | Publish from an empty remote? | One-time docs baseline on main, then separate `chore/web-structure` commit/push and PR; never force-push or merge automatically | answered |

## Activity log
- 2026-10-25 · Codex · Sales implementation and QC completed on feat/sales-ui, stacked on Products 86fb5ea. Checks: lint/typecheck exit 0; unit output `Test Files 5 passed (5) / Tests 10 passed (10)`; latest full browser output `30 passed (3.1m)` with axe checks and no assertion weakening; production build `346 modules transformed / built in 17.36s` (main chunk 526.17 kB, gzip 173.16 kB warning retained). Contract lint remains valid and OpenAPI/generated types have no diff. Actual development API checks passed create/read/duplicate, integer validation, same-key replay, changed-body 422, stock conflict and credit settlement; actual browser without interception passed sign-in → open shop → add product → catalogue → confirmation → receipt → refresh. A workspace link contrast conflict was fixed and checked in that journey. A decorative status-icon text failure was fixed with SVG and added to AGENTS.md; tests were not loosened. Temporary visual-inspection script removed after lint caught it in the ignored scratch folder. Service verify: sandbox wrapper access first failed, then permitted wrapper invocation reported `The JAVA_HOME environment variable is not defined correctly`; no service pass is claimed. Final normalized visual differences are in docs/products-sales-ui.md and local .mock/design-comparison.json; they are not approved exact baselines. All 62 local reference PNGs remain; Git tracks none. No business rule or migration changed. Human visual review and API-owner agreement on proposed settlement/price/recovery fields remain next.
- 2026-10-24 · Codex · Products on feat/products-ui: shared layout, catalogue/filters, owner-only drawer/mobile form, exact money helpers, immutable contract aliases and stateful local product simulation. Verified lint and typecheck exit 0; 4 unit files/8 tests passed; contract lint valid; production build passed (338 modules, 20.82s, existing vendor-size warning noted). Playwright Products desktop/mobile 2 passed in 31.9s with one worker, including axe and unsaved-change checks. Initial sandboxed esbuild could not read ancestor directories; reran with required toolchain access. Initial parallel browser run exhausted the default per-test time; same assertions passed with one worker without weakening tests. React ref render lint finding corrected with an event-time blocker predicate. Screens removed from index only; local copies preserved. Sales still to implement.
Append-only, newest last.
- 2026-10-23 · agent · Read the source PDF (all 26 pages readable) and inspected the repository (empty apart from `.claude/`).
- 2026-10-23 · agent · Intake round 1 answered by the user. Created `sdlc/stockwise/WORKLOG.md`, `sdlc/genie/WORKLOG.md` and a minimal `AGENTS.md`.
- 2026-10-23 · agent · Stage 1 questions answered. Drafted `sdlc/stockwise/intent.md` (Status: draft).
- 2026-10-23 · Nnaemeka Chukwuma · Accepted intent.md. Agent set Status: accepted and started Design.
- 2026-10-23 · agent · Design questions answered. Drafted `sdlc/stockwise/spec.md` (draft) and created `stockwise/decisions.md` (PD1-PD12, DM1-DM4).
- 2026-10-23 · Nnaemeka Chukwuma · Accepted spec.md (open PD items stay in decisions.md).
- 2026-10-23 · agent · Read apps.qocent.com (/, /product, /pricing; no public docs at /docs, /help or /api) and the Render, Neon and Vercel free-tier pages. Wrote `deploy-plan.md`.
- 2026-10-23 · agent · Recorded PD1-PD6 resolutions as DM5-DM10 in `stockwise/decisions.md`. PD7 pending.
- 2026-10-23 · agent · Recorded PD7 = archive/unarchive (DM11). PD8 asked.
- 2026-10-23 · agent · Corrected attribution in `stockwise/decisions.md` (Decided by: Team 3 / Logged by: Nnaemeka Chukwuma for DM1-DM11) and added D14 to this log.
- 2026-10-23 · agent · Recorded PD8 = standard targets (DM12, decided by Victor Oyeleke, logged by Nnaemeka Chukwuma). PD9 asked.
- 2026-10-23 · agent · Recorded PD9 = Flyway + undo scripts (DM13, Team 3). PD10 asked.
- 2026-10-23 · agent · Recorded PD10 = UTC storage, Lagos 'today' (DM14, Team 3). PD11 asked.
- 2026-10-23 · agent · Recorded PD11 = 8-hour tokens (DM15, Team 3). PD12 asked.
- 2026-10-23 · agent · Recorded PD12 = small Monday seed with all awkward cases (DM16, decided by Nnaemeka Chukwuma). Applied DM5-DM16 to spec.md (R12 store credit, R14, R18, R19, N2, N7, N8, N12, permission matrix, data model, C1, C4, open questions).
- 2026-10-23 · agent · Recorded DM17-DM20. Moved `sdlc/stockwise/*` to `stockwise/sdlc/`, `sdlc/genie/*` to `genie/sdlc/` and `deploy-plan.md` to `stockwise/deploy-plan.md`. Fixed links. Older entries above use the old paths.
- 2026-10-23 · agent · Recorded DM21 (web tooling; re-asked at the user's request, unchanged). Wrote `sdlc/plan.md` (draft) and `AGENTS.md` for this repo. Rewrote the parent-folder `AGENTS.md` as a workspace pointer.
- 2026-10-23 · Nnaemeka Chukwuma · Accepted plan.md. Agent started the Test stage.
- 2026-10-23 · agent · Recorded DM22-DM25. Wrote `sdlc/test-plan.md` (draft). Filled in AGENTS.md "Verifying your work".
- 2026-10-23 · Nnaemeka Chukwuma · Accepted test-plan.md. Agent started the Deploy stage.
- 2026-10-23 · agent · Recorded DM26-DM30. Wrote `sdlc/release.md` (draft) and the repo `REVIEW.md`.
- 2026-10-23 · Nnaemeka Chukwuma · Accepted release.md and REVIEW.md. Agent started the Maintain stage.
- 2026-10-23 · agent · Recorded DM31 (monitoring postponed). Wrote `sdlc/monitoring.md` as a deferred placeholder.
- 2026-10-23 · agent · Annotated intent.md open questions answered later (DM5-DM8); intent's accepted content is unchanged. Wrote `sdlc/EXECUTION.md`. SDLC chain complete for Stockwise.
- 2026-10-24 · Codex (logging assistant for Victor Oyeleke) · Read every SDLC artifact, AGENTS.md, decisions.md, deploy-plan.md and REVIEW.md, plus the local eight-page shared-component proposal. Distinguished its proposals from Victor's instructions and recorded the unresolved shared agreement.
- 2026-10-24 · Victor Oyeleke · Accepted the phase 2 frontend publication plan and explicitly requested implementation. Confirmed resource-level API files, central endpoints/image exports, shared folder placement, token scope, stack changes, pending component foundation, empty HTTP-client file and Git bootstrap/publication workflow (DM32-DM36).
- 2026-10-24 · Codex · Confirmed the remote was empty; staged only the 12 existing planning documents, checked the staged diff and created `176fc3a` (`docs: establish Stockwise planning baseline`). Pushed `main` to `origin` successfully using configured Git credentials. No branch protections or CI setup claimed.
- 2026-10-24 · Codex · Created `chore/web-structure`, 27 empty `.gitkeep` placeholders and a zero-byte HTTP-client file. Added frontend architecture/design-token notes, appended DM32-DM36 and PD13-PD14, and aligned the frontend plan/spec/agent conventions and execution runbook. Static verification and branch publication are next; application checks remain unavailable.
- 2026-10-24 · Codex · Static verification passed before staging: exact folder/file set, all 28 starter files zero bytes, no unauthorized scaffolding, 29 local Markdown links/fragments resolving, continuous decision tables with unique IDs, historical decision rows and contract log unchanged, and no stale shared-agreement assertion or old API-client path in the current spec/plan. `git diff --check` exited 0. Runtime checks are unavailable because their scaffolds do not exist.
- 2026-10-24 · Codex · Created starter commit `45f49c6` (`chore(web): add frontend starter structure and conventions`), pushed `chore/web-structure`, and opened [PR #1](https://github.com/AMAZEEN12/Stockwise/pull/1) targeting `main`. The GitHub connector's PR creation returned 403 (integration permissions); creation succeeded through the Git credentials already used for the authorized pushes. No credentials were printed or written to project files. PR creation returned state `open`, base `main`, head `chore/web-structure`, merged `false`.
- 2026-10-24 · Codex · Verified remote branch heads after the starter push: `main` = `176fc3aa826a0299bacd5ea2139e1d39f90b5e0f`, `chore/web-structure` = `45f49c649b486e9809f50560cbfd2ba99f1ae7db`, matching local refs. A documentation-only follow-up on the same branch records this publication evidence; main and the review gate remain unchanged.

### Phase 2 verification output (2026-10-24)

Read-only inline Python assertions and `git diff --check` produced:

```text
PASS: exact starter tree; 27 empty .gitkeep files and a zero-byte HTTP client
PASS: no dependencies, configuration, generated schema, backend or workflow scaffold
PASS: 29 local Markdown links and fragments resolve
PASS: appended decision IDs are unique, tables continuous, historical decisions and contract log preserved
PASS: current spec/plan use the pending shared agreement and new HTTP-client location
git diff --check: exit 0
```

Service verify, contract lint, web lint/typecheck/unit/build, and Playwright: unavailable at this stage, not run. No package manifest, service wrapper or OpenAPI file exists. No rendered UI or business rule was changed.
- 2026-10-23 · agent · EXECUTION step 1 (local part): `git init -b main` in `stockwise/`, added `.gitignore`, committed the artifacts one commit per stage (first commit 4de3402). No remote, nothing pushed (user: "local only for now").
- 2026-10-23 · agent · EXECUTION step 2: drafted `contract/openapi.yaml` v0.1.0 (Monday paths), `redocly.yaml` (recommended rules plus a custom `money-is-integer-kobo` rule) and the contract README. Redocly lint: 0 errors, 0 warnings after fixing a missing 4xx on /health and an if/then conflict with additionalProperties (the CREDIT → customerId rule moved to the description, enforced by service and DB). Proved the money rule fails on a deliberate `priceKobo: number`. Prism mock failed on port 4010 (EACCES, Windows reserved range 3965-4064) and moved to 4710. Smoke test: health 200, login 201, products 401 without token and 200 with, sale 201, missing Idempotency-Key 422, float quantity 422, forced 409 returns the INSUFFICIENT_STOCK example. Logged as DRAFT in decisions.md §3, pending Isaac Bassey and Nnaemeka Chukwuma.
- 2026-10-23 · agent · Committed the contract draft (Stockwise 199f70b) and the Genie port note (Genie 491ea43).
- 2026-10-23 · agent · EXECUTION step 4: started Docker Desktop (it wasn't running). Wrote V1__users, V2__products, V3__customers_sales_ledger with named CHECK and UNIQUE constraints and the indexes for Q1-Q5, plus hand-written U1-U3. Added `service/pom.xml` (Boot 4.1.2), the Maven wrapper, `MigrationUndo`, `MigrationRollbackIT` (an undo script exists for every migration; up/down/up with exact schema snapshots at every step) and `SchemaRulesIT` (no float or numeric columns, *_kobo is bigint, R4 backstop, R5, R8, R9, R12, sale-line total, sale reference). `./mvnw clean verify`: 11 tests, 0 failures. Removal checks: 6 protections removed one at a time, each made its test fail (the first R12 attempt was invalid because of a dangling comma, then redone). Logged in `docs/rule-removal-log.md`. Found and fixed a harness issue (stale .bak in target/classes). Added `.gitattributes` (LF) and the executable bit on mvnw for Linux CI. Recorded the plan departures in plan.md.
- 2026-10-24 · agent · Committed step 4 (local 164ff63). Remote https://github.com/AMAZEEN12/Stockwise already existed: `main` is one commit by Victor (176fc3a, "planning baseline") holding the same artifacts as local 34f82a0 but with no shared history, plus `chore/web-structure` (PR 1) and an empty `emeka's-branch`. Replayed local commits (.gitignore, log, contract, step 4) onto `emeka's-branch` from `origin/main`. The resulting tree is identical to local `main`. Pushed (head 93882f3). Nothing force-pushed; `main` untouched.
- 2026-10-24 · agent · Opened PR 2 (`emeka's-branch` → `main`) through the GitHub API with the user's stored Git credential (Chukwuma-Elvis); `gh` isn't installed. No reviewer requested: Isaac isn't a collaborator (collaborators are Victor-430, AMAZEEN12, Chukwuma-Elvis), per the user.
- 2026-10-24 · agent · EXECUTION step 9, service part (Data and rules area only): `SaleService.record` runs one transaction: it claims the Idempotency-Key (`INSERT … ON CONFLICT DO NOTHING`), takes stock per line with `UPDATE … WHERE active AND quantity >= :q RETURNING price_kobo` in product-ID order, writes lines and movements, sets the total, and charges credit with a ledger entry. Added `spring-boot-starter-jdbc`. Tests: `SaleIT` (9), `SaleConcurrencyIT` (4: last unit ×10, no oversell, opposite line orders, parallel credit), `IdempotencyIT` (5), `SaleRequestHashTest` (3). Full build: 32 green. Loop: 20/20. Removal checks: guard only, guard plus CHECK (10 of 10 sold the last unit), ON CONFLICT, hash comparison, lock ordering, each failing as expected. Store-credit draw deferred to step 16; controller left to Isaac (plan.md departures).

### Home/authentication implementation and verification (2026-10-24)

Historical engineer-count wording in this section is superseded by DM53: Victor confirmed and approved four interface engineers on 2026-10-25.

- Victor supplied the five-engineer shared agreement, screenshots and tokens, requested a read-only review, then authorized implementation. Recorded DM37–DM40 with separate attribution for human scope, reported agreement and Codex implementation defaults/proposals.
- Created `feat/auth-ui` and merged origin/main (`18151aa`, merged PR #2) as `3497a5e`. Resolved only WORKLOG conflicts, preserving both histories. Backend and contract source remain unchanged from origin/main. PR #1 remains open; no main merge, remote push or deployment was performed.
- Delivered Home, sign-in/sign-up overlays and all supplied states, Data Mode, Tailwind v4 Vite integration, shared copy-in components, Stockwise tokens, self-hosted fonts, central runtime image exports, generated OpenAPI types, Axios-backed RTK Query and Formik/Yup. Auth routes are lazy-loaded; largest initial JS chunk is 480.46 kB (157.85 kB gzip), auth chunk 118.39 kB (39.37 kB gzip).
- Registration remains validated UI with an explicit pending adapter; its proposed contract and account-role questions are in `docs/auth-contract-proposal.md`. Demo buttons never invent a seed password. `/workspace` validates `/me` and shows a minimal authenticated welcome. Session lifetime/refresh/logout behavior is explicit in DM40 and implementation docs.
- Reviewed desktop/mobile captures against reference frames; adjusted wordmark placement, spacing, field-error icons, dialog sizing, close icon, typography and loading treatment. The SVG coin is reconstructed, so original-artwork equivalence is not claimed. Human visual-baseline approval is still pending. References are ignored inputs; browser captures are under ignored web/test-results.
- Initial browser failures were fixed in UI code without loosening tests. A later manual screenshot review caught lazy-route capture timing; added a readiness assertion and additional server-field/demo/responsive checks. No failed test was skipped or deleted.

Actual final output (Node v24.21.0, npm 11.19.0; Windows):

```text
npm run generate:api
openapi-typescript 7.13.0: ../contract/openapi.yaml -> src/api/schema.d.ts

npm run lint
eslint . --max-warnings 0
exit 0, no errors or warnings

npm run typecheck
tsc --noEmit
exit 0, no diagnostics

npm test -- --run
RUN v5.0.5
Test Files 3 passed (3)
Tests 6 passed (6)

npm run build
vite v7.3.7 building client environment for production...
328 modules transformed.
built in 8.56s
exit 0, no chunk-size warning

npm run lint:contract
../contract/openapi.yaml: validated in 165ms
Woohoo! Your API description is valid.
exit 0

npx playwright test --workers=2
Running 12 tests using 2 workers
12 passed (1.2m)
axe assertions: zero serious/critical violations in checked auth states
Captures: 1440x900 desktop and 360x880 mobile at 2x
Additional viewport checks: 320, 360, 768, 1024 and 1440px; no horizontal overflow

npm dependency audit after patched tooling installation
found 0 vulnerabilities

service/mvnw.cmd verify
The JAVA_HOME environment variable is not defined correctly,
this environment variable is needed to run this program.
exit 1; service verification unavailable on this machine
```

The first sandboxed Vitest/Vite attempt could not resolve config paths; rerunning with filesystem permission succeeded. Playwright emits a terminal NO_COLOR/FORCE_COLOR environment warning, unrelated to lint or UI correctness. Backend tests were attempted but could not start without Java; upstream test results are not represented as this session's passing checks. Browser API interception proves UI behavior and wire shapes, not a deployed backend. No database guard or migration changed, so no new rule-removal run applies.

### Tailwind guidance and working local mock (2026-10-24)

- Victor requested recording the three recurring utility suggestions and applying them. Added them under AGENTS.md Mistakes to avoid; replaced every matching class in Button, Input and FormField (DM41). Kept existing design-token values and checked the compiled rules and browser computed styles.
- Asked how sign-in should work and where D appeared. Victor chose the contract mock, then identified vite.config.ts as an example badge. Current Git lists all seven originally named files as tracked and present; web/vite.config.ts is unchanged (196 bytes), with no deletion status. Full history shows deletion in requested rollback 3632ae0 and recreation in ec0bf7f. The specific IDE panel was not supplied; do not claim that Git currently reports a deletion or reset files to clear a badge.
- Initial API probes found no listeners on 4710 or 8080 and no local environment override. Added pinned Prism 5.16.0 and yaml 2.9.1, an npm mock launcher, an ignored generated fixture copy and an ignored local .env.local. The active contract and backend remain unchanged. Session and /me examples now agree and have a future expiry. Public mock-only input: owner@stockwise.demo / stockwise-demo. These are not seeded backend credentials; all schema-valid mock logins return the fixed OWNER fixture. Assistant/Admin role simulation remains outside this fixture (DM42).
- Started the mock at http://127.0.0.1:4710 and left it running for Victor's selected local workflow. Added a repeatable check:mock script and verified it against the actual mock and existing dev server, without intercepting HTTP. It confirmed demo autofill, login, /me, refresh and logout, plus radius/font/focus styles. No existing test file was edited in this follow-up.
- Preserved independent user modifications in HomePage.tsx and app.css and untracked web/Screens. They are excluded from this follow-up commit. Browser checks used the current working tree, including those edits. No remote push, main merge, backend implementation or production deployment is part of this round.

Actual verification output:

```text
npm run lint: exit 0, zero errors/warnings
npm run typecheck: exit 0, no diagnostics
npm test -- --run: Test Files 3 passed (3); Tests 6 passed (6)
npx playwright test --workers=2: 12 passed (1.4m)
Compiled CSS: canonical radius rule references --radius-md; token is 10px;
              canonical font utility and configured focus offset emitted
npm run build: 328 modules transformed; built in 15.38s; exit 0
npm run lint:contract: authoritative API description valid; exit 0
redocly lint .mock/openapi.yaml: generated example copy valid; exit 0
npm run mock: Prism is listening on http://127.0.0.1:4710
HTTP smoke: POST /auth/sessions 201; GET /me 200; matching OWNER and future expiry
npm run check:mock:
PASS: actual Prism 201/200, future session, demo autofill, canonical styles,
      browser sign-in, refresh and sign-out.
npm audit --omit=dev: total vulnerabilities 0
Full development audit: 8 advisories (7 high, 1 moderate), via Prism/Postman dependencies;
                       compatible npm audit fix could not resolve them
```

The mock is development-only, binds 127.0.0.1, reads the trusted repository contract and is excluded from the browser build. No forced major dependency overrides or unverified downgrade was applied. The remaining advisory limitation is documented in the implementation notes. Service verification remains unavailable due to the previously observed JAVA_HOME setup; no backend files or business-rule guards changed.

### Persistent agent guidance clarification (2026-10-24)

- Victor reaffirmed that DM41 exists to prevent agents repeating the three class patterns on every future task. Strengthened root AGENTS.md with a startup reminder, exact replacement table, before-edit/before-completion guidance, and explicit Decided by Victor Oyeleke / Logged by Codex attribution. Recorded the clarification beneath DM41 instead of duplicating the decision.
- Confirmed Button, Input and FormField already use the proposed replacements; no old pattern remains in web/src. This follow-up changes documentation only and preserves the user's independent Home/CSS/Screens work.
- Verification: exact replacement/attribution checks and git diff --check; no application tests rerun for this documentation-only clarification. The code replacements were verified in the previous round.

### Requested publication and latest user changes (2026-10-24)

- Confirmed 2f15ec4 exists locally with the persistent agent instructions. Victor requested a PR, then explicitly instructed committing his recent changes before creating it. DM43 records that instruction and attribution.
- Reviewed and prepared the exact supplied HomePage.tsx and app.css edits, plus 16 PNG design inputs under web/Screens (9,194,092 bytes, PNG signatures and expected frame dimensions checked). The prior ignored Login-png folder is no longer present locally; documentation now points to the versioned Screens location. Runtime assets remain in src/assets/images.
- Retained the supplied copy removal, punctuation and coin-position changes without changing tests or silently restoring mobile copy. Noted the mobile supporting-copy consequence for human visual review.
- Fresh verification on the final source: ESLint exit 0 (zero warnings), strict typecheck exit 0, authoritative contract lint valid in 507ms, 3 unit files / 6 tests passed, Vite build succeeded in 14.19s (328 modules), Playwright 12 passed in 1.5m with the existing axe assertions, and git diff --check passed. The service/JAVA_HOME limitation and development-only Prism advisories remain as previously recorded; no backend or active contract changed.
- Next: commit these changes, push feat/auth-ui and create an open PR into main. No merge or deployment is authorized by this publication request.

### Publication completed (2026-10-24)

- Committed Victor's supplied changes and their decision/documentation updates as `e200ce0` (`feat(home): refine landing copy and coin placement with design references`), including all 16 PNG references. Pushed `feat/auth-ui` to origin successfully; no user changes were omitted.
- Created [PR #3](https://github.com/AMAZEEN12/Stockwise/pull/3), title `feat(auth): add responsive entry UI, contract mock and agent conventions`, base `main`, head `feat/auth-ui`. GitHub returned state `open`, draft `false`, merged `false`, initial head `e200ce0716484d9236f63e84387580bd765b31ac`.
- The description covers the final feature, latest supplied refinements, fresh verification, mobile-copy consequence, and existing API/mock/artwork/environment limits. No reviewers were impersonated, no merge/deployment performed, and no credentials were printed or written to project files. This documentation follow-up records the confirmed publication on the same branch.

### Shared-source documentation clarification, 2026-10-25

- DM53 records Victor's correction to four interface engineers and his approval of the Card and Select/Checkbox source notes. Updated current AGENTS, architecture, provenance, spec, plan and execution guidance; retained the original DM37 and historical logs with explicit correction notices.
- Added docs/shared-component-alignment.md with immutable source links at reviewed revision dbe1cac1f5e6e0838331e35b8da482ab4a1497fc. Card omits its image area when image is omitted; Select/Checkbox already read shared CSS variables and use the input-border token for their control edges. Their obsolete README warnings do not require additional utility mappings or a border repair. The actual older copy-in revision is preserved separately.
- Verification: git diff --check passed; documentation checks confirmed approval/logger attribution, relative link targets, unique DM53 and corrected current guidance. SHA-256 checks confirmed all four pre-existing application edits (ProductsPage.tsx and customers/sales/shop CSS) are byte-for-byte unchanged by this task. No application tests rerun for Markdown-only changes.
- Decided by: Victor Oyeleke. Approved by: Victor Oyeleke. Logged by: Codex. Component migration proposals remain pending; no runtime, API-contract or upstream repository change was made.
- 2026-10-25 · agent (for Nnaemeka Chukwuma) · Pre-Monday Data and rules work on `feat/monday-data`: product and customer repositories (`ProductRepositoryIT` 9, `CustomerRepositoryIT` 5), the generated Monday seed (3 demo logins with BCrypt hashes, 20 products, 5 customers, 33 sales over 7 Lagos days, repayments, and the DM5 reversal giving N6,000 store credit), `SeedVerificationIT` (11: counts, awkward cases, exact reconciliation, passwords, re-run safety, Flyway demo location, a sale on seeded stock). Shared `DatabaseTestSupport` (`TRUNCATE … RESTART IDENTITY`, after sale references leaked between tests). Evidence: `SaleConcurrencyIT` fails on `evidence/no-stock-guard` (10/10 sold the last unit) and passes on `feat/sale-transaction`. Logs saved. Recorded Nnaemeka's contract agreement in decisions.md §3.
