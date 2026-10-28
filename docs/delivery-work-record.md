# Delivery and evidence: work record (Blessing Nwafor)

Area owner for Delivery and evidence on both products (DM8). The rubric's "Your own contribution" (15 marks) is judged on this area, "visible in the commit history and your work record". This is the work record.

Prepared 2026-10-28 from the Stockwise and Genie repository snapshots (git history and `sdlc/WORKLOG.md`), from Blessing's own statements, and from the results she pasted. Anything git cannot show is marked **CONFIRM**: only Blessing can settle it, and it must not be filled in from guesswork.

## 1. Identity in the history
Blessing commits and merges as the GitHub account **@AMAZEEN12**, which owns both repositories (confirmed by Blessing, 2026-10-28).

Pull requests merged by Blessing (author of each is someone else; merging is a delivery action, not authorship):
- **Stockwise:** #2 (24 Oct); #5, #7, #8, #9, #11, #12, #13, #14, #15, #16, #17 (25 Oct); #18 (26 Oct); #24, #26 (27 Oct); plus two "merge main into branch" merges on 25 Oct.
- **Genie:** #4, #7, #9, #10 (26 Oct); #11, #12 (27 Oct).

## 2. Work committed on your behalf
Blessing states that she wrote `ci.yml` and `deploy.yml` herself and sent them to Nnaemeka, who committed them, because she had no electricity at the time. That is why git shows Nnaemeka (or his agent) as author, in both repos.

