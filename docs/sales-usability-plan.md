# Stockwise sales usability

Approved implementation scope: Victor Oyeleke, 2026-10-26 (DM63). Technical choices/log: Codex (DM64). Stockwise only. Start each feature from latest merged main; commit, push and open its PR, then obtain required human review/merge before beginning the next dependent branch. Review gates in REVIEW.md remain.

| Order | Branch | Required feature commit | State |
|---|---|---|---|
| 1 | feat/sale-product-catalog | feat(sales): show searchable product catalogue | Merged in PR #21; follow-up drawer/docs merged in PR #22 |
| 2 | feat/customer-credit-balances | feat(customers): distinguish debt and store credit | Await agreed independent activity fields |
| 3 | fix/credit-customer-picker-responsive | fix(sales): keep credit customer picker within viewport | Completed by DM65 and merged in PR #22; removed from the remaining sequence |
| 4 | fix/sale-quantity-controls | fix(sales): align quantity controls horizontally | Superseded/nullified as a remaining task; DM66 UI merged in PR #23 |
| 5 | fix/mobile-coin-visibility | fix(ui): show coin control on mobile | Implemented in 7035c3a; PR #24 open for human review |
| Deferred | feat/product-popularity-sort | Agree after scope approval | No popularity implementation |

## Approved choices

- Debt is money owed by the customer; store credit is value held by the shop for that customer. Keep them separate; do not net them automatically. Applying store credit to a future purchase is a separate settlement rule, not repayment of existing debt.
- Track each balance's activity independently. Unused balances show a dash; after relevant activity, display the amount, including zero through the shared formatter (currently two decimals). A paid sale alone does not activate either history. Retain balanceKobo/storeCreditKobo; propose hasDebtActivity/hasStoreCreditActivity derived authoritatively from financial history. Amounts alone cannot establish activity. See customers-contract-proposal.md; no other engineer's approval is inferred.
- Item 2 is implemented as a review draft on `feat/customer-credit-balances`: required response flags, ledger-derived service values, generated types, simulation, directory and picker presentation. Keep the PR in draft until Isaac Bassey and Nnaemeka Chukwuma approve the contract and derivation in `decisions.md` section 3 (DM68).
- Preserve the DM65 desktop right drawer and compact centered mobile modal, customer search/create/select, focus return and busy/uncertain-save safeguards. Bound the visible viewport and scroll results internally. Credit already requires customerId when paymentType is CREDIT in the contract, service and database.
- Align decrement/input/increment horizontally with equal 44px minimum targets. Minus stops at one; stock-conflict recovery may still produce zero rows, which remain visible and block confirmation until corrected/removed. Preserve the 10,000 cap, fresh-stock checks and typed invalid-value feedback.
- DM66 places each selected product and its controls in a selected row inside the catalogue. Selected rows stay above search results so filtering and prefix pagination cannot hide the cart. Remove the separate cart cards and only the sale-page empty-cart prompt; retain genuine empty-catalogue/no-result states and the Products page Add product action. Refresh belongs at the heading's top right, and the results list may use more viewport height while keeping the mobile total reachable.
- The homepage coin is decorative, aria-hidden and desktop-only in the original notes. Mobile visibility intentionally supersedes that restriction; preserve reduced motion/desktop behaviour and give it non-overlapping mobile space. Do not invent an action or balance for it.
- Defer popularity until audience, period, reversal/cancellation treatment, ties and products without sales have agreed semantics.

## Item 1: default product catalogue

Requirements R1-R3, R15-R17 and phone accessibility apply. Show products immediately with existing name/reference search. Use only GET /products?q=&page=0&size=20. The service already orders by lower(name), id; the client sorts each displayed prefix too. Explicit server ordering, including Unicode/collation semantics, remains an API-owner proposal. No endpoint/schema change here.

Load 20 source rows initially. Skip archived-only pages until a visible batch or the end; do not mistake them for an empty catalogue. Load more re-reads the prefix to avoid mixing stale prices/stock with newer pages. This costs repeated reads for large catalogues and is not an atomic database snapshot. Changed totals, repeated IDs, empty gaps and unsafe selectable amounts produce retryable errors. The existing active-filter proposal D could reduce archived-page reads after agreement.

Hide archived products; show active zero-stock products disabled. Distinguish loading, read error/retry, empty catalogue and no search results. After a failed refresh/Load more, retain old rows with stale wording and disable adding them. Never show old-search rows under a new query. Search changes reset pagination; clearing/adding restores the default catalogue. Bound internal list scrolling to keep the cart reachable on mobile, with visible keyboard focus. Cap search at the existing 100-character limit.

Reuse shared FilterBar/Button/EmptyState/LoadingState/StatusPanel and Stockwise tokens. Leave money/stock rules, quantity behaviour, customer presentation and coin styling to their appropriate scopes. New catalogue space intentionally changes the formerly blank area; no reference-perfect approval is claimed. Simulation ordering matches the service for demonstration names, without claiming backend/concurrency evidence.

## Verification and handoff

Run contract lint, service verify, frontend lint/typecheck/unit tests/build and desktop/mobile browser regression. Coverage: immediate alphabetical products, archives/zero stock, name/reference search/reset, paging, archived-only pages, query isolation, error/stale retry, keyboard/touch/layout bounds and existing sale safety. Later fix branches add the failing regression first and do not change it after the fix.

Record actual results and limits in WORKLOG before publication. Preserve the pre-existing app.css import-order edit separately and disclose combined-tree verification. Update decisions/worklog and relevant implementation/proposal Markdown with separate Decided by/Logged by attribution. Regenerate types only for approved contract edits. Publish actual commit/PR links, retaining human review gates and API-owner agreement.
