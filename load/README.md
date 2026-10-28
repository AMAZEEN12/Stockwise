# Load and concurrency tests (N7, R4)

| File | What it proves | Needs |
|----|----|----|
| `concurrency/last-unit.mjs` | One unit in stock, N devices sell it together: exactly one 201, N-1 409, final quantity 0. Run against the **deployed** service. | Node 20+, an OWNER login |
| `concurrency/cold-start.mjs` | Time to the first response after the service has slept (needs 20+ minutes idle). Reported separately from p95 (DM12). | Node 20+ |
| `k6/sales.js` | `POST /sales` ramp with every sale on one product (worst case); stops at the first p95 breach | [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) |
| `k6/sales-spread.js` | The same ramp with sales spread across 20 products | k6 |
| `k6/sales-spread-steady.js` | 3 tills, steady for 2 minutes after a warm-up: the fairest sales figure | k6 |
| `k6/dashboard.js` | Read paths (product and sales lists; swap in `GET /dashboard` when it exists), p95 target 800 ms | k6 |
| `k6/catalogue.js` | `GET /products` with search and filters, 500 ms yardstick | k6 |

## Run on GitHub (no installs)
- **Actions → Load test → Run workflow** runs last-unit, dashboard, catalogue and the three sales tests against the live service, then uploads the results as the `load-results` artifact. It writes demo data, so it waits for the `production` approval.
- **Actions → Cold start → Run workflow** leaves the service idle (20 minutes by default) and then times the first response. Do not touch the site, the API or any other workflow meanwhile.

## Run by hand
```bash
export API_URL=https://<your-service>/api/v1
export OWNER_PASSWORD='<demo owner password>'

# 1. Wake the service first (Render free sleeps after 15 min idle).
time curl -s "${API_URL}/health"

# 2. Last unit (about a minute)
node load/concurrency/last-unit.mjs

# 3. Load. Use a warm service and say so in the README.
k6 run -e API_URL=$API_URL -e OWNER_PASSWORD=$OWNER_PASSWORD load/k6/sales-spread-steady.js
k6 run -e API_URL=$API_URL -e OWNER_PASSWORD=$OWNER_PASSWORD load/k6/sales.js
k6 run -e API_URL=$API_URL -e OWNER_PASSWORD=$OWNER_PASSWORD load/k6/dashboard.js
```

## Reading the k6 result
- Copy `http_req_duration` med, p(95), p(99) into the README table (N7).
- The ramp scripts stop themselves when p95 breaks the target (`abortOnFail`). The final p95 is therefore always just over the target, and the number of virtual users at the stop is the saturation point.
- `level=error` lines such as "thresholds … were crossed; stopping test prematurely" are k6 announcing that stop. `[DIAGNOSTIC] status=0` lines were logged at the same second as the stop, so they are requests cut off by it, not service errors.
- `POST /sales` creates real sales and test products. Run it against the **demo/staging** database, then reset (`scripts/reset-demo.sql`, then run the Deploy workflow with `SEED_DEMO=true`). Never against a real shop.
- Free-tier limits (Render 0.1 CPU, Neon compute hours) cap the figures. Report them as measured, with the date.

## Status (2026-10-28)
All scripts have run against the deployed service (9 valid runs; see `docs/evidence/load-2026-10-28/`). `cold-start.mjs` has run once and was not valid, because the service had not gone to sleep, so there is no cold-start figure yet. `dashboard.js` tests the product and sales lists because `GET /dashboard` is not in the contract yet.