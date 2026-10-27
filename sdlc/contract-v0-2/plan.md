# Plan: Contract v0.2.0, MVP-ready API additions

Derived from: [intent.md](intent.md) (accepted) · Status: **accepted** (accepted 2026-10-27 by Nnaemeka Chukwuma; proposals A-D completed) · Implementation order: proposal A first (migration), followed by B, C, D.
Branch: `feat/contract-v0-2`, stacked on `docs/handover-log` (PR #15 / PR #17 merged into `main`).

## Files that change
| File | New / modified / deleted | Requirements covered |
|------|--------------------------|----------------------|
| `contract/openapi.yaml`: `info.version` 0.2.0; Proposal A (optional `Idempotency-Key` on `POST /customers`), Proposal B (ordering and `asOf`), Proposal C (`Kobo` maximum 9007199254740991), Proposal D (`GET /product-categories`, `GET /products` active filter) | modified | A, B, C, D |
| `decisions.md` §3: dated v0.2.0 lines for A, documentation of existing behavior, and B, C, D | modified | A, B, C, D |
| `service/src/main/resources/db/migration/V4__customer_idempotency.sql`: `customer.idempotency_key uuid`, `request_hash text`, `created_by uuid REFERENCES app_user`; `UNIQUE (idempotency_key)`; CHECK that key and hash are set together | new | A |
| `service/src/main/resources/db/rollback/U4__customer_idempotency.sql` | new | A |
| `service/.../common/IdempotencyKeyReused.java`: a shared 422 exception | new | A |
| `service/.../customer/CustomerRepository.java`: `create(New, key, hash, createdBy)` with `INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`, then a replay check (same user and same hash) | modified | A |
| `service/.../customer/CustomerRequestHash.java`: SHA-256 of the normalised body (trimmed name; blank contact counts as none) | new | A |
| `service/.../customer/CustomerController.java`: reads the optional header and passes the current user; returns `CustomerPage` with `asOf` | modified | A, B |
| `service/.../customer/CustomerPage.java`: record with items, page, size, totalItems, and `asOf` | new | B |
| `service/.../product/Product.java`: `Product.Filter` supports `Boolean active` | modified | D |
| `service/.../product/ProductController.java`: validates `priceKobo <= 9007199254740991L`, `list()` accepts `active` | modified | C, D |
| `service/.../product/ProductRepository.java`: `list()` filters by `active`, `listCategories()` returns distinct sorted categories | modified | D |
| `service/.../product/ProductCategoryController.java`: `GET /api/v1/product-categories` endpoint | new | D |
| `service/.../common/ProblemHandler.java`: maps `IdempotencyKeyReused` to 422 | modified | A |
| `service/src/test/.../customer/CustomerIdempotencyIT.java` | new | A |
| `service/src/test/.../product/ProductValidationTest.java`: verifies safe integer money validation | new | C |
| `service/src/test/.../customer/CustomerPageTest.java`: verifies `CustomerPage` with `asOf` | new | B |
| `service/src/test/.../product/ProductFilterTest.java`: verifies filter active variations | new | D |
| `service/src/test/.../product/ProductRepositoryIT.java`: tests `active` filter and `listCategories()` | modified | D |
| `web/src/api/schema.d.ts`: regenerated (`npm run generate:api`), with no hand edits | modified | A, B, C, D |

## Order of work
1. Contract and `decisions.md` line (A).
2. V4 and U4. `MigrationRollbackIT` proves the undo restores the schema.
3. Repository, hash, controller and error mapping.
4. `CustomerIdempotencyIT`, a removal check (no `ON CONFLICT` makes the test fail), the full `./mvnw verify`, redocly lint, the web type regeneration plus `typecheck` and tests.
5. Then B, C and D, in a later session if not reached.

## Parallelization
B, C and D touch other files (`product/*`, contract sections) and can run in parallel with A after step 1. All of them edit `contract/openapi.yaml`, so contract edits are made in sequence.

## Risks
| Risk | What it could break | Mitigation |
|------|---------------------|------------|
| Header made required | The v0.1.0 web (sends no key) gets 400 | Optional header; a test proves no-header creation still works |
| Existing customer rows have no key | Unique constraint and CHECK on old rows | Columns nullable; CHECK is `(key IS NULL) = (hash IS NULL)`; Postgres UNIQUE allows many NULLs |
| Parallel replays | Duplicate customers | Unique index plus `ON CONFLICT DO NOTHING`; parallel test with 10 threads |
| Seed or rollback break | Demo data or `MigrationRollbackIT` | The seed lists its columns explicitly; U4 tested by `MigrationRollbackIT` |

## Alternatives considered
- **A separate `idempotency_key` table shared by every resource:** rejected for now, since it's more moving parts the night before a demo. Sales already keep the key on the row.
- **A required header:** rejected, because it isn't additive (D1).
- **Keys scoped per user (`UNIQUE (created_by, idempotency_key)`):** rejected. UUIDs are global; another user's replay is refused with 422 instead.

## Proof
| Requirement | Test or check that proves it |
|-------------|------------------------------|
| A: same key and body make one customer, same response | `CustomerIdempotencyIT#sameKeyReturnsTheOriginalCustomer`, `#parallelRetriesCreateOneCustomer` |
| A: different body or user gets 422 | `#sameKeyDifferentBodyIs422`, `#sameKeyOtherUserIs422` |
| A: no header behaves as v0.1.0 | `#withoutKeyEachPostCreates` |
| A: V4 reversible | `MigrationRollbackIT` (up/down/up) |
| A: database rule | `#keyAndHashGoTogether` (direct SQL) |

## Plan maintenance
If implementation departs from this plan, update this file in the same commit.

## Measurement
- **Leading:** the work merges from the first PR.
- **Lagging:** no duplicate customers reported after the web adopts the header.
