# Stockwise web

Home/authentication, Products and New sale/Receipt, built from the supplied desktop/mobile references. Feature branches: `feat/products-ui` and stacked `feat/sales-ui`, based on the authentication foundation. React 19, strict TypeScript, Vite, React Router Data Mode, Tailwind v4, Axios-backed RTK Query and Formik/Yup.

## Run locally

Node 24 is the verified runtime. From this folder:

```powershell
npm ci
npm run dev
```

Open the printed local URL. Public Home/sign-in/sign-up work without a service. Default API URL is `http://127.0.0.1:4710`. In a second terminal, start the development simulation:

```powershell
npm run mock
```

Copy `.env.example` to `.env.local` and restart Vite after changing environment values. Use **owner@stockwise.demo / stockwise-demo**, or select Owner then Sign in, then Open your shop. The simulation accepts valid login shapes, not real passwords. It defaults to OWNER; restart with `npm run mock -- --role=ASSISTANT` or `--role=ADMIN` to exercise role-specific UI. These are simulated roles, not security evidence.

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

Use `npx playwright test --workers=1` on this Windows machine; tests start a server if none is running. Captures under ignored `test-results/` use 1440×900 desktop and 360×880 auth / 360×1000 sales at 2×. Run `node scripts/compare-designs.mjs` after the Sales captures to measure differences against the newest local references. It writes ignored `.mock/design-comparison.json`; this reports differences, not visual approval. Reference PNGs remain local in ignored `Screens/`. Protected routes include `/app/products`, `/app/products/new`, `/app/sell`, `/app/receipts/:saleId`; `/workspace` remains the authentication handoff. Static hosting needs SPA fallback for deep links.

## Integration limits

Sign-in and `/me` use generated types from the merged v0.1.0 contract. That contract's upstream two-engineer sign-off is still recorded pending. Backend auth and demo seeds are not implemented in the merged database foundation; intercepted browser tests do not claim a working deployed service.

Registration validates the three reference fields, then clearly reports unavailable; it makes no unapproved network request. Proposed wire behavior is in [auth-contract-proposal.md](../docs/auth-contract-proposal.md). The coin is reconstructed SVG because original artwork was not supplied, so exact artwork equivalence is not claimed.

Current sale requests follow v0.1.0 exactly. Real submissions involving store credit are blocked until settlement fields are agreed; the corrected credit demonstration is explicitly simulated. Price checks before confirmation cannot enforce a price against a concurrent server update without the proposed contract guard. Pending submissions are stored by user and service connection in tab storage before sending and survive refresh/reauthentication. A transport retry reuses the original key/body; do not erase an unresolved submission to start another. History/edit/archive screens are deferred. See [products/sales implementation](../docs/products-sales-ui.md) and [contract proposals](../docs/products-sales-contract-proposal.md).

See [implementation and provenance](../docs/auth-ui-implementation.md), [architecture](../docs/frontend-architecture.md), [decisions](../decisions.md), and [actual verification output](../sdlc/WORKLOG.md).
