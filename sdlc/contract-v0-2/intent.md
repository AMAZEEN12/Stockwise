# Intent: Contract v0.2.0, MVP-ready API additions

Derived from: [docs/customers-contract-proposal.md](../../docs/customers-contract-proposal.md), [docs/products-sales-contract-proposal.md](../../docs/products-sales-contract-proposal.md) · Parent: the main Stockwise [intent.md](../intent.md) and [spec.md](../spec.md) (accepted) · Status: **accepted** (accepted 2026-10-27 by Nnaemeka Chukwuma; proposal A merged in PR #17, proposals B, C, D implemented)
Originator: Victor Oyeleke (interface), through the proposals · Implementer: Nnaemeka Chukwuma · Contract sign-off: Isaac Bassey and Nnaemeka Chukwuma · Source of truth: the repository
Decisions in force: this change's [WORKLOG.md](WORKLOG.md) D1-D3 · Supporting skills: none

## Problem
The web screens were built on contract v0.1.0 and work around three gaps:
- **Customer creation isn't retry-safe.** A dropped connection during "Add customer" leaves the assistant unsure whether the customer exists. Retrying may create a duplicate, so the screen refuses to retry automatically.
- **Customer search and order are unspecified.** There's no "as of" time for the balances on the list.
- **Money limits and lookups:** money values have no upper bound the browser can represent exactly, the category picker has to page through every product, and there's no `active` filter.

## Proposed outcome
Contract v0.2.0 adds, without changing anything the web already relies on:
- **A:** an optional `Idempotency-Key` on `POST /customers`. The same key and body return the original 201; the same key with a different body, or from another user, returns 422 `IDEMPOTENCY_KEY_REUSED`.
- **B:** a specified customer search and stable order, `asOf` on `CustomerPage`, duplicate names explicitly allowed, and the validation rules documented.
- **C:** money bounded to 0..9007199254740991 kobo.
- **D:** `GET /product-categories`, and an optional `active` filter on `GET /products`.

## Affected users and systems
- **Users:** the assistant and the owner adding customers on a weak connection.
- **Systems:** `contract/openapi.yaml`, the service (`customer`, `product`, `common`), the database (new migration V4), and the web's generated types (`web/src/api/schema.d.ts`).

## Constraints
- **Additive only:** the v0.1.0 web must keep working unchanged. So the new header is optional, and new fields are optional in requests.
- **Database rules:** applied migrations V1-V3 are frozen, and V4 ships with its undo script U4. Rules live in the database, and each has a test that fails when the rule is removed.
- **Sign-off:** contract changes need a dated `decisions.md` §3 line naming two engineers.
- **Timing:** the deadline is the Mon 26 Oct checkpoint (MVP-ready, D1).

## Out of scope
Proposals **E-H** (`expectedUnitPriceKobo` and `PRODUCT_CHANGED`, sale settlement with store credit, sale quotes, submission lookup) are a later change after Monday (D1). Customer edit, archive and delete are also out of scope.

## Success criteria
- `POST /customers` sent twice with the same key and body creates exactly one customer, and both calls return the same body, in sequence and in parallel. A different body, or another user, gets 422 and no new row.
- Without the header, behaviour is unchanged from v0.1.0.
- `redocly lint` is clean, `./mvnw verify` is green, the web `typecheck` and tests pass with regenerated types, and `MigrationRollbackIT` passes with V4/U4.

## Open questions
- Proposal B: the Unicode normalisation rule for search, and whether `asOf` must be consistent across pages. UNRESOLVED (owners: Isaac Bassey, Victor Oyeleke).
- Proposal A: how long idempotency keys are retained. v0.2.0 proposes "kept for the life of the customer row", to confirm. UNRESOLVED (owner: Isaac Bassey).

## Measurement
- **Leading:** the number of proposals A-D merged before the checkpoint.
- **Lagging:** the web removes its "don't retry customer creation" workaround after adopting the header.
