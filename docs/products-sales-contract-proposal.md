# Products and sales: implementation boundary and proposed contract

Date: 2026-10-24. Scope decided by Victor Oyeleke; proposals by Codex; logged by Codex. API proposals are **pending Isaac Bassey and Nnaemeka Chukwuma**, not approved changes to OpenAPI.

## Implemented contract boundary

Use v0.1.0 GET/POST /products, GET /products/{productId}, GET /customers, POST /sales and GET /sales/{saleId}. Use generated models, integer kobo, UUID request IDs and one unchanged submission key/body across an uncertain write. No registration, category, quote, status-lookup, edit, archive or history endpoint is invented.

Product category is a free-text string in the current contract. Use a combobox backed by all catalogue pages, permitting a new category. All catalogue filters include inactive rows when the server returns them; stockState=ARCHIVED selects archived rows. Sale search filters inactive products locally and does not let them enter the cart. Archive/edit controls are deferred.

The store-credit reference is corrected to 615000 subtotal - 600000 credit = 15000 remaining kobo. DM5 remains the business rule. In development simulation the credit allocation is explicitly simulated. Real credit-bearing submissions are blocked until the API returns an authoritative allocation. Ordinary paid/credit sales use exactly SaleCreate. Preview prices are estimates until the server returns Sale; preflight reads cannot prevent a later price race.

## Proposed additions (do not call yet)

| Addition | Proposed behavior |
|---|---|
| GET /product-categories | Complete sorted category options, separate from paginated product results; category creation policy to be agreed. Current combobox remains usable. |
| GET /products active filter | Optional boolean active, omit for all. Specify All/ARCHIVED semantics and deterministic ordering; avoid unsupported query parameters today. |
| SaleLineCreate.expectedUnitPriceKobo | Required confirmed price, checked atomically with stock/active predicates; mismatch returns 409 PRODUCT_CHANGED before any write. Merely re-reading a product is insufficient. |
| Structured stock/price conflicts | Problem.conflicts: [{productId, availableQuantity, currentUnitPriceKobo, active}]. Keep errors for field validation. Today re-fetch product details after 409 rather than parse prose. |
| Sale settlement | Return subtotalKobo (gross), storeCreditAppliedKobo, amountDueKobo, storeCreditRemainingKobo and customer display-name snapshot. Credit applied = min(available credit, subtotal), enforced atomically in the service/database. Keep totalKobo semantics explicit. |
| POST /sale-quotes | Same selected lines/customer/payment type; returns current lines, settlement and expiry/quote ID; confirmation references the quote and rejects stale prices/credit. UI adapter keeps existing confirmation layout. |
| GET /sale-submissions/{idempotencyKey} | Authenticated original user's lookup: 200 RECORDED with Sale; 202 PROCESSING; 404 unknown. A missing result does not authorize a new key; retry original body/key. Specify retention and ownership; never silently replay expired keys as new sales. |
| Safe money range | Bound every money request/response to 0..9007199254740991 integer kobo, with line and order sums inside the bound. Alternatively agree lossless int64 decoding end to end. Current client refuses unsafe values; decimal input is parsed with BigInt and never rounded. |

## Client recovery proposal used for the demonstration

Persist one pending snapshot (key, immutable body, user ID, service base URL, cart display data, createdAt) in tab sessionStorage **before** sending. If storage is unavailable, block the recording action and explain recovery is unavailable. Never store credentials in this snapshot. Preserve pending data on timeout, network loss, refresh or session expiry. Explicit retry only after reauthentication as the same user and connection; never retry as another account/service. Role is checked again through /me before sending. One bounded automatic retry on transport failure, then explicit retry. Unsubmitted cart drafts are also stored by user in the tab, and restored without automatically sending anything. No background offline queue.

Without a lookup endpoint, Check and retry replays the original POST, which is already idempotent. The UI says this explicitly rather than promising a preliminary lookup. Local discard cannot reverse a recorded sale; keep an unresolved submission until it receives a definitive response. A definitive 409 permits editing and a new confirmed attempt/key. 422 key mismatch does not trigger automatic resubmission. Never send zero-quantity conflict rows.

Product POST is non-idempotent in v0.1.0: do not automatically retry an uncertain create. Retain the form, explain uncertainty and let the user check the catalogue/reference first.

## Outstanding design decisions

New sale and Receipt are in scope; Sales history design is deferred by Victor. View in Sales remains visibly unavailable with an explanation until that destination exists. New bordered quantity controls from the updated frames take precedence across cart states. The 9,999,999-unit money-limit example is illustrative and exceeds the actual 10,000-unit contract limit; the UI enforces the contract. Pending-decision annotation badges are design notes, not production controls.
