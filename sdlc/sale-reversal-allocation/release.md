# Release: Real Sale Reversal & Oldest-First Repayment Allocation

Derived from: plan.md (2026-10-30), test-plan.md (2026-10-30) · Status: draft
Release manager: Isaac Bassey (backup: Blessing Nwafor, DM26) · Change-management reference: not required
Supporting skills: sdlc

## Governing rule
The agent may act up to the production gate and cannot pass it. All changes arrive as a reviewed Pull Request against `main`.

## Approval gates
| Gate | Trigger (action or path) | Decision | Approver | Where enforced |
|------|--------------------------|----------|----------|----------------|
| Migration V6 Review | `service/src/main/resources/db/migration/V6__*.sql` | block without data & tech lead sign-off | Isaac Bassey & Nnaemeka Chukwuma | CODEOWNERS & CI guard |
| Contract Version Bump | `contract/openapi.yaml` | block without 2-engineer sign-off | Isaac Bassey & Nnaemeka Chukwuma | `check-contract-log.sh` |
| Production Deploy | Merge to `main` triggering `deploy.yml` | block without GitHub Environment approval | Isaac Bassey (DM26) | GitHub Environment `production` |

## Environments and autonomy
| Environment | What the agent may do | Human gate |
|-------------|-----------------------|------------|
| Local / Testcontainers | Build, run migrations, run unit/integration tests, test rollback | None |
| Preview / Staging | Verify Vercel preview and Render staging service | Automated CI gate |
| Production | Prepare PR, generate release log row, prepare migrations | Isaac Bassey (DM26) must approve deploy |

## Pipeline
- **CI/CD Platform:** GitHub Actions (`ci.yml`, `deploy.yml`).
- **CI Gates:**
  1. Secret scan (gitleaks).
  2. Guards (`check-migrations.sh`, `check-contract-log.sh`).
  3. OpenAPI lint (`@redocly/cli`).
  4. Service verification (`mvnw clean verify`).
  5. Web verification (lint, typecheck, Vitest, production build).
- **Automated Rollback Rehearsal:** `MigrationRollbackIT` executes in CI, testing V1..V6 up → down (to V5 via `U6`) → up.

## Rollback
- Command (Service DB): `cd service && ./mvnw -Pundo -Dundo.target=5 exec:java` with Neon credentials set.
- Command (Web): Revert deployment in Vercel or promote previous production deployment.
- Rollback documentation: [docs/rollback-rehearsal.md](../../docs/rollback-rehearsal.md).

## Measurement
- Leading: Time waiting on PR review and environment approval.
- Lagging: Zero migration failures during production deployment.
