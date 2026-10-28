# Rollback rehearsal (Stockwise)

`sdlc/release.md` requires rehearsals on Sat 24 Oct (production skeleton), about day 9 (staging) and about day 13 (staging, before final), each recorded in `docs/releases.md` with the date, what was rolled back and the minutes taken. As of the repo snapshot of 28 Oct, `docs/releases.md` has **no rows**, so no rehearsal is on record. If you did one, record it now with its real date. If you did not, do the first one now and say so honestly in the table.

Rehearse on **staging** (Neon `staging` branch, Render `stockwise-api-staging`, Vercel preview) so production is never touched. If staging does not exist yet, creating it is the first task: check Neon's branch limit on its pricing page first.

## Steps (time yourself)
1. Note the current deployed commit (`GET <api>/api/v1/health` shows the version) and the Vercel deployment URL.
2. Deploy a deliberately different commit (a trivial visible change on a staging branch).
3. **Web rollback:** Vercel dashboard, Deployments, the previous deployment, Promote to Production (or `vercel rollback <previous-deployment-url> --token $env:VERCEL_TOKEN`). Check the old UI is back.
4. **Service rollback:** Render dashboard, `stockwise-api-staging`, Events or Deploys, choose the previous deploy, Rollback. Wait for `/health`, confirm the version matches step 1.
5. **Database rollback:** the undo scripts are in `service/src/main/resources/db/rollback/` (U1-U4). Run the one matching the last migration against the staging branch with `psql`, then re-run the migrate step. Note: the exact runner command is still marked UNRESOLVED in `release.md`. Write down what you actually used.
6. Run `scripts/smoke.sh` (`API_URL`, `WEB_URL`, optional `LOGIN_EMAIL`/`LOGIN_PASSWORD`) and record the result.
7. Stop the clock. Add the row below and to `docs/releases.md`.

## Record
| Date | Environment | What was rolled back | Minutes taken | What went wrong or was unclear | By |
|---|---|---|---|---|---|
| | | | | | |