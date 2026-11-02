# Execution: Priority Backend Services, Sale Reversal & Oldest-First Allocation

The runbook for taking this change from its current state to production and into maintenance. Any human or agent can follow it. Generated from the artifacts below; progress is tracked in `WORKLOG.md` in this folder.

Change slug: `sale-reversal-allocation` · Last updated: 2026-11-02 · Current stage: Complete (Ready for PR)

## Artifact chain
| Stage | Artifact | Status | Owner | Approved by / date |
|-------|----------|--------|-------|--------------------|
| Plan | intent.md | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma / 2026-11-02 |
| Design | spec.md | accepted | Nnaemeka Chukwuma | Isaac Bassey & Nnaemeka Chukwuma / 2026-11-02 |
| Build | plan.md | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma / 2026-11-02 |
| Build | AGENTS.md (repo) | accepted | Team 3 | 2026-10-23 |
| Test | test-plan.md | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma / 2026-11-02 |
| Deploy | REVIEW.md (repo) | accepted | Isaac Bassey | 2026-10-23 |
| Deploy | release.md | accepted | Isaac Bassey | Isaac Bassey & Nnaemeka Chukwuma / 2026-11-02 |
| Maintain | monitoring.md | deferred | Team 3 | DM31 |

## Supporting skills
| Skill | Location | Version / date | Stages it shaped |
|-------|----------|----------------|------------------|
| sdlc | `.gemini/config/skills/sdlc` | 2026-10-23 | All stages |

## Steps completed
1. **OpenAPI Contract v0.5.0:** Added `PATCH /products/{productId}`, `POST /repayments`, `POST /customers/{customerId}/store-credit`, `POST /customers/{customerId}/repayments`, `SaleCreate.useStoreCredit`, `Sale.storeCreditUsedKobo`, schemas, parameters, and responses. Validated with Redocly CLI.
2. **Web API Synchronization:** Regenerated `web/src/api/schema.d.ts` using `openapi-typescript`. Verified with `npm run typecheck` (0 errors), `npm run lint` (0 warnings), and Vitest (58/58 tests passed).
3. **Product Edit & Optimistic Concurrency:** Implemented `Product.Update`, `PreconditionFailedException` (412), `ErrorCode.VERSION_CONFLICT`, and `PATCH /api/v1/products/{id}` with `If-Match: version` in `ProductController` and `ProductRepository`.
4. **Customer Repayments:** Implemented `POST /api/v1/repayments` and `POST /api/v1/customers/{customerId}/repayments` in `CustomerController` with in-memory `Idempotency-Key` replay cache, oldest-first credit sale allocation, and `RepaymentResponse`.
5. **Store Credit Settlement:** Implemented `POST /api/v1/customers/{customerId}/store-credit`, integrated store credit drawdown in `SaleService` (`useStoreCredit`), decremented customer store credit, offset debt, and populated `Sale.storeCreditUsedKobo`.
6. **Role Permissions:** Updated `SecurityConfig.java` to restrict PATCH products to OWNER, store credit issuance to OWNER/ADMIN, and repayments to OWNER/ASSISTANT.
7. **Verification Suites:** Added `ProductValidationTest`, `CustomerValidationTest`, `ProductEditIT`, `CustomerRepaymentEndpointIT`, and `StoreCreditSettlementIT`. Verified 13/13 backend unit tests and 58/58 frontend unit tests green.
8. **Reconciliation:** Recorded dual-engineer sign-off for v0.4.0 and v0.5.0 in `decisions.md` §3 (Nnaemeka Chukwuma & Isaac Bassey).

## Commands
```powershell
# OpenAPI Lint
npx @redocly/cli lint contract/openapi.yaml --config contract/redocly.yaml

# Web Verification
cd web
npm run generate:api
npm run typecheck
npm run lint
npm test -- --run

# Backend Verification
cd service
./mvnw.cmd test
```

## Human decision points
| Decision | Approver | Evidence they review |
|----------|----------|----------------------|
| Contract v0.5.0 sign-off | Isaac Bassey & Nnaemeka Chukwuma | `contract/openapi.yaml` diff and `decisions.md` §3 |
| Priority 1 Backend Implementation | Nnaemeka Chukwuma | Implementation diff and test suites |
| PR Merge & Release | Isaac Bassey (DM26) | Green CI checks and test verification |
