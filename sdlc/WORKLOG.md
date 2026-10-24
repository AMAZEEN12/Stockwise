# Work log: Stockwise (Team 3 main product)

Change slug: `stockwise` · Started: 2026-10-23 · Last updated: 2026-10-24 by Codex (logging assistant for Victor Oyeleke)
Source document: `Tesa cohort 6 software engineering capstone project.pdf` (TeSA Africa, "Four Real-World Products", 26 pages; Stockwise is product 3, pages 10-11; shared requirements pages 23-26)

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Stage:** Build preparation, frontend phase 2 delivered for review. The original SDLC artifact chain is accepted; no runnable application exists.
- **Step:** Existing planning documents published to `main` in baseline commit `176fc3a` on 2026-10-24. Frontend starter committed as `45f49c6`, pushed on `chore/web-structure`, and published as [PR #1](https://github.com/AMAZEEN12/Stockwise/pull/1) into `main` under Victor's approved plan (DM32-DM36).
- **In progress:** no application implementation. PR #1 is open and unmerged for human review. Folders and documentation only, plus one empty `web/src/service/http-client.ts`; no application code, dependencies or configuration.
- **Next action:** implement the login feature on `feat/login`, using the OpenAPI PR #2 head and the finalized shared-component copy-in source. Each feature continues on its own branch with descriptive commits.
- **Waiting on:** API approval for a registration endpoint; sign-up remains a validated pending UI flow until then. Branch protections, CODEOWNERS and CI remain the delivery owners' work; they are not claimed complete.

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
- **Code and docs style:** frontend folder map and conventions are in `docs/frontend-architecture.md` (DM32-DM36). One API file per resource, central endpoints, Axios HTTP client, Formik/Yup, Redux Toolkit/RTK Query and React Router Data Mode. Copy finalized shared primitives into `components/ui/` and use Stockwise tokens as the single styling source. Shadcn is not required. Use separate feature branches and descriptive commits. Backend conventions remain unchanged.
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
| Q16 | 2026-10-24 | Frontend phase 2 | Components and tokens? | `components/ui/` plus `shared/` utilities; app-wide foundational tokens, login-specific hero/coin/wordmark; finalized shared components are copied in, and Stockwise tokens are authoritative; shadcn not required | answered |
| Q17 | 2026-10-24 | Frontend phase 2 | Attribution? | Decided by Victor Oyeleke; Codex as logging assistant; no implied cross-team approval | answered |
| Q18 | 2026-10-24 | Frontend phase 2 | Publish from an empty remote? | One-time docs baseline on main, then separate `chore/web-structure` commit/push and PR; never force-push or merge automatically | answered |

## Activity log
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

## Phase 3 frontend alignment (2026-10-24)

- Login implementation uses the existing OpenAPI PR #2 contract (`POST /auth/sessions`, `GET /me`) and does not invent a registration endpoint.
- Sign-up is currently a validated UI flow with an explicit pending adapter until the API owner approves a registration contract.
- The finalized four-engineer shared component set is a copy-in source; Stockwise does not depend on that repository at runtime.
- Stockwise supplied design tokens are the single source of truth for every feature and override neutral shared token values.
- The local `web/Stockwise — Login-png/` design-reference folder is ignored and is not a runtime asset.
- Decided by: Victor Oyeleke. Logged by: Codex.
