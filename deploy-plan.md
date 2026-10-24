# Deployment plan: Stockwise + Genie (Team 3)

Status: draft (resolves PD5 once accepted) · Owner: Blessing Nwafor (Delivery and evidence) · Prepared 2026-10-23
Feeds: `sdlc/release.md` (Stage 5). Lives in the Stockwise repository (DM19, DM20); Genie keeps its own adapted copy in its own repository. Covers both hosting stacks the team wants:
- **Stack Q:** Qocent Deploy (`apps.qocent.com`) for the interface and the service, with Neon Postgres.
- **Stack V:** Vercel (interface), Render (service) and Neon (Postgres).

Both products (Stockwise in `stockwise/`, Genie in `genie/`) use the same pattern. Only the paths, secrets and project names differ.

## 1. What was checked, and when
The brief requires reading each provider's own pages and recording what was found with the date. Copy this table into each product's README.

| Provider | Page read (2026-10-23) | What it says | What it doesn't say (still to verify) |
|----|----|----|----|
| Qocent Deploy | apps.qocent.com `/`, `/product`, `/pricing` | Connect a repository through the GitHub App, or upload a zip. **Every push to the tracked branch builds a numbered release.** Roll back to any earlier release with no rebuild. Builds can be cancelled. Secrets are encrypted at rest, with an audit of who revealed which key. A health check on `/` must return 200 before a release goes live. The project type is detected once and can be overridden at creation, after which it is permanent. The home page lists "Web services… Node.js, Python, Go, or Java, including … Spring Boot". **Pricing: prepaid credits, nothing renews. At zero balance live projects pause, deploys are refused and pushes are dropped.** No database service. | **No public docs** (`/docs`, `/help` and `/api` return 404). Not stated: Java version (we need 25), Maven detection (the product page's detection list names Node, Python and Go but not `pom.xml`), port binding, whether the health-check path can be configured, monorepo root directory, memory, cold starts (the home page says "function backends"), free credits, regions, custom domains, deploy API. |
| Render | render.com/docs/free | A free web service spins down after **15 min** idle and takes **about 1 min** to spin up. **750 free instance hours per workspace per month**, and all free services are suspended when they run out. Ephemeral filesystem. Render may restart the service at any time. Free Postgres **expires after 30 days** (plus a 14-day grace period) and allows one per workspace. | RAM and CPU for free instances. Docker on free (see `/docs/docker`). Deploy hooks. |
| Neon | neon.com/pricing | Free plan is permanent with no card. 100 projects per organisation, **1 GB storage per project** (writes are blocked above that), **100 CU-hours per project per month** (compute is suspended until the next period when exceeded), scale to zero after 5 min (can't be turned off), 10 branches per project, connection pooling included. | Whether inactive projects are paused. |
| Vercel | vercel.com/pricing | Hobby is "for personal, non-commercial use", with 1 developer seat, 100 GB/month data transfer, unlimited deployments, and hard usage caps. | Whether a GitHub **organisation** repository can deploy on Hobby. CLI and Actions specifics (limits documentation). |

**Conclusions:**
- **Don't use Render Postgres.** It expires after 30 days, which falls inside our window if it's created early. Use Neon for the database in both stacks.
- **Render's 750 hours are per workspace.** Two always-awake services would use 1,488 h in a 31-day month, which is over the limit. Because services sleep when idle, two products on one workspace are probably fine, but don't run a keep-alive pinger on both. Safer still: **one Render workspace per product**.
- **Qocent is not free.** The brief says "Cost: Nil", so prepaid credits are only acceptable if the programme or company supplies them. If the balance reaches zero, the live demo pauses, so the balance is a release gate (see §5).

## 2. Common foundation (both stacks)
- **Repository:** one public GitHub monorepo at this folder (`stockwise/`, `genie/`, `sdlc/`). Workflows are filtered by path (`stockwise/**`, `genie/**`).
- **Database:** one Neon project per product (`stockwise`, `genie`), each with a `main` branch for production and a `staging` branch. Secrets: `DATABASE_URL` uses the **pooled** endpoint for the app, and `DATABASE_URL_DIRECT` uses the direct endpoint for Flyway migrations, because the transaction pooler breaks session-level migration locks.
- **Gate:** GitHub Actions always runs lint → type-check → unit tests → integration tests (Testcontainers Postgres) → OpenAPI lint → contract tests (against the mock or a local service) **before** anything is deployed. A red step stops the workflow, so nothing deploys. This meets the brief's rule that "a failure blocks the deploy".
- **Migrations:** a `migrate` job runs `./mvnw -pl service flyway:migrate` against `DATABASE_URL_DIRECT` after the gate and before the service deploys. The rollback approach is PD9.
- **After the deploy:** a `smoke` job calls `GET <service>/api/v1/health` and loads `<web>/`. A post-deploy contract test runs against the deployed service. If it fails, the workflow goes red and the person on deploy duty rolls back (§6).
- **The service is packaged twice** from the same code: as a runnable jar (`./mvnw package`) for Qocent if it builds Java natively, and as a container (`stockwise/service/Dockerfile`, multi-stage, `eclipse-temurin:25-jdk` to build and `eclipse-temurin:25-jre` to run, `-XX:MaxRAMPercentage=75`) for Render and as Qocent's fallback if it accepts Docker.
- **Health:** the service answers **200 on `/`** (a small JSON `{"service":"stockwise","status":"ok"}`) as well as `/api/v1/health`, because Qocent's health check hits `/`. The port comes from `server.port=${PORT:8080}`.
- **Interface config:** `VITE_API_BASE_URL` is set per environment at build time. The service's CORS allow-list is read from `CORS_ALLOWED_ORIGINS` and lists the deployed web address(es) only.

## 3. Stack Q: Qocent Deploy + Neon

### How Qocent's "push to a branch" is driven from Actions
Qocent builds whatever is pushed to the branch it tracks. To keep GitHub Actions as the gate, Qocent never tracks `main`. It tracks **deploy branches that only the workflow pushes to**, and only after the gate is green:

| Qocent project | Tracked branch | Branch contents | Detected type |
|----|----|----|----|
| `stockwise-web` | `deploy/stockwise-web` | the `stockwise/web/` subtree at its root | Static site (`index.html`, `vite.config.ts`) |
| `stockwise-api` | `deploy/stockwise-api` | the `stockwise/service/` subtree at its root | Java / Spring Boot web service (**verify**) |
| `genie-web`, `genie-api` | `deploy/genie-web`, `deploy/genie-api` | same pattern | same |

Workflow step after the gate and migration: `git subtree split --prefix stockwise/service -b tmp && git push --force origin tmp:deploy/stockwise-api` (and the same for `web`). Pushing a **subtree** puts the app at the branch root, so this works even if Qocent has no "root directory" setting (one of the unknowns). Branch protection on `deploy/*` allows pushes from the Actions bot only.

### Secrets (Qocent project settings)
`stockwise-api`: `DATABASE_URL` (Neon pooled), `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `SPRING_PROFILES_ACTIVE=prod`. `stockwise-web`: `VITE_API_BASE_URL`. GitHub Actions needs a deploy key or token able to push `deploy/*`, plus `DATABASE_URL_DIRECT` for migrations.

### Day-1 verification spike (before relying on Qocent)
Deploy a "hello" Spring Boot 4 / Java 25 app and a Vite page through the deploy-branch flow, and record the answers in `stockwise/decisions.md`:
1. Is a `pom.xml` project detected as Java? Which Java version does it run? Can 25 be selected? If not, does it accept a Dockerfile?
2. Which port or environment variable must the app bind?
3. Is the health check fixed at `/`? What timeout does it use? (The JVM starts slowly.)
4. "Function backends": does the service stay warm, or does each request risk a cold start? Measure the first request after 15 min idle.
5. Memory and CPU limits. Do Hikari connection pools survive between requests?
6. Credit cost of one build and of a day live. Who funds the balance? Is there a low-balance alert?
7. Custom or default domain format, and HTTPS.

**Exit criteria:** if questions 1-4 can't be answered "yes, workable" by the end of day 1 (or by Saturday 24 Oct at the latest), **Stack V is the production stack for Monday** and Qocent stays as a later option.

### Rollback
In the Qocent dashboard, roll back the project to the previous release. The page says it "goes live again, no rebuild". Then revert the offending commit on `main` so the next deploy doesn't re-ship it.

## 4. Stack V: Vercel + Render + Neon

| Tier | Host | How it deploys from Actions |
|----|----|----|
| Interface | Vercel Hobby, project `stockwise-web` | Git integration **off** for production (`"git": {"deploymentEnabled": false}` in `vercel.json`). After the gate, the workflow runs `vercel pull --yes --environment=production`, then `vercel build --prod`, then `vercel deploy --prebuilt --prod` with `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. |
| Service | Render free web service `stockwise-api`, **Docker** runtime, `stockwise/service/Dockerfile`, auto-deploy **off** | After the gate and migration, the workflow calls the service's **deploy hook** (`RENDER_DEPLOY_HOOK_STOCKWISE` secret, a POST to the hook URL), then polls `/api/v1/health` until the new version reports itself or 5 minutes pass. Verify that deploy hooks exist on free; if not, use the Render API with `RENDER_API_KEY`. |
| Database | Neon (§2) | Migrations run from Actions. |

**Cold start:** Render's free service sleeps after 15 min and takes about a minute to wake, plus JVM start-up. The interface shows a "Service is waking up…" state after 3 s instead of a bare spinner (spec R17), and the team opens the service URL about 2 minutes before any demo. Cold-start time is reported separately in the load-test write-up.

**Vercel Hobby caveat:** it's for non-commercial use (a capstone qualifies) with one developer seat. Deploy from the CLI with one team member's token, stored as a repository secret. If organisation repositories are blocked on Hobby, deploying from the CLI avoids that, because the build happens in Actions.

**Rollback:** on Vercel, `vercel rollback <previous-deployment-url> --token …` (or "Promote" in the dashboard). On Render, use "Rollback" to the previous deploy in the dashboard, or set the deploy hook to the previous image. Database rollback per PD9.

## 5. Which stack serves which address
The brief requires **two live addresses per product** (interface + service). Recommended:
- **Monday 26 Oct (MVP): Stack V is the default** because each of its steps is documented. Switch to Stack Q only if the day-1 spike passes **and** credits are funded.
- **Running both stacks at once** is possible (the same gate fans out to both deploy jobs), but it doubles migrations, CORS origins and secrets. If both run, they share one Neon database, migrations run once, and the README names **one** address per tier as the official one.
- **Release gate for Stack Q:** a workflow step checks that the credit balance is above a threshold (if Qocent exposes it; otherwise the team checks it manually before each demo).

## 6. Environments and autonomy
| Environment | Database | Who deploys | Gate |
|----|----|----|----|
| Local | Docker Compose Postgres 17 | anyone | none |
| CI | Testcontainers Postgres | Actions | the full gate |
| Staging (optional after Monday) | Neon `staging` branch + preview deploys | Actions on PRs | the gate |
| Production | Neon `main` | Actions on merge to `main` only | gate + migration + smoke test; the team lead (Isaac Bassey) approves through the GitHub `production` environment's required reviewers |

## 7. Secrets inventory (never committed)
| Secret | Where |
|----|----|
| `DATABASE_URL`, `DATABASE_URL_DIRECT` | GitHub Actions `production` environment, plus Qocent or Render service env |
| `JWT_SECRET` | Qocent or Render service env |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | GitHub Actions |
| `RENDER_DEPLOY_HOOK_*` or `RENDER_API_KEY` | GitHub Actions |
| Qocent deploy-branch push credential | GitHub Actions (deploy key) |
CI runs a secret scan (e.g. gitleaks), and a finding fails the build.

## 8. Open items
- PD5a: is Qocent usage funded? By whom, and with how many credits? (owner: Isaac Bassey with Goodnews)
- PD5b: day-1 spike results for Qocent questions 1-7 (owner: Blessing Nwafor)
- PD5c: one Render workspace per product, or shared (owner: Blessing Nwafor)
- PD9: migration rollback approach
