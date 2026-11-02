# Releases log

One row per production deploy (release.md checklist step 6). Add the row in the same PR or straight after the run.

Rows up to 29 Oct were back-filled by Isaac Bassey (release manager, DM26) on 2026-10-29 from the Deploy workflow history (`gh run list --workflow deploy.yml --branch main`). Times are WAT (UTC+1), when the run started. Every deploy so far went out without an approver: the GitHub `production` environment has no required reviewer yet, so each push to main deployed as soon as the CI gate passed. Adding the reviewer is with Blessing Nwafor (repo admin); from then on the Approver column names the person who approved the run.

| Date | Commit | Approver | Migrations applied | Notes |
|----|----|----|----|----|
| 2026-10-25 22:16 | a48680a | None (no gate) | V1 to V4 | PR #17, contract v0.2 work. First successful deploy, after the three failed runs below. Flyway reports V1 to V4 in place after this run; whether V1 to V3 went in during an earlier failed run is not recorded |
| 2026-10-25 23:23 | 8ecbe0d | None (no gate) | None | README update |
| 2026-10-26 00:25 | fb3e8de | None (no gate) | None | PR #18, web API base address fix |
| 2026-10-26 01:53 | e2fffd3 | None (no gate) | None | PR #20, mobile UI |
| 2026-10-26 02:08 | 6bf48b8 | None (no gate) | None | PR #19, request ID in the logs (N6) |
| 2026-10-26 08:55 | 1b0e942 | None (no gate) | None | PR #21, sale product catalogue |
| 2026-10-26 14:35 | 9c00aac | None (no gate) | None | PR #22, sale product catalogue |
| 2026-10-26 15:21 | aaaca8e | None (no gate) | None | PR #23, sale quantity controls |
| 2026-10-27 17:04 | 6287154 | None (no gate) | None | PR #24, mobile fix |
| 2026-10-27 23:33 | b060869 | None (no gate) | None | PR #27, dialog and drawer placement |
| 2026-10-27 23:57 | d3556e4 | None (no gate) | None | PR #26, contract v0.2.0 proposals B, C, D |
| 2026-10-28 02:51 | 1becc0f | None (no gate) | None | Lighthouse |
| 2026-10-28 02:55 | 3412ed0 | None (no gate) | None | PR #29, store credit and portal proposal docs; also carries CODEOWNERS (17f7f63, whose own run was cancelled). Production stayed on this commit until 06:38 while the next six runs failed |
| 2026-10-28 06:38 | 49c8102 | None (no gate) | None | Fix failing web tests. First green run after 02:58; brings PR #28 and PR #25 (customer activity fields) live |
| 2026-10-28 06:50 | a93da20 | None (no gate) | None | Proposal review |
| 2026-10-28 07:10 | 9cfe2fa | None (no gate) | None | Load test report and rollback rehearsal plan (docs) |
| 2026-10-28 07:15 | a907456 | None (no gate) | None | AI log update |
| 2026-10-28 07:22 | 2007d08 | None (no gate) | None | Load test workflow |
| 2026-10-28 07:52 | 4b1c41e | None (no gate) | None | Performance testing evidence |
| 2026-10-28 08:09 | 75fe2e6 | None (no gate) | None | Log failures in dashboard load test |
| 2026-10-28 08:41 | 25aa681 | None (no gate) | None | Sales spread testing |
| 2026-10-28 09:06 | 25aa681 | None (no gate) | None | Same commit, run by hand (workflow_dispatch) |
| 2026-10-28 09:37 | 3963a13 | None (no gate) | None | Warm load testing |
| 2026-10-28 10:55 | 77bef9b | None (no gate) | None | Load test update; also carries fda3458 (cold start testing), whose own run was cancelled |
| 2026-10-28 11:13 | 2452da8 | None (no gate) | None | Steady shop-sized load test |
| 2026-10-28 16:02 | b696832 | None (no gate) | None | Performance and testing documentation |
| 2026-10-29 12:16 | c48bbd0 | None (no gate) | None | PR #32, customer portal UI (web only; calls `/portal/...` endpoints not yet in the contract or the service) |
| 2026-10-29 12:18 | 86f3776 | None (no gate) | None | PR #30, store credit UI; also carries PR #31, reversal OTP UI, whose own run was cancelled. Web only; calls endpoints not yet in the contract or the service |
| 2026-10-29 13:54 | 7da5f00 | None (no gate) | None | PR #33, product movement history, customer ledger and dashboard (R13, R10, R14). Read-only, no migration. Deploy and smoke green in 7 min. First row logged at deploy time. Live as of 2026-10-29 |

### Runs that did not deploy

Failure causes are not recorded here; each run's log is in the Actions tab.

| Date | Commit | Result | What happened |
|----|----|----|----|
| 2026-10-25 18:33 | 8f3b1ef | Failed | PR #13, backend template |
| 2026-10-25 18:39 | cb49437 | Failed | PR #14 |
| 2026-10-25 21:56 | 58d4a57 | Failed | PR #15, handover log |
| 2026-10-25 22:05 | 3c5a622 | Cancelled | deploy.yml update; replaced by the 22:16 run |
| 2026-10-28 02:54 | 17f7f63 | Cancelled | CODEOWNERS; deployed with 3412ed0 |
| 2026-10-28 02:55 | e1bad14 | Cancelled | PR #28, role sidebar; deployed with 49c8102 |
| 2026-10-28 02:58 | dd5d71f | Failed | Merge of main |
| 2026-10-28 03:16 | 05922dd | Failed | PR #25, customer activity fields |
| 2026-10-28 04:54 | 632c221 | Failed | Customer picker E2E fix |
| 2026-10-28 05:36 | 81c2988 | Failed | Sales history diagnostics |
| 2026-10-28 06:00 | 2652146 | Failed | Category keyboard and mobile layout |
| 2026-10-28 06:18 | 83914ba | Failed | Responsive layouts. The next run, 49c8102 (Fix failing web tests), passed |
| 2026-10-28 10:11 | fda3458 | Cancelled | Cold start testing; deployed with 77bef9b |
| 2026-10-29 12:17 | b2ece7b | Cancelled | PR #31; deployed with 86f3776 |

## Rollback rehearsals

| Date | Environment | What was rolled back | Minutes taken | By |
|----|----|----|----|----|
| 2026-10-31 | Production (web and service); Neon branch copy `rollback-check` (database) | Vercel deployment, Render deploy, V6 undo on the branch copy | About 2.6 minutes of platform processing time (rollback about 1.2 min: web 5 s, service 54 s, database 10 s; roll-forward about 1.5 min: web 5 s, service 55 s, database 28 s). Clicking between dashboards is not counted. | No staging environment existed, so web and service were rehearsed on production. The Neon copy needed the `demo` profile when the service started, because the live database includes the demo seed migration. [Smoke check after roll-forward: passed / failed.] [Versions checked: `/health` showed the starting commit again after roll-forward.] | Blessing Nwafor |

## Commands Used
Undo:       ./mvnw "-Pundo" "-Dundo.target=5" exec:java
Roll-fwd:   ./mvnw spring-boot:run "-Dspring-boot.run.profiles=local,demo"   (with FLYWAY_ON_STARTUP=true, DATABASE_JDBC_URL and DATABASE_JDBC_URL_DIRECT pointing at the branch copy)

Smoke check after roll-forward: passed, about 66 s (mostly waiting for the service to answer).