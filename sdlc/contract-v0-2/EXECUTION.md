# Execution: Contract v0.2.0, MVP-ready API additions

The runbook for taking sub-change `contract-v0-2` to completion. It covers the four proposals agreed for the MVP-ready API additions: Proposals A, B, C, and D.

Change slug: `contract-v0-2` · Last updated: 2026-10-27 · Owner: Nnaemeka Chukwuma (Data and rules) · Current stage: Complete (ready for review/merge)

## Artifact chain
| Stage | Artifact | Status | Owner | Approved by / date |
|-------|----------|--------|-------|--------------------|
| Plan | [intent.md](intent.md) | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-27 |
| Build | [plan.md](plan.md) | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-27 |
| Test | [test-plan.md](test-plan.md) | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-27 |
| Execution | [EXECUTION.md](EXECUTION.md) | accepted | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-27 |
| Handover | [WORKLOG.md](WORKLOG.md) | active | Nnaemeka Chukwuma | Nnaemeka Chukwuma, 2026-10-27 |

## Scope & Decisions
- **Proposal A (merged in PR #17):** Optional `Idempotency-Key` on `POST /customers`, V4 migration with U4 rollback script, `CustomerIdempotencyIT`. Signed off in `decisions.md` §3 by Nnaemeka Chukwuma and Isaac Bassey.
- **Proposal B:** Customer search specification and stable order (`LOWER(display_name) ASC, id ASC`), duplicate display names explicitly permitted (UUID is identity), `CustomerPage.asOf` UTC timestamp representing balance query snapshot freshness.
- **Proposal C:** Safe integer bounds on money (`Kobo` schema `maximum: 9007199254740991` kobo; request validation via `@Max(9007199254740991L)` on `ProductController.CreateRequest.priceKobo`).
- **Proposal D:** `GET /product-categories` returning distinct, non-empty categories sorted alphabetically (case-insensitive), and optional `active` boolean query parameter on `GET /products`.

## Execution steps
1. **Contract additions:**
   - Update `contract/openapi.yaml` with Proposal B (`asOf` on `CustomerPage`, query/order docs on `GET /customers`), Proposal C (`maximum: 9007199254740991` on `Kobo`), and Proposal D (`/product-categories` path, `active` parameter on `GET /products`).
   - Validate with Redocly CLI: `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` (0 errors).
2. **Backend service implementation:**
   - Add `CustomerPage.java` record with `asOf` timestamp; update `CustomerController.java` to return `CustomerPage.of(result, Instant.now())`.
   - Update `ProductController.CreateRequest` with `@Max(9007199254740991L)` on `priceKobo`.
   - Update `Product.Filter` to support `Boolean active` while preserving backwards-compatible constructors.
   - Update `ProductRepository.java` to filter by `active` and provide `listCategories()`.
   - Add `ProductCategoryController.java` mapped to `/api/v1/product-categories`.
3. **Backend verification:**
   - Unit tests: `CustomerPageTest`, `ProductValidationTest`, `ProductFilterTest`.
   - Repository integration tests: `ProductRepositoryIT` tests active filtering and category sorting.
   - Run Maven test suite: `mvnw test`.
4. **Frontend type regeneration & verification:**
   - In `web/`: run `npm run generate:api` to update `web/src/api/schema.d.ts`.
   - Run `npm run typecheck` (clean, 0 errors).
   - Run `npm run lint` (clean, 0 warnings/errors).
   - Run `npm test -- --run` (35/35 unit tests pass).
5. **Decisions and SDLC documentation:**
   - Record change in `stockwise/decisions.md` §3.
   - Formally accept `intent.md`, `plan.md`, `test-plan.md`, and generate `EXECUTION.md`.
   - Append completion entries to `sdlc/contract-v0-2/WORKLOG.md` and `stockwise/sdlc/WORKLOG.md`.
