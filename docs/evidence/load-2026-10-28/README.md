# Load test evidence, 2026-10-28
Produced by the `Load test` workflow (Actions → Load test) against https://stockwise-yc54.onrender.com/api/v1 from a GitHub-hosted runner, on Render's free plan (0.1 CPU) and Neon's free database. Save each run's files in `run-1/` … `run-9/` beside this README.

Tuning after run 3: database pool 20, JVM flags `-XX:+UseSerialGC -XX:TieredStopAtLevel=1`, debug logging off.

| Run | Tuning | Sales, one product: p95 @ users | Dashboard: p95 @ users, failed | Catalogue: p95 @ users |
|----|----|----|----|----|
| 1 | before | 1.69 s @ 7 | 802.6 ms @ 16, 0 | 503 ms @ 20 |
| 2 | before | 1.55 s @ 7 | 1.62 s @ 16, 5 failed | 546 ms @ 6 |
| 3 | before | 1.50 s @ 6 | 800.3 ms @ 19, 0 | 503 ms @ 18 |
| 4 | after | 1.48 s @ 7 | 820 ms @ 38, 0 | 508 ms @ 30 |
| 5 | after | 1.53 s @ 7 | 832 ms @ 50, 27 failed | 543 ms @ 47 |
| 6 | after | 1.53 s @ 7 | 800.2 ms @ 50, 0 | 505 ms @ 45 |
| 7 | after | 1.59 s @ 7 | 800.4 ms @ 50, 6 failed | 522 ms @ 45 |
| 8 | after | 1.45 s @ 7 | 803.8 ms @ 49, 0 | 518 ms @ 45 |
| 9 | after | 1.56 s @ 7 | 807.4 ms @ 50, 0 | 521 ms @ 43 |

Sales spread across 20 products (ramp): run 8 p95 667 ms, median 572 ms; run 9 p95 660 ms, median 589 ms; both stopped at 4 users after about 22 s.
Sales spread across 20 products (steady, 3 tills, 120 s after a 20 s warm-up, run 9): p95 656 ms, median 605 ms, slowest 717 ms, 136 requests, no failures.
Last-unit (10 devices, 3 rounds): passed in all 9 runs.

Excluded: one run that stopped at the login step (nothing was measured), and one cold-start attempt that answered in 0.3 s because the service had not gone to sleep.
Failed dashboard requests in runs 2, 5 and 7: cause not identified. In runs 8 and 9, requests logged as failed were cut off at the moment the test stopped itself.
Not measured on 2026-10-28: cold start, Lighthouse. LCP, INP and CLS were measured on 2026-10-30: see docs/evidence/web-vitals-2026-10-30/.