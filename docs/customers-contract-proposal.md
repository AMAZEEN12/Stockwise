# Customers contract alignment proposals

2026-10-25. Proposed by Codex under Victor Oyeleke's UI implementation request; logged by Codex. Pending Isaac Bassey and Nnaemeka Chukwuma; no API approval is implied.

## Existing contract used now

Current-state correction, 2026-10-26 (DM63-DM64; logged by Codex): v0.2.0 proposal A is merged in PR #17 and signed by Nnaemeka Chukwuma/Isaac Bassey in decisions.md section 3. POST /customers supports optional Idempotency-Key with 422 on reuse mismatch. The implementation description below is historical for the original UI; its current frontend still omits the optional header, so retain uncertain-create guards and do not add automatic retries under this catalogue task.

Independent activity proposal, approved as UI scope by Victor Oyeleke on 2026-10-26 (DM63), logged by Codex: retain balanceKobo/storeCreditKobo and add server-owned hasDebtActivity/hasStoreCreditActivity. New unused balances show dashes; each becomes a formatted amount after its own relevant transaction/adjustment and stays numeric after returning to zero. Paid sales alone do not activate either flag. Derive history authoritatively, including seeded/reversed/fully repaid cases; do not infer unused from zero or createdAt. Do not automatically offset debt/store credit. Fields require Isaac Bassey/Nnaemeka Chukwuma agreement, tests and generated types before wiring the UI; Victor's UI approval is not their API sign-off.

`GET /customers?q=&page=&size=`: any authenticated role, zero-based pages, size 1..100, q up to 100 characters. Response CustomerPage contains items/page/size/totalItems. `POST /customers`: OWNER/ASSISTANT, no Idempotency-Key semantics, returns 201 Customer or 400/401/403 Problem. Request: displayName required (1..120), contactPlaceholder optional (max 60), no extra properties. Contact is fictional text, not a validated real telephone number. Blank contact is omitted, names are trimmed and whitespace-only names rejected consistently with the existing database constraint. Response money stays integer kobo; unsafe values are not formatted as trustworthy amounts.

No customer detail, ledger, repayment, edit, archive or delete API is added/called in this phase. Existing endpoints are sufficient for the supplied list/create/select flows. Keep active OpenAPI and generated types unchanged until two-engineer sign-off.

## Proposed clarifications and extensions

| Item | Proposed contract | Current UI boundary |
|---|---|---|
| Retry-safe creation | Add UUID Idempotency-Key to POST /customers. Scope to original user; hash normalized immutable request; same key/body returns original 201 Customer; changed body returns 422 IDEMPOTENCY_KEY_REUSED; document retention and concurrent processing. Persist the original key/body; do not treat expired keys as new creates. | No unsupported header semantics assumed. Single POST; uncertain outcome requires checking, not blind retry. X-Request-Id is tracing only. |
| Search and ordering | q is trimmed case-insensitive display-name substring, empty means all; specify Unicode normalization and stable default order with UUID tie-breaker. Preserve existing insertion/display order until owners choose an order; no uncontracted sort parameter. | Load complete contract pages, then filter names case-insensitively. Search changes never silently select a different UUID. |
| Snapshot freshness | Add CustomerPage.asOf as UTC date-time, ideally consistent across pages/snapshot token. It represents when balances were read, not customer.createdAt. | “as of … WAT” uses last successful client retrieval and accessible explanation. No hard-coded 09:41, no fabricated server timestamp. |
| Duplicate identities | Explicitly permit duplicate display names and contacts; UUID is identity. No 409 duplicate-name rule without an agreed policy/migration. Consider returned contact as disambiguation. | Distinct rows/selection by UUID; never merge customers because names match. |
| Validation/errors | Document trim/nonblank and 120/60 Unicode code-point lengths; preserve Problem.errors field names displayName/contactPlaceholder. Specify whether 5xx means transaction rollback, rather than making an unproven guarantee. Request IDs remain actual UUIDs, not design fixture strings. | Field errors retain input. Unknown outcomes say not confirmed; definitive 400 can say nothing was added. |
| Money range | Adopt the earlier safe integer proposal (0..9007199254740991 kobo including totals), or agree lossless int64 decoding throughout. | Reuse integer money helpers and refuse unsafe values. No balance editing. |

The earlier Sales settlement/quote/recovery proposals remain pending. Selecting a customer with store credit does not authorize unsupported real settlement writes. Product scope, historical two-engineer sign-off and backend/database business rules are unchanged.
