# Test plan: Priority Backend Services, Sale Reversal & Oldest-First Allocation

Derived from: spec.md (2026-11-02), plan.md (2026-11-02) · Status: accepted
Accepted by: Nnaemeka Chukwuma (Data & rules owner, 2026-11-02) · Supporting skills: sdlc

## Feedback loop
The agent runs these itself and iterates until they pass, before any human reviews the work.
| Check | Command | Passing looks like |
|-------|---------|--------------------|
| Contract Lint | `npx @redocly/cli lint contract/openapi.yaml --config contract/redocly.yaml` | `Woohoo! Your API description is valid.` |
| Web Generate Types | `cd web && npm run generate:api` | `✨ openapi-typescript` clean generation |
| Web Typecheck | `cd web && npm run typecheck` | `0 errors`, `tsc --noEmit` exits with 0 |
| Web Lint | `cd web && npm run lint` | `0 warnings`, clean exit |
| Web Unit Tests | `cd web && npm test -- --run` | 19 test files, 58 tests passed |
| Backend Unit Tests | `cd service && ./mvnw test` | `BUILD SUCCESS`, 13 tests passed, 0 failures |
| Integration Tests | `cd service && ./mvnw test-compile` | `BUILD SUCCESS`, all test classes compile cleanly |

## Done-targets
- `ProductValidationTest`: asserts safe bounds on `UpdateRequest` (name, reference, category, price, threshold).
- `CustomerValidationTest`: asserts bounds on `RepaymentRequest` and `StoreCreditGrantRequest`.
- `ProductEditIT`: verifies OWNER update, 412 version mismatch, 412 missing `If-Match`, 403 non-owner, archive/unarchive, and 409 duplicate reference.
- `CustomerRepaymentEndpointIT`: verifies cashier oldest-first debt allocation, replay-safety, 400 debt exceeded, customer URL path, and 403 forbidden admin.
- `StoreCreditSettlementIT`: verifies store credit issuance, idempotency, checkout drawdown, net debt offset, and sale reversal restoration.

## Traceability
| Requirement | Test(s) | Type |
|-------------|---------|------|
| R1 (Product edit & 412) | `ProductEditIT.patchProductOptimisticLockSuccess`, `ProductValidationTest` | Integration / Unit |
| R9 (Repayments endpoint) | `CustomerRepaymentEndpointIT.recordRepaymentAllocatesOldestFirst`, `CustomerValidationTest` | Integration / Unit |
| R11 (Sale reversal) | `SaleReversalIT.testStockRestoredAndMovementCreated` | Integration |
| R12 (Store credit settlement) | `StoreCreditSettlementIT.saleCheckoutDrawsDownStoreCreditAtomically` | Integration |
| R13 (Oldest-first allocation) | `RepaymentAllocationIT.testOldestSalesAllocatedFirst` | Integration |
| R14 (Supervisor OTP) | `SaleReversalIT.testAssistantRequiresValidOtp` | Integration |
| R15 (Idempotency) | `CustomerRepaymentEndpointIT.repaymentIdempotencyReplayWorks` | Integration |
| R18 (Archiving) | `ProductEditIT.archiveAndUnarchiveProduct` | Integration |
| N1 (Integer kobo) | `ProductValidationTest`, `CustomerValidationTest` | Unit |
| N3 (RBAC) | `ProductEditIT.nonOwnerPatchReturnsForbidden`, `CustomerRepaymentEndpointIT` | Integration |
| N5 (RFC 9457) | `ProblemHandlerTest` | Unit |
