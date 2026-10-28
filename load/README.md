# Load and concurrency tests (N7, R4)

| File | What it proves | Needs |
|----|----|----|
| `concurrency/last-unit.mjs` | One unit in stock, N devices sell it together: exactly one 201, N-1 409, final quantity 0. Run against the **deployed** service. | Node 20+, a login that may create products and sell (OWNER) |
| `k6/sales.js` | `POST /sales` p95 stays at or under 500 ms (DM12); finds the saturation point | [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) |
| `k6/dashboard.js` | Read paths (product and sales lists; swap in `GET /dashboard` when it exists), p95 at or under 800 ms warm (DM12) | k6 |

## Run

```bash
export API_URL=https://<your-service>/api/v1
export OWNER_PASSWORD='Stockwise-Demo-2026'          # demo owner, owner@stockwise.test

# 1. Wake the service first (Render free sleeps after 15 min). Time this: it is the cold-start figure for the README.
time curl -s "${API_URL%/api/v1}/api/v1/health"

# 2. Last unit (about a minute)
node load/concurrency/last-unit.mjs                  # DEVICES=10 ROUNDS=3 by default

# 3. Load (about 3 minutes each). Use a warm service and say so in the README.
k6 run -e API_URL=$API_URL -e OWNER_PASSWORD=$OWNER_PASSWORD load/k6/sales.js
k6 run -e API_URL=$API_URL -e OWNER_PASSWORD=$OWNER_PASSWORD load/k6/dashboard.js
```

## Reading the k6 result
- Copy `http_req_duration` med, p(95), p(99) into the README table (N7).
- The run **aborts when p95 breaks the target** (`abortOnFail`). The number of virtual users shown at the abort is the **saturation point**. If it never aborts, raise `-e PEAK_VUS=` and say "no saturation up to N users".
- `POST /sales` creates real sales and uses stock. Run it against the **demo/staging** database, then reset (`scripts/reset-demo.sql`). Never against a real shop.
- Free-tier limits (Render 0.1 CPU, Neon compute hours) will cap the figures. Report them as measured on the free tier, with the date.

## Honest status
`last-unit.mjs` passed 3 of 3 rounds against the deployed service on 2026-10-28. The k6 scripts (`sales.js`, `dashboard.js`, `catalogue.js`) ran once, from the `Load test` workflow on GitHub Actions; the output is in `docs/evidence/load-2026-10-28/`. `cold-start.mjs` has not been run. `dashboard.js` tests the product and sales lists because `GET /dashboard` is not in the contract yet.