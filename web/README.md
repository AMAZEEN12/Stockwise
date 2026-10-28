# Stockwise web

Home/authentication, Products, New sale/Receipt, Customer Picker and Customers, built from the supplied desktop/mobile references. Customer Picker is committed on `feat/customer-picker`; `feat/customers-ui` builds the directory on that foundation. React 19, strict TypeScript, Vite, React Router Data Mode, Tailwind v4, Axios-backed RTK Query and Formik/Yup.

## Run locally

Shared-component alignment (DM55) is implemented on `feat/shared-component-alignment`. Read the root AGENTS.md and [shared component adaptations](../docs/shared-component-alignment.md) before UI work. The shared set supplies states, filters, controls, dialogs, notifications, cards and badges; Stockwise token values remain authoritative. Additive APIs are approved locally by Victor Oyeleke and documented for shared-owner review.

Node 24 is the verified runtime. From this folder:

```powershell
npm ci
npm run dev
```

Open the printed local URL. Public Home/sign-in/sign-up work without a service. Default API URL is `http://127.0.0.1:4710`. In a second terminal, start the development simulation:

```powershell
npm run mock
```

Copy `.env.example` to `.env.local` and restart Vite after changing environment values. Use **owner@stockwise.test / Stockwise-Demo-2026**, or select a demo account then Sign in. Owner lands on Products, Assistant on Sell, Admin on Sales History. The simulation accepts valid login shapes, not real passwords, and maps configured demo emails to separate role-bound sessions. `npm run mock -- --role=ASSISTANT` or `--role=ADMIN` explicitly forces a test role. These are simulated roles, not security evidence.

The simulation keeps fictional products, customers and sales in memory and returns eight-hour sessions. Restart resets its records. It implements only existing OpenAPI paths and is excluded from the browser bundle. Never use it as database/concurrency or credential-verification evidence. Original Prism mode remains `npm run mock:prism`, with ignored generated fixtures prepared by `npm run mock:prepare`; use one mode at a time. A real service uses its `/api/v1` base URL and backend-supplied credentials. VITE variables are public. Demo buttons only fill fields.

## Verification

```powershell
npm run generate:api
npm run lint:contract
npm run lint
npm run typecheck
npm test -- --run
npm run build
npx playwright install chromium
npx playwright test
```

With dev server and simulation running, `npm run check:mock` checks actual HTTP/browser authentication without interception. `npm run check:shop` checks product persistence, sale replay, changed-body refusal and simulated credit allocation; `npm run check:shop:browser` checks the actual sign-in → add product → catalogue → sale → receipt journey. These checks add fictional test records. Prism remains development-only with the previously recorded transitive audit advisories; see the implementation document for that audit's date and limits.

Use `npx playwright test --workers=1` on this Windows machine; tests start a server if none is running. Captures under ignored `test-results/` use 1440×900 desktop and 360×880 auth / 360×1000 sales at 2×. Run `node scripts/compare-designs.mjs` after the Sales captures to measure differences against the newest local references. It writes ignored `.mock/design-comparison.json`; this reports differences, not visual approval. Reference PNGs remain local in ignored `Screens/`. Protected routes include `/app/products`, `/app/products/new`, `/app/sell`, `/app/receipts/:saleId`; `/workspace` now redirects to the service-confirmed role landing without rendering an intermediate screen. Static hosting needs SPA fallback for deep links.

For an isolated, warmed QA server, run `npm run check:ui`. It owns port 5186 by default (override with PLAYWRIGHT_PORT), compiles the UI modules/fonts before timed tests, preserves all existing timeouts/assertions, refuses an occupied port, and stops its server afterwards. On this machine the long picker capture/axe flow also passed with `$env:PLAYWRIGHT_CHANNEL='chromium'` (full Chromium). Freeze input files during browser runs: editing this README while Vite watches it can refresh an open dialog. Keep expensive builds separate from browser QA.

Customer reference comparison accepts capture folders in priority order, for example `node scripts/compare-customer-designs.mjs test-results-chromium-final test-results`. This allows a fresh targeted capture to override its earlier full-run state without discarding the other states or treating differences as approval.

