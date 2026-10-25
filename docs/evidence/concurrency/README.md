# Concurrency evidence: the key rule fails without its protection

Evidence for spec R4 / success measure S1 (EXECUTION step 12, slide 4). "Stock never falls below zero" holds because of two protections in the sale transaction:

1. the guarded update in `SaleRepository.takeStock`: `UPDATE product … WHERE id = :id AND active AND quantity >= :quantity`
2. the database backstop in V2: `CONSTRAINT product_quantity_non_negative CHECK (quantity >= 0)`

The branch `evidence/no-stock-guard` removes exactly those two things (one condition, one constraint) and nothing else. The same test, `SaleConcurrencyIT`, is run on both branches. Ten threads start together on one `CountDownLatch`, and the test checks the final database state.

| Log | Branch | Result |
|----|----|----|
| [with-guard-PASSES.log](with-guard-PASSES.log) | `feat/sale-transaction` @ 9ab0b3a | 4 tests, 0 failures, `BUILD SUCCESS` |
| [no-stock-guard-FAILS.log](no-stock-guard-FAILS.log) | `evidence/no-stock-guard` @ 107a3dd | 4 tests, **2 failures**, `BUILD FAILURE` |

What failed without the protection:
- `lastUnitIsSoldExactlyOnce`: one unit in stock and 10 devices selling it. Expected 1 sale; **all 10 were recorded** ("Expected size: 1 but was: 10"), leaving stock at -9.
- `parallelSalesNeverOversell`: 5 units in stock and 10 devices each selling 2. Expected 2 sales; **all 10 were recorded** ("Expected size: 2 but was: 10"), leaving stock at -15.

Both runs were made locally on 2026-10-25 (Windows 11, Docker Desktop, Testcontainers `postgres:17-alpine`), with `./mvnw clean verify -Dit.test=SaleConcurrencyIT`. Recorded by the agent for Nnaemeka Chukwuma.

Still to do:
- the CI version: `concurrency-evidence.yml` (Blessing) uploads the same two logs as workflow artifacts;
- the deployed version: `last-unit.mjs` against the live service (step 13).

Before each run, rebase `evidence/no-stock-guard` onto the sale branch, so its diff stays one condition plus one constraint. Never merge it.
