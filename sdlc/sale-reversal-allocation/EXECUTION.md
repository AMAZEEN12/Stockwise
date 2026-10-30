# Execution: Real Sale Reversal & Oldest-First Repayment Allocation

The runbook for taking this change from its current state to production and into maintenance. Any human or agent can follow it. Generated from the artifacts below; progress is tracked in `WORKLOG.md` in this folder.

Change slug: `sale-reversal-allocation` · Last updated: 2026-10-30 · Current stage: Build

## Artifact chain
| Stage | Artifact | Status | Owner | Approved by / date |
|-------|----------|--------|-------|--------------------|
| Plan | intent.md | accepted | Nnaemeka Chukwuma | User / 2026-10-30 |
| Design | spec.md | accepted | Nnaemeka Chukwuma | User / 2026-10-30 |
| Build | plan.md | accepted | Nnaemeka Chukwuma | User / 2026-10-30 |
| Build | AGENTS.md (repo) | accepted | Team 3 | 2026-10-23 |
| Test | test-plan.md | accepted | Nnaemeka Chukwuma | User / 2026-10-30 |
| Deploy | REVIEW.md (repo) | accepted | Isaac Bassey | 2026-10-23 |
| Deploy | release.md | accepted | Isaac Bassey | User / 2026-10-30 |
| Maintain | monitoring.md | deferred | Team 3 | DM31 |

## Supporting skills
| Skill | Location | Version / date | Stages it shaped |
|-------|----------|----------------|------------------|
| sdlc | `.gemini/config/skills/sdlc` | 2026-10-23 | All stages |

## Setup before automation starts
- [x] Branch `feat/sale-reversal-allocation` created from `origin/feat/sale-reversal-service` (incorporating PR #40).
- [x] Merged feature sign-offs in `decisions.md` §3 reconciled (restocks PR #38, customer activity PR #25, dashboard PR #33).
- [ ] V6 Flyway migration and U6 rollback script written.
- [ ] Testcontainers Docker Desktop running locally.

## Steps
Each step: actor · input → action → output · gate before next step.

1. **Contract definition (OpenAPI):** agent · `spec.md` → Edit `contract/openapi.yaml` to add `POST /sales/{saleId}/reversal`, `POST /reversals/authorizations`, schemas and error codes → Validated OpenAPI · Gate: `npx.cmd @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` is green.
2. **Database migration V6 & U6:** agent · `plan.md` → Create `V6__sale_reversal_allocation.sql` and `U6__sale_reversal_allocation.sql` → Migration scripts · Gate: `MigrationRollbackIT` passes up → down → up.
3. **Supervisor OTP Authorization:** agent · `spec.md` → Implement `ReversalAuthorization` repository and controller with 15-minute expiration → OTP endpoint working · Gate: Unit tests pass.
4. **Oldest-First Repayment Allocation:** agent · `spec.md` → Implement `repayment_allocation` insertion and deterministic `(created_at, id)` allocation in `CustomerRepository` → Allocator engine · Gate: `RepaymentAllocationIT` passes.
5. **Sale Reversal Service & Transaction:** agent · `spec.md` → Implement `SaleReversalService` and `SaleReversalController` coordinating stock restoration, debt relief, store credit issuance (DM5), and audit history → Full reversal API · Gate: `SaleReversalIT` passes all 7 scenarios.
6. **Rule Removal Evidence:** agent · `test-plan.md` → Temporarily remove guard and verify test fails; record evidence in `docs/rule-removal-log.md` → Verified guard log · Gate: Test failed for expected reason and restored.
7. **Frontend Alignment & Verification:** agent · Contract → Run `npm run generate:api` in `web`, run `npm run typecheck` and `npm test -- --run` → Clean frontend build · Gate: 0 type errors, 0 test failures.
8. **Pull Request & CI:** human/agent · Git commit without AI attribution → Push branch `feat/sale-reversal-allocation` and open PR to `main` → PR #41 · Gate: All GitHub Actions CI checks green.
9. **Deploy & Release:** human (Isaac Bassey) · PR #41 → Merge to `main` and approve GitHub environment `production` → Live deploy on Render & Neon · Gate: Live smoke check green.

## Commands
```powershell
# OpenAPI Lint
npx.cmd @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml

# Backend Build & Tests
cd service
./mvnw clean test
./mvnw test -Dtest=SaleReversalIT,RepaymentAllocationIT,MigrationRollbackIT

# Frontend Verification
cd ../web
npm run generate:api
npm run typecheck
npm test -- --run
npm run build
```

## Parallel work
- Run at the same time: OpenAPI contract drafting and supervisor OTP code generator.
- Run in sequence: V6 Migration → Allocation engine → Reversal transaction → Integration tests.

## Human decision points
| Decision | Approver | Evidence they review |
|----------|----------|----------------------|
| Contract v0.4.0 sign-off | Isaac Bassey & Nnaemeka Chukwuma | `contract/openapi.yaml` diff and `decisions.md` §3 entry |
| Migration V6 approval | Isaac Bassey (tech lead) | `V6__*.sql` and `U6__*.sql` diff and rollback test |
| Production Release | Isaac Bassey (DM26) | Green CI checks, smoke check, and release log row |

## Automation roadmap
| Trigger | Starts | Automated now? |
|---------|--------|----------------|
| Push to branch | GitHub Actions CI (`ci.yml`) | Yes |
| Merge to main | Production Deploy (`deploy.yml`) | Yes (with human gate) |
| Daily health check | Smoke check against live Render URL | Yes |

## Measurement
| Stage | Leading indicator | Lagging indicator |
|-------|-------------------|-------------------|
| Build | Time to green Testcontainers suite | JaCoCo coverage ≥ 80% on rule packages |
| Deploy | Time from PR opening to production merge | Zero deployment rollbacks |

## Unresolved questions
| Question | From artifact | Owner | Needed by step |
|----------|---------------|-------|----------------|
| None | - | - | - |