## Integration limits

Sign-in and `/me` use generated types from the merged v0.1.0 contract. That contract's upstream two-engineer sign-off is still recorded pending. Backend auth and demo seeds are not implemented in the merged database foundation; intercepted browser tests do not claim a working deployed service.

Registration validates the three reference fields, then clearly reports unavailable; it makes no unapproved network request. Proposed wire behavior is in [auth-contract-proposal.md](../docs/auth-contract-proposal.md). The coin is reconstructed SVG because original artwork was not supplied, so exact artwork equivalence is not claimed.

Current sale requests follow v0.1.0 exactly. Real submissions involving store credit are blocked until settlement fields are agreed; the corrected credit demonstration is explicitly simulated. Price checks before confirmation cannot enforce a price against a concurrent server update without the proposed contract guard. Pending submissions are stored by user and service connection in tab storage before sending and survive refresh/reauthentication. A transport retry reuses the original key/body; do not erase an unresolved submission to start another. History/edit/archive screens are deferred. See [products/sales implementation](../docs/products-sales-ui.md) and [contract proposals](../docs/products-sales-contract-proposal.md).

See [implementation and provenance](../docs/auth-ui-implementation.md), [architecture](../docs/frontend-architecture.md), [decisions](../decisions.md), and [actual verification output](../sdlc/WORKLOG.md).

## Customer Picker and Customers

Open `/app/customers` from the shop navigation to search balances and add a fictional customer. OWNER and ASSISTANT can create; ADMIN reads only. On a credit sale, Choose customer opens the desktop dialog/mobile sheet; select by UUID or Save and select a new customer, then Back to sale. Selection does not record a sale. The selected-customer message intentionally preserves Victor's requested reference text. Customer ledger, repayments and editing remain deferred.

Names are required (up to 120 Unicode characters); fictional contact notes are optional (up to 60). The same resource cache/form serves both screens. “as of … WAT” is the last successful client retrieval, not a server computation time. No fixed reference timestamp or fabricated balance is shown. Current contract pages are loaded completely before local name filtering; server ordering is retained.

Customer creation is not idempotent in the active contract. One POST is sent; uncertain outcomes survive refresh in tab storage and require checking the list. Do not assume an identical name proves the original request succeeded. The explicit acknowledgement before a replacement attempt explains duplicate risk. The pending [customer contract proposal](../docs/customers-contract-proposal.md) covers safe creation retries, ordering/search and authoritative freshness. No unsupported endpoint is called.

Run `npm run check:customers` for a self-contained, unintercepted browser/API journey. It owns temporary simulation/Vite processes on 4711/5185, adds only fictional records and stops them afterwards. `DEVELOPMENT_API_PORT` overrides the usual 4710 for isolated local checks. This is simulation evidence, not deployed backend proof.

After switching branches or changing Vite plugins/environment, restart your dev and mock servers. For tests alongside an existing preview, use `$env:PLAYWRIGHT_PORT='5184'; npx playwright test --workers=1`. Customer captures use 1440x900 and 360x1000 at 2x. After a complete browser run, `node scripts/compare-customer-designs.mjs` compares all 36 frames and writes the ignored `.mock/customer-design-comparison.json`; measurements are not automatic visual approval. See [implementation and limits](../docs/customers-ui.md).

## Sales History

`/app/sales` uses the existing listSales contract, Today/Yesterday/Last 7 days in Africa/Lagos, and full customer/staff IDs. Rows remain non-interactive. `npm run check:sales-history` runs an isolated, unintercepted local simulation journey on ports 4712/5187 and cleans up its own servers. It is not backend authentication/concurrency evidence. `node scripts/compare-sales-history-designs.mjs <capture-folder>` measures the 12 ignored supplied frames. See ../docs/sales-history-ui.md for explicit UI differences and pending API proposals.

`npm run check:roles` owns ports 4713/4714/5189 for an unintercepted simulation/browser check of all three explicit-login landings, separate sessions, simulated permissions/replay and the CLI role override. See ../docs/auth-role-landing.md (DM60-DM61).
