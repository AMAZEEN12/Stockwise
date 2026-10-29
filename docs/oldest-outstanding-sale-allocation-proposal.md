# Proposal: apply repayments to the oldest outstanding credit sale

**Status:** Draft for review; not an implemented or approved contract.  
**Requested by:** Victor Oyeleke. **Prepared by:** Codex, 2026-10-29.  
**Review requested from:** Nnaemeka Chukwuma (data and rules) and Isaac Bassey (API and access). Existing team review and high-risk-code gates apply.

## Problem and proposed rule

A credit sale and a customer ledger entry identify the customer by UUID, but the current schema does not record how a customer's repayment is divided between individual sales. A customer's total outstanding balance alone cannot tell us how much of a particular sale was repaid when that sale is reversed.

Propose applying each repayment to that customer's eligible outstanding credit sales in ascending `(created_at, id)` order, using the UUID as a deterministic tie-breaker. Settle each sale's remaining debt before moving to the next. Allocation amounts are positive integer kobo, never exceed either the repayment amount or the sale's remaining eligible debt, and sum to the accepted repayment. A fully settled or already reversed sale is not outstanding. The due date does not change this order. Two customers with the same display name remain distinct: use their UUIDs, never their names.

## Example

| Event | Sale A (older) outstanding | Sale B outstanding | Customer debt | Store credit |
|---|---:|---:|---:|---:|
| Credit sale A, ₦10,000 | ₦10,000 | — | ₦10,000 | ₦0 |
| Credit sale B, ₦5,000 | ₦10,000 | ₦5,000 | ₦15,000 | ₦0 |
| Repay ₦6,000, allocated to A | ₦4,000 | ₦5,000 | ₦9,000 | ₦0 |
| Reverse A | reversed | ₦5,000 | ₦5,000 | ₦6,000 |

The reversal restores A's stock; removes only A's outstanding ₦4,000 debt; and credits the ₦6,000 repaid against A as store credit. Sale B remains owed. This preserves the customer's net position and does not automatically net B's debt against store credit. In the single-sale R12 example, a later ₦4,000 purchase using ₦6,000 store credit leaves ₦2,000, subject to agreed settlement behavior.

## Proposed records and atomicity

- Record immutable repayment-to-sale allocation entries with customer, repayment, sale, positive kobo amount and audit identity; any correction is another linked entry, not an update or deletion of ledger or allocation history. Exact schema, constraints and new Flyway version are for the data owner to approve.
- Persist the original sale's actual debt and any store credit used at checkout so the reversal accounts for the settlement actually recorded. The current service does not yet implement store-credit draw. Do not infer a debt from the sale total when another tender paid part of it.
- Accept a repayment only if the guarded customer balance and allocation total agree. Serialize conflicting operations for one customer in the database, and use guarded writes and a consistent lock order so concurrent repayments, sales and reversals cannot overallocate, overspend or create a negative balance. A failure rolls back the repayment, allocations, balances and ledger entries together. Preserve the required idempotency key and original request on retries.
- For a sale reversal, use the sale-specific `POST /sales/{saleId}/reversal` route expected by PR #31. In one transaction enforce one reversal per sale, restore product stock, append reversing stock movements, reduce the debt still allocated to that sale, create the appropriate store credit for amounts already paid, and append customer ledger and reversal records. An identical retry returns its original outcome without applying effects twice. OWNER and ADMIN access follows DM10; assistant authorization codes remain a separate unapproved proposal.
- Preserve the R10 reconciliation: the current debt equals its ledger history and the sum of outstanding eligible sale debts, except for explicitly identified opening or legacy balances with a documented representation. Store credit reconciles independently. Use integer kobo throughout.

## Decisions required before implementation

1. **Repayment reversal after sale reversal:** decide whether to reject it, compensate with a new debt or recover the issued store credit, especially if that credit has already been spent. Do not silently rewrite allocations or make store credit negative.
2. **Existing data and opening balances:** agree whether sufficiently complete historical records can be deterministically replayed into allocations; reconcile totals first. Where they cannot, choose an explicit opening-balance or manual-review policy instead of inventing allocations.
3. **Settlement splits and other adjustments:** agree how to restore store credit originally used for a reversed sale, how refunds or other adjustments interact with allocation, and how the ledger distinguishes debt and credit activity. Do not assume PR #30's simulated settlement fields are an approved service contract.
4. **Ordering and API contract:** confirm `(created_at, id)` rather than due date, response and error details, and how both sale and repayment history expose allocations. Reconcile PR #31's route and idempotency behavior with the authoritative OpenAPI before implementing; its frontend/mock does not establish service behavior or approval.
5. **Migration and delivery:** select the next unused migration version after prerequisite branches merge, include its matching undo script and up/down/up test, and agree how existing seeded data is handled. `feat/restocks` separately proposes V5; do not assume that version is available.

## Acceptance tests for the implementation PR

- Partial and full repayment across multiple sales follows the proposed order, including equal timestamps, and allocations sum to the repayment without crossing customers.
- The table above and the single-sale ₦10,000 / ₦6,000 R12 case produce the expected stock, debt, store credit and append-only history. A later ₦4,000 purchase leaves ₦2,000 credit.
- Concurrent repayments, a repayment racing a reversal, parallel reversal attempts, and concurrent store-credit spending retain correct totals; rejected or failed transactions leave no partial effects. Test idempotent replays and conflicting reuse of keys.
- Cover a paid sale, a wholly unpaid or fully repaid credit sale, a sale paid partly with store credit, multiple products, overflow, history and ledger reconciliation, and the approved policy for repayment reversal and existing balances.
- Demonstrate each database guard's test fails when the guard is removed; record evidence in `docs/rule-removal-log.md`. Run service verification with PostgreSQL Testcontainers, migration up/down/up checks, contract lint, web checks and applicable browser tests. Record actual results rather than treating the simulation as backend evidence.

This document proposes behavior; it does not change the OpenAPI contract or authorize an endpoint, migration, role change, or production rollout. Record two-engineer agreement in the contract log before implementing wire changes.
