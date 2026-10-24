# Release: Stockwise, stock and customer credit for one small shop

Derived from: [plan.md](plan.md) (accepted 2026-10-23), [test-plan.md](test-plan.md) (accepted 2026-10-23), [deploy-plan.md](../deploy-plan.md) · Status: accepted (2026-10-23 by Nnaemeka Chukwuma)
Release manager: Isaac Bassey (backup Blessing Nwafor, DM26) · Change-management reference: not required. Every production change is a merged PR plus a `deploy.yml` run approved in the GitHub `production` environment.
Decisions in force: [decisions.md](../decisions.md) DM9 (both stacks), DM13 (undo scripts), DM23 (test guard), DM26-DM30
Supporting skills: none

## Governing rule
The agent may act up to the production gate and cannot pass it. AI tools are used only on engineers' machines (DM29). Nothing AI-driven runs in CI or holds deploy credentials.

## Approval gates
Each gate is a deterministic pre-action check (allow, ask or block). A block explains the reason and the route to approval.

| Gate | Trigger (action or path) | Decision | Approver | Where enforced |
|------|--------------------------|----------|----------|------|
| Merge to `main` | any PR | **block** until CI is green, plus one code-owner approval that is not the author's (DM30) | code owner of the changed area | GitHub branch protection + CODEOWNERS |
| High-risk code | PR touching `service/**/sale/**`, `**/reversal/**`, `**/customer/*StoreCredit*`, `db/migration/**`, `db/rollback/**` | **block** without Isaac Bassey's approval | Isaac Bassey | CODEOWNERS (Isaac listed alongside the area owner) |
| Contract change | PR touching `contract/openapi.yaml` | **block** unless `decisions.md` §3 gains a dated line naming two engineers | Isaac Bassey + one other engineer | CI check `contract-log` + CODEOWNERS |
| Test edits during a fix | `fix/*` branch or `bug` label changing test files after the failing-test commit | **block** | n/a (fix the code) | CI job `test-guard` (DM23) |
| Frozen migration | modifying an existing `V<n>__*.sql` | **block** | n/a (write `V<n+1>`) | CI check comparing against `main` + Flyway checksum validation |
| Missing undo script | new `V<n>__*.sql` without `db/rollback/U<n>__*.sql` | **block** | n/a | CI check + `MigrationRollbackIT` |
| Production deploy | `deploy.yml` job `deploy-production` | **ask**: pauses until a required reviewer approves | Isaac Bassey (backup Blessing Nwafor), never the author of the change being shipped | GitHub `production` environment protection rule |
| Production database migration | `deploy.yml` job `migrate` (Neon `main`) | runs only after the production approval, inside the same protected environment | as above | GitHub environment secrets (`DATABASE_URL_DIRECT` only in `production`) |
| Secrets | any commit | **block** if gitleaks finds a secret | n/a | CI |
| Deploy branches | push to `deploy/*` | **block** except the Actions bot | Blessing Nwafor (admin) | branch protection |
| Evidence branch | PR from `evidence/no-stock-guard` into `main` | **block** | n/a (never merged) | branch rule + REVIEW.md |

## Environments and autonomy
| Environment | What may happen there | Human gate |
|-------------|-----------------------|------------|
| Local (engineer machine, AI tools allowed) | anything; Docker Postgres; the AI may edit code and run tests | none (AI output is reviewed before commit and logged in `docs/ai-log.md`) |
| CI (GitHub Actions) | build, test, Testcontainers, contract lint, evidence runs | none; a red step blocks everything downstream |
| Staging (from day 6, DM27) | each PR deploys to the Vercel preview, the Render `stockwise-api-staging` service and the Neon `staging` branch; rollback rehearsals | none to deploy; findings are reviewed in the PR |
| Production: Stack V (official, DM9) and Stack Q (parallel) | deploys only from `main` via `deploy.yml` | Isaac Bassey (or Blessing Nwafor) approves each run |

