# Test plan: Contract v0.2.0, MVP-ready API additions

Derived from: [intent.md](intent.md), [plan.md](plan.md) (both accepted) · Status: **accepted** (accepted 2026-10-27 by Nnaemeka Chukwuma) · Parent: the main [test-plan.md](../test-plan.md) (accepted), whose rules all still apply.

## Feedback loop
| Check | Command | Passing looks like |
|-------|---------|--------------------|
| Build and test | `cd service && ./mvnw clean verify` (Docker running) | `BUILD SUCCESS`, 0 failures |
| Lint (contract) | `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` | `Your API description is valid` |
| Web types still compile | `cd web && npm run generate:api && npm run typecheck && npm test -- --run` | no type errors; tests green |
| CI guards | `.github/scripts/check-migrations.sh origin/main` and `.github/scripts/check-contract-log.sh origin/main` | both `OK` |
| Visual (UI only) | Not applicable: no UI change in this change | |

## Done-targets
- **A:** every `CustomerIdempotencyIT` test passes, and it fails when `ON CONFLICT (idempotency_key) DO NOTHING` is removed (logged in `docs/rule-removal-log.md`).
- **V4:** `MigrationRollbackIT` passes (an undo script exists for V4; up/down/up schema snapshots match).

## Traceability
| Requirement | Test(s) | Type |
|-------------|---------|------|
| A: replay returns the original | `CustomerIdempotencyIT#sameKeyReturnsTheOriginalCustomer` | integration (HTTP, Postgres) |
| A: parallel retries | `CustomerIdempotencyIT#parallelRetriesCreateOneCustomer` | integration |
| A: different body gets 422 | `CustomerIdempotencyIT#sameKeyDifferentBodyIs422` | integration |
| A: other user gets 422 | `CustomerIdempotencyIT#sameKeyOtherUserIs422` | integration |
| A: no header behaves as v0.1.0 | `CustomerIdempotencyIT#withoutKeyEachPostCreates` | integration |
| A: key and hash together (database) | `CustomerIdempotencyIT#keyAndHashGoTogether` | integration (direct SQL) |
| A: V4 reversible | `MigrationRollbackIT` | integration |
| B: CustomerPage asOf snapshot freshness | `CustomerPageTest#customerPageOfPopulatesAllFieldsIncludingAsOf` | unit |
| B: customer search and stable ordering | `CustomerRepositoryIT#listFiltersByNameAndPages` | integration |
| C: safe integer money upper bound (9007199254740991) | `ProductValidationTest#maxSafeIntegerPriceKoboIsValid`, `#priceKoboExceedingMaxSafeIntegerIsRefused` | unit |
| D: product active query filter | `ProductFilterTest`, `ProductRepositoryIT#filtersCombineAndCanBeCleared` | unit / integration |
| D: distinct sorted product categories | `ProductRepositoryIT#listCategoriesReturnsAlphabeticallySortedDistinctCategories` | integration |

## Bug fixes: test first
As the main test plan: write the failing test, commit it, then fix without editing it (CI `check-test-guard.sh` on `fix/*` branches).

## Protecting the loop
CI blocks: changed applied migrations, a migration without an undo script, a contract change without `decisions.md`, and test edits on `fix/*` branches.

## Evals (ongoing agent work)
Not applicable: none planned for this change (DM25 evals start after Monday).

## Measurement
- **Leading:** the share of done-targets green on the first full run.
- **Lagging:** rule-removal checks that genuinely fail (they all should).
