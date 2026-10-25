# Monday demo runbook (delivery part)

## What must be true before anyone opens the demo
These are the blockers. Items 1 and 2 are built on `feat/backend-api` (PR #12) and were checked locally on 2026-10-25: `last-unit.mjs` passed 3 rounds against the service image, and `scripts/smoke.sh` gave `SMOKE OK`. They count only once merged and deployed.

| # | Needed | Owner | Check |
|----|----|----|----|
| 1 | Sign-in (`POST /auth/sessions`) and `/me` working on the service | API and access | `curl -s -X POST $API/api/v1/auth/sessions -H 'Content-Type: application/json' -d '{"email":"owner@stockwise.test","password":"Stockwise-Demo-2026"}'` returns 201 with `accessToken` |
| 2 | `/products` (GET, POST), `/customers`, `/sales` (POST, GET) controllers and security config permitting `/`, `/api/v1/health`, and CORS | API and access | `node load/concurrency/last-unit.mjs` passes |
| 3 | PR #12 (`feat/backend-api`) merged to `main` (PRs #7 and #8 are already merged) | reviewers: Isaac Bassey, Blessing Nwafor | CI green on `main` |
| 4 | Production approval given, `deploy.yml` green | release manager | `docs/releases.md` has today's row |
| 5 | `SEED_DEMO=true` was set for the migrate step, so the demo accounts exist | delivery | sign-in works |

If 1 or 2 are not ready by Sunday night, demo the web against the simulation (`cd web && npm run mock`) and say so out loud. Do not present the simulation as the live service.

## Sunday evening
1. `scripts/smoke.sh` against the live addresses: all PASS.
2. Run `last-unit.mjs` (10 devices, 3 rounds): all PASS. Save the output for the slide.
3. Reset the demo data (`scripts/reset-demo.sql`, then re-run the migrate job with `SEED_DEMO=true`) so Monday starts clean. Rehearse this once before relying on it.
4. Note the Qocent balance if Stack Q is on.

## 15 minutes before
1. Open the service address (`/api/v1/health`) to wake Render. Wait for `"status":"UP"` (up to about a minute). Time it: that is the cold-start figure.
2. Open the web address in a **clean browser profile** and sign in as the owner.
3. Have a second device or window signed in as the assistant.

## The journey (about 5 minutes)
1. **Sign in** as owner. Home shows the shop.
2. **Products**: search, filter by low stock, point out one sold-out and one archived product.
3. **New sale**: add two products, confirm. The receipt shows the sale reference and ₦ total.
4. **The last unit** (the key rule): pick a product with 1 unit left. On two devices put it in a sale and confirm at the same moment. One succeeds; the other is told clearly there is no stock. Backup if timing is awkward: run `node load/concurrency/last-unit.mjs` live: 1 × 201, 9 × 409, stock 0.
5. **Evidence slide**: `docs/evidence/concurrency/` shows the same test failing without the guard (`no-stock-guard-FAILS.log`) and passing with it.

## If something breaks
| Symptom | Do |
|----|----|
| Service slow on first call | Normal cold start. Say so, wait |
| Smoke fails after a deploy | Roll back (release.md): `vercel rollback <url>`, Render dashboard → Rollback, then tell the team lead |
| Data messy after rehearsal | Reset demo data (step 3 above) |
| Qocent paused (zero credit) | Stay on the Stack V address |
