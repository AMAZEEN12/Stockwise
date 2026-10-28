# Load test report (Stockwise)

Brief: "A load test reporting response times at the 50th, 95th and 99th percentiles and identifying the point where the service stops meeting the target you set. A report with no saturation point means the test was too gentle."
Targets (DM12): `POST /sales` p95 ≤ 500 ms (warm); read paths p95 ≤ 800 ms (warm). The dashboard endpoint does not exist yet, so `load/k6/dashboard.js` measures `GET /products` and `GET /sales`. Say that here and in the README.

Produced by `load/run-load-tests.ps1`. Raw logs are kept outside the repo in `%USERPROFILE%\stockwise-load-logs\<timestamp>\`; paste the relevant lines below. Never write a figure that is not in a log.

## Run details (fill in from summary.md)
| Item | Value |
|---|---|
| Date and time | |
| Service tested | https://stockwise-yc54.onrender.com/api/v1 |
| Database | Neon (project / branch): |
| Service state | warm / just woken (cold start was ___ s) |
| Render plan | Free (the repo load README says 0.1 CPU; confirm on Render pricing page, checked on: ___) |
| k6 version / Node version | |
| Ramp | 30 s to 10 VUs, 1 min to 25, 1 min to 50, 30 s down (PEAK_VUS=50) |
| Run by | Blessing Nwafor |

## 1. Cold start
GET /health after the service had been idle for more than 15 minutes: ___ s. (If the first call took under 10 s the service was already warm: do not report it as a cold start.)

## 2. Last unit on the deployed service
| Round | 201 | 409 | Other | Final quantity | Result |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

Paste the `LAST-UNIT TEST PASSED` line. Expected: 10 devices, one 201, nine 409, quantity 0.

## 3. POST /sales (k6 `load/k6/sales.js`)
| Median | p95 | p99 | Error rate | Target met? |
|---|---|---|---|---|
| | | | | |

**Saturation point:** the ramp aborted at ___ virtual users (p95 passed 500 ms), or "no saturation up to ___ users" (then raise `-PeakVus` and run again: a run with no saturation point means the test was too gentle).

## 4. Read paths (k6 `load/k6/dashboard.js`)
| Median | p95 | p99 | Error rate | Target met? |
|---|---|---|---|---|
| | | | | |

## What limited the result
State which resource ran out first, from evidence, not guesswork: Render free CPU (0.1), Neon compute (CU-hours, autosuspend), connection pool, or the test machine's own network. If you did not measure it, write "not measured".

## Limits of this test
- Measured on the free tier from one machine in Lagos, so latency includes the network between you and Render.
- Every `POST /sales` wrote real rows to the demo database. State how it was reset (`scripts/reset-demo.sql`, and when).
- Figures are for the date above; free-tier behaviour changes without notice.

## Reversal condition (decision record DM12)
If the observed warm p95 for `POST /sales` is over target on the free tier, say what you will change (for example connection pool size or the number of rows locked per sale) and what number would make you drop the target.