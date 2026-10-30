# Test plan: Real Sale Reversal & Oldest-First Repayment Allocation

Derived from: spec.md (2026-10-30), plan.md (2026-10-30) · Status: draft
Supporting skills: sdlc

## Feedback loop
The agent runs these itself and iterates until they pass, before any human reviews the work.
| Check | Command | Passing looks like |
|-------|---------|--------------------|
| Contract Lint | `npx.cmd @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` | `Woohoo! Your API description is valid.` |
| Service Test | `cd service && ./mvnw test` | `BUILD SUCCESS` with zero failures |
| Integration Test | `cd service && ./mvnw test -Dtest=SaleReversalIT,RepaymentAllocationIT` | `BUILD SUCCESS` with 100% tests passing |
| Migration Rollback | `cd service && ./mvnw test -Dtest=MigrationRollbackIT` | `BUILD SUCCESS` (tests V1..V6 up → down → up) |
| Web Typecheck & Test | `cd web && npm run typecheck && npm test -- --run` | `0 errors`, all test suites passing |

## Done-targets
- `SaleReversalIT`: passes with all 7 core scenarios (paid sale reversal, wholly unpaid credit sale reversal, partially repaid credit sale reversal, assistant OTP verification, duplicate reversal rejection, idempotency key replay, stock movement verification).
- `RepaymentAllocationIT`: passes with the two-sale example from the proposal (Sale A ₦10,000, Sale B ₦5,000; repay ₦6,000 allocates to A; reversing A leaves B owed ₦5,000, relieves A debt ₦4,000, and gives ₦6,000 store credit).
- `MigrationRollbackIT`: confirms `V6__sale_reversal_allocation.sql` and `U6__sale_reversal_allocation.sql` roll back cleanly.
- `rule-removal-log.md`: records row demonstrating that disabling the reversal check or balance check causes test failure.

## Traceability
| Requirement | Test(s) | Type |
|-------------|---------|------|
| R11 (Stock restoration) | `SaleReversalIT.testStockRestoredAndMovementCreated()` | Integration |
| R12 (Store credit excess) | `SaleReversalIT.testPartiallyRepaidReversalConvertsToStoreCredit()` | Integration |
| R13 (Oldest-first allocation) | `RepaymentAllocationIT.testOldestSalesAllocatedFirst()` | Integration |
| R14 (Supervisor authorization) | `SaleReversalIT.testAssistantRequiresValidOtp()` | Integration |
| R15 (Idempotency) | `SaleReversalIT.testReplayWithSameIdempotencyKeyReturnsCachedResponse()` | Integration |
| R16 (Legacy/repayment protection) | `SaleReversalIT.testLegacyUnallocatedSaleReversalRequiresManualReview()` | Integration |
| N1 (Integer kobo) | `SchemaRulesIT.testAllMoneyColumnsAreBigint()` | Integration |
| N2 (Concurrency) | `SaleReversalIT.testPessimisticLockingUnderConcurrentAccess()` | Integration |
| N5 (Problem details) | `SaleReversalIT.testErrorResponsesConformToProblemDetails()` | Integration |

## Bug fixes: test first
1. Reproduce the bug as a failing test; confirm it fails for the expected reason.
2. Commit the test.
3. Fix the code without editing the test.

## Protecting the loop
- CI check fails any `fix/*` PR that modifies test files after the commit adding the failing test (DM23).
- Review rule: reject diffs that weaken assertions, remove invariants, or skip error cases.

## Evals (ongoing agent work)
- Suite location: `evals/`
- Gate: Pass rate ≥ 100% on core financial transactions (sales, reversals, repayments, restocks).
- Rule: Any reversal accounting discrepancy or stock leak in testing adds an eval to the test harness.

## Measurement
- Leading: First-pass test pass rate across `SaleReversalIT` and `RepaymentAllocationIT`.
- Lagging: Zero financial reconciliation errors in production release logs.
