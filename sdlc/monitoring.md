# Monitoring: Stockwise, stock and customer credit for one small shop

Derived from: [intent.md](intent.md) success criteria, [release.md](release.md) (accepted 2026-10-23) · Status: **deferred** (DM31, decided by Team 3 on 2026-10-23)
Service owner: <to decide> · On call: <to decide>
Supporting skills: none

> **Monitoring is postponed by team decision (DM31).** This file holds what earlier artifacts already settled, and lists the decisions still to make. Nothing below is active. When the team resumes monitoring, answer the "Decisions still to make" list (each with who to record as the decision maker), fill in the sections, and set the status to draft.

## Principle
Detection stays deterministic: a version-controlled, unit-tested script, with no model involved. Diagnosis after a breach is done by a person (AI tools may be used locally, DM29; no AI runs in CI).

## Already settled (from earlier artifacts)
- **No background jobs:** low stock, dashboard figures and balances are computed when read (spec), so there is no "job didn't run for an hour" failure mode to monitor.
- **Logs:** structured JSON with `X-Request-Id` on every line and in every error body (spec N6). Hosted on Render and Qocent log views.
- **Health endpoints:** `/` and `/api/v1/health` (deploy-plan §2). Post-deploy smoke checks run in `deploy.yml` (release.md).
- **Performance targets (DM12):** `POST /sales` p95 ≤ 500 ms, `GET /dashboard` p95 ≤ 800 ms (warm), LCP ≤ 2.5 s, INP ≤ 200 ms. These are measured by the load test and Lighthouse (test-plan), not by continuous monitoring.
- **Rollback:** the pre-approved procedure is in release.md, run by the release manager or backup (DM26).
- **Free-tier limits worth watching later:** Render 750 instance hours per workspace per month; Neon 1 GB storage and 100 CU-hours per project per month; Qocent prepaid balance (pauses at zero) (deploy-plan §1).

## Candidate metrics (not yet chosen)
| Metric | Possible source | Why it might matter |
|--------|-----------------|---------------------|
| Health-check success and latency | scheduled probe | outage or cold-start detection |
| 5xx rate and p95 latency per endpoint | service logs | regressions after deploys |
| Reconciliation mismatches (balance ≠ sum of ledger; quantity ≠ sum of movements) | read-only SQL | the core correctness promise |
| 409 `INSUFFICIENT_STOCK` / `REPAYMENT_EXCEEDS_BALANCE` rate | logs | guard behaviour; spikes may signal a UI bug |
| CI failure rate on `main` | GitHub Actions API | pipeline health |
| Free-tier consumption (Render hours, Neon CU-hours and storage, Qocent balance) | provider dashboards | avoiding a paused demo |

## Decisions still to make
1. Monitoring tool: scheduled Actions script, plus UptimeRobot, or Grafana Cloud free (asked 2026-10-23, postponed).
2. Which metrics to watch, and their bands and response tiers.
3. Service owner and on-call person or rotation, and the incident channel.
4. Pre-approved runbooks, and who may trigger them.
5. Where post-mortems are written (suggested: `lessons/<YYYY-MM>-<slug>.md`), and how a finding becomes a new intent.md.
6. When to resume this stage.

## Control bands and response tiers
Not applicable yet: deferred (DM31).

## Trigger layer
Not applicable yet: deferred (DM31).

## Closing the loop
Not applicable yet: deferred (DM31). The intended shape, when resumed: a breach opens a GitHub issue, then a person diagnoses it and writes a new `intent.md`, then the team triages it (fix now, schedule or dismiss), and the fix adds an eval (DM25).

## Pre-approved runbooks
| Runbook | When it may be triggered | Approved by |
|---------|--------------------------|-------------|
| Rollback (release.md) | after a failed deploy or a production defect | release manager Isaac Bassey (backup Blessing Nwafor), DM26 |

## Incident channel
Not decided: deferred (DM31).

## Open questions
- [ ] When does the team resume monitoring, and who owns it? (owner: Team 3) · UNRESOLVED

## Measurement
- Leading: time from band breach to an intent.md in the triage queue (once active).
- Lagging: share of findings that become merged fixes; repeat incidents of the same class.
