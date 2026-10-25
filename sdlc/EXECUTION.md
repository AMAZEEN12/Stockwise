# Execution: Stockwise, stock and customer credit for one small shop

The runbook for taking Stockwise from its current state (planning baseline published; frontend folders and documentation prepared; no runnable application yet) to the Monday 26 Oct MVP, the final submission on Tue 3 Nov 2026, and into maintenance. Any human or agent can follow it. It is generated from the artifacts below, so update it whenever one of them changes. Progress against these steps, and all decisions and conventions, are tracked in [WORKLOG.md](WORKLOG.md). Log each completed step there. Product decisions are in [decisions.md](../decisions.md) (DM1-DM36).

Change slug: `stockwise` · Last updated: 2026-10-24 · Current stage: Build preparation, frontend phase 2 (no application implementation)

## Current frontend handoff

**2026-10-24 update, engineer count corrected 2026-10-25:** Victor authorized implementation after review. Home/authentication is being implemented on `feat/auth-ui`, integrating merged PR #2. DM37 resolves the shared agreement; DM53 corrects the count to four engineers, confirmed and approved by Victor. DM38–DM40 record implementation choices. See [approved source clarifications](../docs/shared-component-alignment.md) for Card and Select/Checkbox behavior. The phase 2 paragraph below is historical. See [implementation](../docs/auth-ui-implementation.md), [registration proposal](../docs/auth-contract-proposal.md) and WORKLOG for actual checks. Backend auth/seeds and contract sign-off remain pending; no deployment or main merge is performed.

