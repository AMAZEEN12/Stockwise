# Deploy setup (one-time, about an hour)

Do these in order. Nothing here is committed to the repository; secrets live only in GitHub and the hosts.

## 1. GitHub
1. **Branch protection** on `main`: require a PR, one approval that is not the author's, and the status checks `Guards`, `Secret scan`, `Contract lint`, `Service`, `Web`.
2. **Branch protection** on `deploy/*`: allow pushes from GitHub Actions only.
3. **CODEOWNERS** (`.github/CODEOWNERS`, needs real GitHub handles): the high-risk paths from `sdlc/release.md` (`service/src/main/java/**/sale/**`, `**/reversal/**`, `service/src/main/resources/db/**`, `contract/openapi.yaml`) list the area owner **and** the team lead.
4. **Environment `production`** (Settings → Environments): required reviewers = release manager and backup. Store these **environment secrets** there:

| Secret | Value |
|----|----|
| `DATABASE_JDBC_URL_DIRECT` | Neon **direct** endpoint as a JDBC URL: `jdbc:postgresql://<host>.neon.tech/<db>?sslmode=require` (no `-pooler` in the host) |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Neon role |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | from Vercel (`vercel link` creates `.vercel/project.json`) |
| `RENDER_DEPLOY_HOOK_STOCKWISE` | Render service → Settings → Deploy Hook (URL already contains `?key=…`) |
| `DEMO_OWNER_PASSWORD` | `Stockwise-Demo-2026` (only for the last-unit run) |

5. **Repository variables** (not secret): `API_URL` (e.g. `https://stockwise-api.onrender.com`), `WEB_URL`, `SEED_DEMO` (`true` for the demo database), `DEMO_OWNER_EMAIL` (`owner@stockwise.test`), `ENABLE_QOCENT` (`true` only after the Qocent spike passes).

## 2. Neon
One project `stockwise`, branch `main`. Copy **two** connection strings: pooled (host contains `-pooler`) for the service, direct for GitHub's migration step.

## 3. Render (service)
New Web Service → this repo → **Runtime: Docker**, root directory `service`, Dockerfile path `./Dockerfile`, **Auto-Deploy: off**, health check path `/`. Environment:

| Variable | Value |
|----|----|
| `DATABASE_JDBC_URL` | Neon **pooled** JDBC URL |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Neon role |
| `CORS_ALLOWED_ORIGINS` | the Vercel address, e.g. `https://stockwise.vercel.app` (no trailing slash) |
| `JWT_SECRET` | long random string, at least 32 bytes (`openssl rand -base64 48`). **Required:** the service refuses to start without it |
| `SPRING_PROFILES_ACTIVE` | `prod` (already the image default) |

Check that deploy hooks and rollback exist on the free plan (open question in `release.md`) and record the answer.

## 4. Vercel (interface)
Create project `stockwise-web` with root directory `web`. Set `VITE_API_BASE_URL` = `https://<render-address>/api/v1` for Production. `web/vercel.json` already turns Git deployments off, so only the workflow deploys.

## 5. First run
1. Merge to `main`; `deploy.yml` waits at **production**. The release manager approves.
2. The job migrates Neon, deploys Vercel and Render, then `smoke` checks `/`, `/api/v1/health` (reporting the commit) and the web root.
3. Add a row to `docs/releases.md`.
4. Rehearse rollback once and record it in `sdlc/release.md` (Vercel `vercel rollback`, Render dashboard Rollback, database `./mvnw -Pundo -Dundo.target=<n-1> exec:java`).

## 6. Qocent spike (optional second stack)
Follow `deploy-plan.md` §3 and record the answers in `decisions.md`. If questions 1 to 4 fail, stay on Stack V.