Git cannot show this, and the worklogs currently credit "the agent for Nnaemeka" for the CI and deploy work (Stockwise PR #13; Genie worklog 2026-10-25). To make the claim defensible:
1. **Keep the originals:** the files and messages you sent (WhatsApp, email, drive link) with their timestamps.
2. **Written confirmation from Nnaemeka:** one dated line in `sdlc/WORKLOG.md` and `decisions.md` in each repo: "ci.yml and deploy.yml were written by Blessing Nwafor and committed by Nnaemeka Chukwuma on her behalf".
3. **Separate your parts from later changes.** `deploy.yml` changed after you sent it: the smoke checks were moved into the approved job and a check that the web calls `<API_URL>/api/v1` was added (Stockwise PR #18, branch `fix/deploy-web-api-base`); you added `npm ci` (`3c5a622`). Your original: **CONFIRM** which lines are yours.
4. **Be ready to explain every line** of both files in the defence (10 marks).

Files you wrote, to be ticked by you: `ci.yml` **CONFIRM**, `deploy.yml` **CONFIRM**, `concurrency-evidence.yml` **CONFIRM**, `.github/scripts/check-*.sh` **CONFIRM**, `scripts/smoke.sh` **CONFIRM**, `service/Dockerfile` **CONFIRM**.

## 3. Setup you did (dashboards leave no commits)
Blessing set up GitHub, Neon, Render and Vercel (her statement, 2026-10-28). The dates below are the latest the evidence allows; read the exact creation date from each provider's page and replace them.

| Item | Done | Evidence and latest possible date | Exact date (from dashboard) |
|---|---|---|---|
| GitHub repo `AMAZEEN12/Stockwise` | Yes (owner) | First commit 2026-10-24 (`176fc3a`, pushed to an empty remote) | **CONFIRM** |
| GitHub repo `AMAZEEN12/Genie` | Yes (owner) | First commit 2026-10-23 17:30 | **CONFIRM** |
| Collaborators | Yes | Stockwise worklog 2026-10-24: collaborators were Victor-430, AMAZEEN12, Chukwuma-Elvis (Nnaemeka); Isaac was not one. Blessing has since added Isaac Bassey (GitHub: I-AB), stated 2026-10-28 | **CONFIRM** the date, and that he accepted the invitation (an unaccepted invitation does not make him a code owner) |
| Stockwise hosting: Neon, Render (`stockwise-yc54`), Vercel (`stockwise-smoky`) | Yes | Handover at 21:48 (WAT) on 25 Oct said "nothing is deployed yet"; you committed the live addresses at 23:23 (WAT) the same evening | **CONFIRM** |
| Genie hosting: Neon, Render (`genie-t2s5`), Vercel (`genie-sigma-two`) | Yes | Live and green on 2026-10-27: service UP at `14a4cb9`, CI and Deploy green at 16:05 (worklog); your Genie `deploy.yml` fix 2026-10-26 05:14 | **CONFIRM** |
| Genie secrets and `production` environment | Yes (Deploy ran and was approved) | A green Deploy run cannot happen without them (worklog 2026-10-27) | **CONFIRM** reviewers set |
| Stockwise secrets and `production` environment | **CONFIRM** | On 25 Oct the secrets were empty and no reviewer was set. The live site exists later, so something changed; the worklog does not say what | **CONFIRM** |
| Branch protection on `main` (both repos) | **CONFIRM** | Not visible in git. Check Settings, Branches | **CONFIRM** |
| Vercel `VITE_API_BASE_URL` fixed (it lacked `/api/v1`) | **CONFIRM** | Worklog: fixed about 22:50 UTC on 25 Oct "by someone with Vercel access"; your PR #18 merged at 00:25 (WAT) on 26 Oct, so this was probably you | **CONFIRM** |
| Neon `staging` branch (DM27) | No evidence | Not recorded anywhere | **CONFIRM** |

### Account decision (PD5c)
Fact: one GitHub account (@AMAZEEN12) owns both repositories. Hosting accounts (one per provider for both products, or separate) and whether any free-project limit affected you: **CONFIRM and write it here**.

## 4. Requirements for the area and where each stands (2026-10-28)

### Stockwise (main product)
| # | Requirement | State | Who did it | Your part |
|---|---|---|---|---|
| 1 | Repository and CI (guards, secret scan, contract lint, service, web) | Done: `ci.yml`, `.github/scripts/` | Committed by Nnaemeka | `ci.yml` written by you (per Blessing, section 2) |
| 2 | Deploy workflow with approval gate and migrations in the pipeline | Written; a run on GitHub is not recorded in the worklog | Committed by Nnaemeka; later change by his agent (PR #18) | Written by you (per Blessing); `npm ci` fix `3c5a622`; merged PR #18 |
| 3 | GitHub settings: protection, `production` environment, secrets | Not visible in git | You | Section 3 |
| 4 | Hosting and both tiers live | Live: stockwise-smoky.vercel.app, stockwise-yc54.onrender.com | You | Created the projects; committed the addresses (`8ecbe0d`) |
| 5 | `.github/CODEOWNERS` | **Missing** from the repo | | File prepared (real handles filled in; Isaac's still needed) |
| 6 | Test suite on real Postgres (95 tests per worklog) | Done | Nnaemeka (agent), Isaac | Run `./mvnw verify` yourself and record the count: **CONFIRM** |
| 7 | CI concurrency evidence | Workflow exists; the two log files are **not in the repo** (`.gitignore` has `*.log`) | Nnaemeka | To do: run the workflow, download artifacts, commit with `git add -f` |
| 8 | Deployed last-unit run | Script exists; never run on the live service | Nnaemeka | To do: `load/run-load-tests.ps1` |
| 9 | Load test with saturation point | k6 scripts exist; never run; README figures all TBD | Nnaemeka | To do: same script, then `docs/load-test-report.md` |
| 10 | Seed at full volume (120 products, 60 days, 14 customers, one reversal) | Monday subset only (20 products, 5 customers, 33 sales, 7 days) | Nnaemeka | Not started; agree with Nnaemeka first (it touches `SeedVerificationIT`) |
| 11 | Structured logs with request ID | Done (`RequestLogIT`) | Isaac | Review |
| 12 | `docs/releases.md` rows; three rollback rehearsals | **Empty**; no rehearsal on record | | To do: `docs/rollback-rehearsal.md` |
| 13 | Staging environment (DM27) | No evidence | | **CONFIRM** or build |
| 14 | README performance figures | All **TBD** | | Fill after the load run |
| 15 | PD5b, PD5c | Open | | Section 5 |
| 16 | AI-log entry; friction note | None by you in the repo | | Sections 6 and 7 |

Also not in your area, but visible: the `dashboard`, `restock`, `reversal` and `history` packages are empty placeholders, so those required features are unbuilt. Raise with Nnaemeka and Isaac.

### Genie (side project, same area)
| # | Requirement | State | Your part |
|---|---|---|---|
| G1 | Two live addresses, CI and deploy gates | Done and green on 2026-10-27 16:05 (worklog); PR #12 merged 23:59 | Hosting setup, `deploy.yml` fix `fb1542c`, merges of PRs #4, #7, #9, #10, #11, #12 |
| G2 | Rule-removal evidence for every rule test | **Done 2026-10-28 ~01:18**: all ten removals reported "FAILS AS EXPECTED" | **You ran it.** Run folder `C:\Users\NWAFOR BLESSING\rule-removal-logs\20261028-011835`; log in `docs/rule-removal-log.md` (paste the output blocks from `entries.md`) |
| G3 | Deployed concurrency check | Script and workflow prepared (`load/concurrency/assign-race.mjs`, `deployed-concurrency.yml`); not yet run on the live service | To do |
| G4 | README live URLs, simulated labels, evidence map | Prepared (`README.addendum.md`); not yet pasted | To do |
| G5 | Two decision records, AI log | Drafted (DR-1, DR-2, `ai-log.md`); need confirmation by Victor and Nnaemeka | To do |
| G6 | Release log, rollback commands | Prepared (`docs/releases.md`) | Record the deploys |

These Genie files were prepared with an AI assistant (see section 8) and must be committed by you in your own commits.

## 5. Open decisions assigned to you
- **PD5a/PD5b (Qocent):** Qocent is prepaid, not free, and PD5a (who funds the credits) is unresolved. Stack V (Vercel + Render + Neon) is the official stack (DM9) and is live. **Proposed resolution, for you to accept or change:** close PD5b as "not pursued: Stack V is official, Qocent unfunded", with a dated line in `decisions.md`. Reversal observation: the programme supplies Qocent credits.
- **PD5c (free-project limits, one account or several):** write what you found when you created the projects (section 3). **CONFIRM.**

## 6. Friction note (one per engineer; required deliverable)
Only you know what cost you time, so write it yourself. These are facts from the repository you may use **only if they match your experience**:
- *Cost candidate:* the live Stockwise web was built with `VITE_API_BASE_URL` missing `/api/v1`, so every sign-in showed "wrong email or password" (worklog, 25 Oct). How long did it take you to find, and what would have prevented it?
- *Saved candidate:* the OpenAPI contract and mock server let the interface work before the service existed; or a health endpoint that reports the deployed commit made deploys checkable. Which one actually saved you time, and by how much?

Final text (write in your own words): Cost: ______  Saved: ______

## 7. AI log entry (add to `docs/ai-log.md` in both repos)
Drafted from the real session on 2026-10-28; edit to match what you actually did.

```
## 2026-10-28: Delivery review of Genie and Stockwise, evidence tooling

- Engineer and decision maker: Blessing Nwafor (Delivery and evidence). Assistant: Claude, in a chat session; no AI runs in CI.
- Request: read both repositories and the brief; list what the Delivery owner still had to do; generate the missing evidence files (rule-removal log and runner, deployed concurrency script, load-test runner and report, rollback rehearsal, CODEOWNERS, README block, work record).
- Human decisions: Blessing ran the rule-removal runner on a scratch branch (all ten removals reported as failing), chose which files to adopt, and corrected the assistant on her identity and on who wrote the workflows.
- Checked-and-found-wrong:
  1. The assistant gave `./mvnw ... -Dit.test=AuthorizationIT` for PowerShell. Blessing ran it and Maven failed with "Unknown lifecycle phase .test=AuthorizationIT" because PowerShell splits the option at the dot. Fix: quote every -D option; the runner script now does.
  2. The assistant said that changing only `SecurityConfig` would make `AuthorizationIT` fail. Reading the code again showed `RequestController.assignTechnician` has a second role check, so the removal would still pass. The runner removes both layers; the ten runs then failed as expected.
  3. The assistant said Blessing had no commits in Genie. Blessing pointed out that she is @AMAZEEN12; git shows 7 Genie commits and 19 in Stockwise under that account.
- Verification: the runner output on Blessing's machine (summary of ten FAILS AS EXPECTED), the run folder, and the repository history.
```

## 8. What is left, in order
1. Fill every **CONFIRM** above (dashboard dates, branch protection, which files you wrote, friction note).
2. Genie: run `assign-race.mjs` on the live service; paste the output blocks into `docs/rule-removal-log.md`; get DR-1 and DR-2 confirmed; paste the README block.
3. Stockwise: `load/run-load-tests.ps1` against the live service; commit the concurrency evidence logs; CODEOWNERS; first rollback rehearsal.
4. Get Nnaemeka's one-line authorship confirmation (section 2).
5. Then the full seed volume, agreed with Nnaemeka first.