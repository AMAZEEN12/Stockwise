# Release: Priority Backend Services, Sale Reversal & Oldest-First Allocation

Derived from: plan.md (2026-11-02), test-plan.md (2026-11-02) · Status: accepted
Release manager: Isaac Bassey (backup: Blessing Nwafor, DM26) · Technical sign-off: Isaac Bassey & Nnaemeka Chukwuma
Supporting skills: sdlc

## Governing rule
The agent may act up to the production gate and cannot pass it. All changes arrive as a reviewed Pull Request against `main`.

## Approval gates
| Gate | Trigger (action or path) | Decision | Approver | Where enforced |
|------|--------------------------|----------|----------|----------------|
| Contract Version Bump v0.5.0 | `contract/openapi.yaml` | block without 2-engineer sign-off | Isaac Bassey & Nnaemeka Chukwuma | `decisions.md` §3 |
| Backend Services Review | `service/src/main/java/**` | block without data & rules approval | Nnaemeka Chukwuma | CODEOWNERS |
| Production Deploy | Merge to `main` triggering `deploy.yml` | block without GitHub Environment approval | Isaac Bassey (DM26) | GitHub Environment `production` |

## Environments and autonomy
| Environment | What the agent may do | Human gate |
|-------------|-----------------------|------------|
| Local / Testcontainers | Build, run tests, verify contract, lint frontend | None |
| Preview / Staging | Verify Vercel preview and Render staging service | Automated CI gate |
| Production | Prepare PR, generate release log row | Isaac Bassey (DM26) must approve deploy |

## Pipeline
- **CI Gates:**
  1. Secret scan (`gitleaks`).
  2. Contract lint (`@redocly/cli`).
  3. Service compilation and unit tests (`mvnw clean test`).
  4. Web verification (lint, typecheck, Vitest).
- **No Schema Migrations Required:** Priority 1 backend implementations reuse existing V2 (`product.version`) and V6 (`sale.store_credit_used_kobo`, `sale.unpaid_kobo`, `repayment_allocation`, `reversal_authorization`) tables and columns.

## Rollback
- Service DB: No migration to undo.
- Web: Revert deployment in Vercel or promote previous production deployment.
