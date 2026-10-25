# Sales History implementation

Date: 2026-10-25. Scope approved by Victor Oyeleke; logged by Codex. Decisions DM57-DM58.

Implement on `feat/sales-history`, based on committed shared-component alignment `08be4be`. This branch inherits the existing customer/shared-component features; publication and merging are separate tasks. Use the 12 ignored `web/Screens/sales history/` exports (six states each at 1440x900 desktop and 360x1000 mobile, exported at 2x), plus the root token sheet.

Victor selected Today, Yesterday and Last 7 days, using Africa/Lagos calendar boundaries. Last 7 days includes today and the preceding six dates; show dates beside times in that range. History entries remain non-interactive; no receipt round trip is added. The existing receipt action stays disabled with updated explanatory copy because history is now reachable from the menu.

Victor confirmed retaining the current ID-only contract after the name-snapshot proposal was explained. Display full customer/staff IDs, explicitly label them, and preserve server references. No name snapshots, staff lookup endpoint, new reference format or schema changes are introduced. Paid sales without a customer say Paid in full; a paid sale with a customer retains that customer's ID. CREDIT describes the original sale type, not today's unpaid balance. Totals are the recorded integer-kobo line sums, not an inferred remaining debt or settlement.

Shared Select/FormField, Button, Card, StatusBadge, Skeleton, EmptyState, ErrorState and root ToastProvider compose the screen. The existing FilterBar requires search, which is absent from these designs; compose its existing control primitives without inventing a search input. A visible date label, IDs, date disambiguation, an explanatory note, Load more, and the existing demonstration/account controls are disclosed differences from static frames. Only the history route omits the mobile avatar to match the supplied header. Other routes retain it. No new artwork or dependency is needed.

Use existing `GET /sales` with `from`, `to`, optional `paymentType`, zero-based `page` and `size=20`. Query/request aliases derive from generated operations; response aliases derive from generated schemas. One RTK Query resource/cache uses existing Sales invalidation. Each Load more request re-reads the displayed prefix; reject malformed money, duplicate IDs or changing totals across pages rather than reporting inconsistent success. This costs repeated reads and does not provide an atomic snapshot. Preserve old rows during fetching/failure, distinguish refresh failure from initial failure, and retain the last successful retrieval time as client-only cache metadata alongside those rows. This timestamp is never read from or written to the API wire. Refresh also recomputes the selected Lagos day range after midnight. No automatic polling or write occurs.

The first successful response establishes a baseline without a success toast. A later successful response with a newer, previously unseen first sale may highlight that confirmed row and say it is at the top; pagination, empty/error responses and filter changes do not invent recording success. The highlight and informational success toast last five seconds. Read-only actions require no confirmation dialog.

The in-memory development simulation implements the existing list endpoint with Lagos dates, payment/customer filters, deterministic sorting and pagination; records remain explicitly simulated. No backend concurrency/authentication evidence is inferred from it.

## Pending contract clarifications

These are proposals for API-owner review, not active contract edits or two-engineer approval:

- Define deterministic newest-first ties, proposed `createdAt DESC, id DESC`, and stable pagination/snapshot semantics while other devices create sales. Current offset pages may shift between requests; the UI cannot promise an atomic history snapshot.
- Define empty/reversed date-range validation and whether Last 7 days should exclude future timestamps within today's date. Current interface uses inclusive Lagos dates from the existing contract.
- Define `totalKobo` explicitly as gross recorded line total; authoritative credit/settlement fields remain the separate existing proposal in [products/sales contract notes](products-sales-contract-proposal.md). No subtraction is guessed in history.
- Define server `asOf`/snapshot timestamp if authoritative freshness is required. The existing UI timestamp means last successful client retrieval only.
- Customer/staff name snapshots were discussed and deferred by Victor in favor of the existing IDs. They are not required to implement this chosen scope.

Human visual review remains required. Exact names/references/freshness in design fixtures are not fabricated in real responses. Verification and measured image differences will be recorded after checks.

## Verified results, 2026-10-25

- Final ESLint: exit 0, zero warnings. Strict TypeScript: exit 0. Unit tests: 9 files / 23 passed (13.99s).
- Contract lint: valid, 220ms; active OpenAPI and generated types are unchanged. Service `mvnw.cmd verify`: cannot start because JAVA_HOME is not defined correctly. No backend pass is claimed.
- Full regression: 74/74 passed in one run (8.9m). After the narrow client-timestamp correction, all 18 focused history scenarios passed again (1.8m), including explicit timestamp retention after a failed next page. Original existing tests/assertions/timeouts were unchanged.
- Successful captured states have zero serious/critical axe findings. ADMIN read access, expired-session copy, 320/360/768/1024/1440 widths, Lagos midnight refresh, filters, unsafe/duplicate records, retained rows, retry, transient highlight and toast expiry passed. No manual screen-reader sign-off is claimed.
- `npm run check:sales-history`: PASS with actual isolated simulation servers and no route interception. Paid/credit creation, same-key replay, list/filter/invalid-date/pagination responses, integer money, ID-only fields, browser login/menu/history, keyboard payment filter/Refresh/date selection passed. This verifies the simulation and interface, not deployed authentication, database rules or concurrency. Owned ports 4712/5187/5188 were released; user previews were preserved.
- Final production build: 2299 modules, 22.04s; history JS 7.32 kB/gzip 2.79 kB, CSS 4.20 kB/gzip 1.16 kB. Existing main-chunk warning remains: 555.73 kB/gzip 182.85 kB. No dependency installation, active contract change, backend edit or tracked design image was introduced.

All 12 supplied states were measured at their exact logical viewports and 2x exports using `compare-sales-history-designs.mjs`. It samples each logical pixel and counts a change when any RGB channel differs by more than 24; it is a diagnostic comparison, not a perceptual score or approval gate. Full IDs, canonical server references, visible labels, genuine freshness, mock values, shared icons, loading spacing and account/demo controls explain measured differences. Remaining visual differences are disclosed for human review; no pixel-perfect claim is made.

| Viewport | State | Changed pixels |
|---|---|---|
| desktop | list | 3.72% |
| desktop | credit | 2.84% |
| desktop | loading | 7.50% |
| desktop | error | 2.21% |
| desktop | empty | 2.06% |
| desktop | success | 4.62% |
| mobile | list | 11.17% |
| mobile | credit | 8.15% |
| mobile | loading | 11.07% |
| mobile | error | 6.38% |
| mobile | empty | 5.79% |
| mobile | success | 11.95% |

Reports/captures stay in ignored local QA folders; all 110 local design PNGs remain untracked. Scope approved by Victor Oyeleke; technical choices and validation logged by Codex. Human code-owner review and applicable sale/store-credit sign-off remain required before merging. No new PR, merge or deployment was requested/performed for this feature.

Publication follow-up (2026-10-25, DM59): Victor subsequently requested publication. Feature 761c5c2 and formatting/publication d45a5ec were pushed before opening [PR #10](https://github.com/AMAZEEN12/Stockwise/pull/10) into main. The three supplied CSS edits are formatting-only by normalized PostCSS AST comparison; original behavior/QA evidence is retained. Human review is next. No merge/deployment was performed. Decided by Victor Oyeleke; logged by Codex.