## Pipeline
- **CI/CD platform:** GitHub Actions. Workflows: `ci.yml` (every push and PR), `deploy.yml` (on `main`), `concurrency-evidence.yml` (manual).
- **`deploy.yml` stages:** gate (same as `ci.yml`), then **production approval**, then `flyway migrate` on Neon `main` (direct URL), then deploy Stack V (Vercel CLI prebuilt deploy plus Render deploy hook) and Stack Q (subtree push to `deploy/stockwise-web` and `deploy/stockwise-api`) in parallel, then smoke (`/`, `/api/v1/health`, web root) and the post-deploy contract check, then `last-unit.mjs` (checkpoint runs only).
- **Agent steps:** not applicable (DM29). No AI runs in the pipeline. Triage of failed builds is done by the delivery owner (Blessing Nwafor).
- **Credentials:** deploy secrets live only in the GitHub `production` (and, later, `staging`) environments, so they are available only to approved jobs. Vercel, Render and Qocent tokens are scoped to the Stockwise projects. Nobody keeps production database credentials on a laptop. Local work uses Docker Postgres.
- **Qocent balance:** before each checkpoint demo, Blessing checks that Qocent has credit, and the README notes it. If the balance is zero, Stack Q pauses and Stack V remains the official address (PD5a open).

## Release checklist (per production deploy)
1. PR merged with green CI and the required approvals.
2. `deploy.yml` waiting at "production". The release manager checks the diff summary and the migration list, then approves.
3. Migrations applied. Check the job log shows the expected `V<n>`.
4. Both stacks deployed, and smoke and contract checks green.
5. Clean-browser check of the Monday journey on the official address (checkpoint releases only).
6. Record the deploy in `docs/releases.md`: date, commit, approver, migrations, anything notable.

## Rollback
One command per tier, plus the database. The release manager decides; the delivery owner executes.

| What | Command or action |
|----|----|
| Interface (Vercel) | `vercel rollback <previous-deployment-url> --token $VERCEL_TOKEN` (or Promote the previous deployment in the dashboard) |
| Service (Render) | Dashboard → `stockwise-api` → Deploys → previous deploy → **Rollback** |
| Stack Q (Qocent) | Dashboard → project → Releases → previous release → **Roll back** ("goes live again, no rebuild") |
| Database | `cd service && ./mvnw -Pundo -Dundo.target=<n-1> exec:java` runs the `db/rollback/U<n>__*.sql` scripts down to the target in one transaction (DM13). Run it **before** rolling back the service if the new code needs the new schema, and **after** if the old code can't run on the new schema. Decide using the migration's notes. |
| Then | Revert the offending commit on `main` so the next deploy doesn't re-ship it. Log it in `docs/releases.md`. |

- Last rehearsed: **not yet**. The first rehearsal is planned for Sat 24 Oct 2026 on the production walking skeleton (DM28).
- Rehearsal cadence: Sat 24 Oct (production skeleton), about day 9 (staging), about day 13 (staging, before final). Record each one here with the date, what was rolled back, and the minutes taken.

| Date | Environment | What was rolled back | Time taken | By |
|----|----|----|----|----|
| | | | | |

## Open questions
- [ ] PD5a: who funds the Qocent credits. Until settled, Stack Q is not the official address. (owners: Isaac Bassey, Goodnews) · UNRESOLVED
- [ ] Do Render deploy hooks and rollback work on the free plan (deploy-plan §4)? Verify during the plan step 3 skeleton deploy. (owner: Blessing Nwafor) · UNRESOLVED
- [ ] The exact undo-runner command (`-Pundo` profile) is a plan-level design. Confirm when it is scaffolded. (owner: Nnaemeka Chukwuma) · UNRESOLVED

## Measurement
- Leading: time to first review; time waiting at the production approval; share of pipeline failures triaged within one hour.
- Lagging: defects reaching production; gate violations reaching production; deploy frequency, lead time, change failure rate and time to restore over the 14 days (from `docs/releases.md`).