Victor Oyeleke accepted the phase 2 folder/documentation plan (DM32-DM36). [Frontend architecture](../docs/frontend-architecture.md) is the folder map and naming reference. `main` contains the initial planning baseline `176fc3a`; the starter was statically verified, committed as `45f49c6` and pushed on `chore/web-structure`. [PR #1](https://github.com/AMAZEEN12/Stockwise/pull/1) targets `main` and remains open for human review; no merge or deployment was performed. The only source file is an empty HTTP-client placeholder. Package setup, routes, screens, generated types and dependencies await later authorization and inputs. The shared-component agreement is pending (PD13); phase 3 behavior questions are PD14. Do not treat the proposed Friday/Saturday schedule below as evidence those tasks are done.

## Artifact chain
| Stage | Artifact | Status | Owner | Approved by / date |
|-------|----------|--------|-------|--------------------|
| Plan | [intent.md](intent.md) | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-23 |
| Design | [spec.md](spec.md) | accepted (revised with DM5-DM16) | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-23 |
| Build | [plan.md](plan.md) | accepted | Nnaemeka Chukwuma; high-risk sign-off Isaac Bassey | Nnaemeka Chukwuma, 2026-10-23 |
| Build | [AGENTS.md](../AGENTS.md) (repo) | draft (commands planned, not yet verified) | first engineer to scaffold each part | n/a |
| Test | [test-plan.md](test-plan.md) | accepted | Blessing Nwafor (test suite) | Nnaemeka Chukwuma, 2026-10-23 |
| Deploy | [REVIEW.md](../REVIEW.md) (repo) | accepted | Isaac Bassey | Nnaemeka Chukwuma, 2026-10-23 |
| Deploy | [release.md](release.md) + [deploy-plan.md](../deploy-plan.md) | accepted / draft | Isaac Bassey (release manager), Blessing Nwafor | Nnaemeka Chukwuma, 2026-10-23 |
| Maintain | [monitoring.md](monitoring.md) | **deferred** (DM31) | Team 3 | n/a |

## Supporting skills
| Skill | Location | Version / date | Stages it shaped |
|-------|----------|----------------|------------------|
| none | n/a | n/a | n/a |

Candidate skills to write (conventions that came up in the interview and that tools or newcomers may break):
- **Money in kobo:** integer kobo end to end, ₦ formatting only in `web/src/lib/money.ts`. Owner: Nnaemeka Chukwuma. Also needs a hard guardrail: **yes**, via `NoFloatSchemaIT` and a lint rule banning `double`/`float`/`BigDecimal` in `service/src/main/**/sale|customer|reversal`.
- **Guards in SQL:** rules as CHECK constraints or conditional `UPDATE … WHERE`, never read-check-write in Java. Owner: Nnaemeka Chukwuma. Hard guardrail: yes, via the review pass plus the rule-removal log.
- **Decision logging:** every decision records "Decided by" and "Logged by" separately, and pending ones live in `decisions.md`. Owner: Nnaemeka Chukwuma (logger). Hard guardrail: no.
- **Contract-change sign-off:** a dated line naming two engineers in `decisions.md` §3. Owner: Isaac Bassey. Hard guardrail: yes, via the `contract-log` CI check.

## Setup before automation starts
- [x] Public GitHub repository `AMAZEEN12/Stockwise` exists; existing planning documents published on `main` as `176fc3a` on 2026-10-24 (Victor's authorized one-time bootstrap, executed by Codex). This does not complete protections, CODEOWNERS or environments below.
- [ ] Branch protection on `main`: PR required, CI green, one code-owner approval, author can't approve (DM30). (Blessing)
- [ ] `CODEOWNERS` with the area owners, plus Isaac on sale, reversal, store-credit and migration paths (REVIEW.md). (Isaac)
- [ ] GitHub `production` environment: required reviewers Isaac Bassey and Blessing Nwafor (DM26); deploy secrets stored only there (release.md). (Blessing)
- [ ] Branch rules: `deploy/*` writable only by the Actions bot; `evidence/no-stock-guard` can never be merged. (Blessing)
- [ ] CI jobs `test-guard` (DM23), `contract-log`, frozen-migration and undo-script checks, gitleaks. (Blessing)
- [ ] JaCoCo 80% gate on rule packages (DM22). (Blessing + Nnaemeka)
- [ ] Neon project `stockwise` (branches `main`; `staging` from day 6). Vercel project; Render service (Docker, auto-deploy off); Qocent projects `stockwise-web` and `stockwise-api` tracking `deploy/*` (deploy-plan). (Blessing)
- [ ] README "Free tier terms checked" table copied from deploy-plan §1, with dates. (Blessing)
- [ ] Rollback rehearsed on the production walking skeleton, Sat 24 Oct (DM28). (Blessing; Isaac decides)
- [ ] `evals/` skeleton (DM25), from day 6. (Team 3)

## Steps
Each step: actor · input → action → output · gate before the next step.

**Friday 23 Oct (original planned schedule)**
1. **Repository and protections** · human (Blessing) · plan.md, release.md → create the repo, push, apply the setup checklist items for branch protection, CODEOWNERS and environments → live repo · Gate: a test PR is blocked without review.
2. **Contract v0.1 (Monday paths) + mock** · human (Isaac + Nnaemeka; AI allowed locally) · spec.md "Interfaces" → `contract/openapi.yaml`, Prism mock, first line in `decisions.md` §3 → validated contract · Gate: `redocly lint` passes, and two engineers are named in the change log.
3. **Walking skeleton on both stacks + Qocent spike** · human (Blessing) · deploy-plan.md → Spring Boot app answering `/` and `/api/v1/health`, Dockerfile, `ci.yml`, `deploy.yml` → two live addresses per stack · Gate: smoke green; PD5b spike answers recorded in decisions.md; Isaac approves the first production deploy.
4. **Migrations V1-V3 with undo scripts** · human (Nnaemeka) · spec.md data model → `db/migration`, `db/rollback`, `MigrationRollbackIT` · Gate: `./mvnw verify` green; Isaac approves (high-risk path).
5. **Frontend preparation, then runnable scaffold** · human (Victor) · phase 2 first: folders, documentation and empty HTTP client on `chore/web-structure`, static checks and reviewed PR. Later: approved contract and shared-component agreement → separately authorized runnable foundation, routes, shared components and generated types · Gate for runnable scaffold: lint, typecheck and tests green. Phase 2 does not satisfy this runtime gate.
6. **Journey run against the deployed skeleton** · humans (all) · deployed addresses → record any divergences from the contract in decisions.md · Gate: divergences logged (the brief's day-4 check).

**Saturday 24 Oct**
7. **Auth and roles** · human (Isaac) · spec R15, DM3, DM15 → JWT login, role checks, `AuthorizationIT` · Gate: CI green; test seen failing with the check removed (logged).
8. **Products: create, list, filter** · human (Isaac + Nnaemeka) · spec R1, R2 → endpoints and `ProductIT` · Gate: CI plus review.
9. **Sale transaction: guard, idempotency, credit** · human (Nnaemeka) · spec R3-R5, R8, plan "Data flow" → `SaleService`, `SaleConcurrencyIT`, `IdempotencyIT`, `NoFloatSchemaIT` · Gate: CI green with each concurrency test looped 20 times locally; **Isaac Bassey approves** (riskiest step).
10. **Monday-journey screens** · human (Victor) · contract → login, add product, new sale (paid and credit), customer picker, five states · Gate: Playwright journey green against the mock.
11. **Rollback rehearsal #1** · human (Blessing) · release.md → roll back the skeleton on Vercel and Render, run an undo script → time recorded in release.md · Gate: entry in the rehearsal table.

**Sunday 25 Oct**
12. **Failing-test evidence** · human (Nnaemeka) · test-plan "Test design notes" → `evidence/no-stock-guard` branch, run `concurrency-evidence.yml` → artifact logs (pass on `main`, fail on the branch) · Gate: both logs saved; the branch diff is one guard line plus one constraint.
13. **Deployed concurrency run** · human (Blessing) · `load/concurrency/last-unit.mjs` → result `201 x1, 409 x9` · Gate: output saved for slide 4.
14. **Monday seed and README** · human (Nnaemeka + Blessing) · DM16, R19, R20 → seed subset, demo credentials, simulated-feature labels · Gate: `SeedVerificationIT` (subset) green; clean-browser checklist passes.
15. **Full Monday journey on the deployed site** · humans (all) · intent S7 → run from a clean browser on Stack V (official) and Stack Q · Gate: Isaac approves the checkpoint release.

**Monday 26 Oct**
16. **Rehearse and present** · humans (all) · brief slide list → 10-slide deck (slide 4 uses steps 12-13; slide 5 uses decisions.md §3) · Gate: supervisor (Goodnews) review.

**After Monday (days 6-14; detail in plan.md steps 15-22)**
17. Staging environment (DM27) → 18. Restock, repayments, ledger → 19. Reversals and store credit (Isaac approves) → 20. History and dashboard → 21. Optimistic archive and slow-network behaviour → 22. Complete contract and post-deploy contract check → 23. Full seed → 24. Rollback rehearsal #2 (about day 9) → 25. Load test, LCP and INP, screen reader → 26. Visual baselines (DM24), evals (DM25) → 27. Five ADRs, data-model doc, AI log, friction notes, walkthrough → 28. Rollback rehearsal #3 (about day 13) → 29. **Final submission, Tue 3 Nov** · Gate: every test-plan "Final" done-target met or its miss declared in the README.

## Commands
Planned; verify and update AGENTS.md when scaffolded.
```
build:    cd service && ./mvnw verify                      # unit + Testcontainers + contract + JaCoCo
          cd web && npm ci && npm run build
test:     cd service && ./mvnw verify
          cd web && npm test -- --run && npx playwright test
lint:     npx @redocly/cli lint contract/openapi.yaml
          cd web && npm run lint && npm run typecheck
mock:     npx @stoplight/prism-cli mock contract/openapi.yaml
deploy:   merge to main → deploy.yml                       # production requires Isaac Bassey (backup Blessing Nwafor)
evidence: gh workflow run concurrency-evidence.yml
deployed concurrency: node load/concurrency/last-unit.mjs --base $SERVICE_URL --n 10
rollback: vercel rollback <prev-url> --token $VERCEL_TOKEN ; Render dashboard → Rollback ; Qocent dashboard → Roll back ;
          cd service && ./mvnw -Pundo -Dundo.target=<n-1> exec:java   # command to be confirmed
```

## Parallel work
- **At the same time** (separate branches, different files): steps 2 (contract), 3 (pipeline and skeleton), 4 (migrations) and 5 (web scaffold) on Friday. On Saturday, step 10 (screens against the mock) runs alongside steps 7-9.
- **In order:** contract (2) → controllers (7, 8, 9) · migrations (4) → repositories and the sale service (9) · auth (7) → role-protected tests · sale service (9) → evidence (12) and deployed run (13) · repayments (18) → reversals and store credit (19).
- **Inside `service/`:** Isaac owns `config/`, `auth/` and controllers. Nnaemeka owns `db/`, repositories and the sale, customer and reversal services. Agree signatures in the PR description first.

## Human decision points
| Decision | Approver | Evidence they review |
|----------|----------|----------------------|
| Each production deploy | Isaac Bassey (backup Blessing Nwafor), never the change's author | green CI, diff summary, migration list |
| High-risk merges (sale, reversal, store credit, migrations) | Isaac Bassey | the PR, concurrency and idempotency test output, rule-removal log entry |
| Contract changes | Isaac Bassey + one other engineer | `openapi.yaml` diff, decisions.md §3 line |
| Every other merge | code owner of the area | PR plus REVIEW.md passes |
| Rollback | Isaac Bassey decides; Blessing executes | smoke failure or defect report |
| Visual baselines | Victor Oyeleke | Playwright screenshots |
| Monday checkpoint assessment | Goodnews (supervisor) | live demo, slides |
| Is store credit the right design problem? | Goodnews | intent.md, DM5, ADR-003 |
| Qocent funding | Isaac Bassey + Goodnews | deploy-plan §1, credit cost from the spike |

## Automation roadmap
| Trigger | Starts | Automated now? |
|---------|--------|----------------|
| intent.md accepted | spec pass | no (manual, this session) |
| spec.md accepted | planning | no (manual) |
| Push or PR | `ci.yml` gate | yes, once step 1-3 setup is done |
| PR opened (from day 6) | staging deploy | planned (DM27) |
| Merge to `main` | `deploy.yml`, pausing for production approval | yes, once step 3 is done; the approval stays manual |
| Manual dispatch | concurrency evidence | manual by design |
| Monitoring band breached | new intent.md | **no**: monitoring deferred (DM31) |
| AGENTS.md change | eval re-run | manual (DM25) |
| AI agent in CI | n/a | **no, by decision** (DM29) |

## Measurement
| Stage | Leading indicator | Lagging indicator |
|-------|-------------------|-------------------|
| Plan | time to an accepted intent.md (same day) | edits to intent.md after spec.md |
| Design | time from intent to spec commit | spec.md commits after plan.md |
| Build | share of PRs merged at the first review | rework cycles; diff drift from plan.md |
| Test | first-pass CI success rate | regressions caught in CI versus at checkpoints |
| Deploy | time waiting at the production approval | change failure rate; time to restore (from `docs/releases.md`) |
| Maintain | n/a (deferred) | n/a (deferred) |

## Unresolved questions
| Question | From artifact | Owner | Needed by step |
|----------|---------------|-------|----------------|
| Is "reversing a partly repaid credit sale" (store credit) the intended design problem? | intent.md, spec.md C4 | Goodnews | 19 (and slide 2) |
| Weekend availability 24-25 Oct for each engineer | intent.md, spec.md | Goodnews | 7 |
| PD5a: who funds the Qocent credits | release.md, decisions.md | Isaac Bassey + Goodnews | 3 (before Stack Q is the official address) |
| PD5b: Qocent spike results (Java 25, port, health check, cold start, cost) | deploy-plan.md | Blessing Nwafor | 3 |
| PD5c: one Render workspace per product, or shared | deploy-plan.md, spec C3 | Blessing Nwafor | 3 |
| Do Render deploy hooks and rollback work on the free plan? | release.md | Blessing Nwafor | 3 |
| Is a Spring Boot 4-compatible contract validator available? (fallback: Schemathesis) | test-plan.md | Isaac Bassey | 22 |
| Will the k6 load test stay within Render and Neon free-tier terms? | test-plan.md, spec C8 | Blessing Nwafor | 25 |
| The exact undo-runner command | release.md | Nnaemeka Chukwuma | 4 |
| When to resume monitoring, and who owns it | monitoring.md, DM31 | Team 3 | after 29 |
