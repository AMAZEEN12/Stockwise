# Work log: Stockwise (Team 3 main product)

Change slug: `stockwise` · Started: 2026-10-23 · Last updated: 2026-10-23 by the agent
Source document: `Tesa cohort 6 software engineering capstone project.pdf` (TeSA Africa, "Four Real-World Products", 26 pages; Stockwise is product 3, pages 10-11; shared requirements pages 23-26)

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
- **Stage:** Done (SDLC artifact chain complete). Implementation not started.
- **Step:** EXECUTION.md written; chain finished on 2026-10-23.
- **In progress:** nothing.
- **Next action:** Follow `EXECUTION.md` "Steps", starting at step 1 (create the public GitHub repo and protections, owner Blessing Nwafor). Log each completed step here. When the repo exists, offer to commit the artifacts one commit per stage. Genie's chain (`genie/sdlc/`, separate repo) is next for the SDLC process.
- **Waiting on:** GitHub repository creation. The local git repo exists (`main`, one commit per stage); there is no remote yet. The user chose "local only for now" because the GitHub CLI isn't installed. To finish EXECUTION step 1: create the public repo on github.com, `git remote add origin <url>`, push `main` (with the user's go-ahead), then set branch protection, CODEOWNERS and the `production` environment.

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
| AGENTS.md (repo) | draft (commands planned, not yet verified) | | 2026-10-23 |
| test-plan.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| REVIEW.md (repo) | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| release.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| monitoring.md | deferred (DM31) | Team 3 | 2026-10-23 |
| EXECUTION.md | written (runbook) | Nnaemeka Chukwuma | 2026-10-23 |

## Conventions and guidelines
- **Stack and versions:** service: Java 25, Spring Boot 4, Flyway, JUnit + Testcontainers, PostgreSQL (DM1). Hosting: Vercel + Render + Neon, terms to verify (DM2). Auth: email+password, bcrypt, JWT bearer (DM3). Interface constraints from the brief: React interface with React Router (or equivalent) and Tailwind or plain CSS, typed models (no `any`); own HTTP service; free managed Postgres; GitHub Actions deploys both tiers; free tiers only.
- **Naming:** change slugs `stockwise` and `genie`. Two repositories (DM19): this one is `stockwise/` (code, `sdlc/`, `AGENTS.md`, `decisions.md`, `deploy-plan.md`). Genie is a separate repository. Artifacts are independent (DM20).
- **Code and docs style:** to be agreed at Build.
- **Source of truth:** the repository. The Markdown artifacts are authoritative; the TeSA PDF brief is the originating record.
- **Policies in force:** TeSA brief sections "Shared technical requirements", "Shared rules for fairness", "Delivery and cost" and the assessment rubric (PDF pages 3, 23-26). No other organisational policy supplied.
- **Supporting skills:** none.
- **Approvers:** product owner: Nnaemeka Chukwuma (acting). Team lead and technical sign-off: Isaac Bassey. Area owners: Nnaemeka (Data and rules), Isaac (API and access), Blessing Nwafor (Delivery and evidence). Supervisor: Goodnews (reviews at checkpoints).
- **User preferences for this workflow:** structured multiple-choice questions with a recommended default, asked one decision at a time, with plain explanations and concrete examples. For every decision, also ask who to record as the decision maker (options: Team 3, a named engineer, the supervisor). Record "Decided by" and "Logged by" separately. Nnaemeka Chukwuma is the logger.

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
- 2026-10-23 · agent · EXECUTION step 1 (local part): `git init -b main` in `stockwise/`, added `.gitignore`, committed the artifacts one commit per stage (first commit 4de3402). No remote, nothing pushed (user: "local only for now").
