# Stockwise web

Home and authentication UI, built from the supplied desktop/mobile references. Feature branch: `feat/auth-ui`. React 19, strict TypeScript, Vite, React Router Data Mode, Tailwind v4, Axios-backed RTK Query and Formik/Yup.

## Run locally

Node 24 is the verified runtime. From this folder:

```powershell
npm ci
npm run dev
```

Open the printed local URL. The public Home/sign-in/sign-up screens work without a service. Default API URL is Prism at `http://127.0.0.1:4710`. In a second terminal in this web folder, start the configured contract mock:

```powershell
npm run mock
```

Copy `.env.example` to `.env.local` and restart Vite after changing environment values. Local setup now includes an ignored `.env.local` with these public mock examples. Use **owner@stockwise.demo / stockwise-demo**, or select Owner then Sign in. Prism checks body format, not passwords; all valid logins return the fixed demonstration OWNER. It does not simulate separate Assistant/Admin roles or real security.

The launcher derives ignored `.mock/openapi.yaml` from the unchanged active contract, adds consistent session/user examples, and sets an expiry eight hours after startup. Restart the mock when that expires. A real service must use its `/api/v1` base URL and backend-supplied credentials; clear/replace the mock sample password then. Vite's VITE variables are public. Demo buttons fill fields and require an explicit Sign in.

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

With the dev server and mock already running, `npm run check:mock` checks the actual HTTP/browser integration without intercepted responses, including demo autofill, session refresh/logout and the canonical Tailwind computed styles. Prism is development-only and currently carries transitive audit advisories; the shipped application's `npm audit --omit=dev` is clean. See the implementation document for the exact audit limitation.

Browser tests start/stop their own local server. Optional `PLAYWRIGHT_CHANNEL=chrome` uses installed Chrome. Captures live under ignored `test-results/`; dimensions match the supplied 1440×900 desktop and 360×880 mobile frames at 2×. They are review artifacts, not approved visual baselines. Routes are `/`, `/sign-in`, `/sign-up`, and the protected `/workspace` welcome handoff. Static hosting will need SPA fallback to index.html for deep links.

## Integration limits

Sign-in and `/me` use generated types from the merged v0.1.0 contract. That contract's upstream two-engineer sign-off is still recorded pending. Backend auth and demo seeds are not implemented in the merged database foundation; intercepted browser tests do not claim a working deployed service.

Registration validates the three reference fields, then clearly reports unavailable; it makes no unapproved network request. Proposed wire behavior is in [auth-contract-proposal.md](../docs/auth-contract-proposal.md). The coin is reconstructed SVG because original artwork was not supplied, so exact artwork equivalence is not claimed.

See [implementation and provenance](../docs/auth-ui-implementation.md), [architecture](../docs/frontend-architecture.md), [decisions](../decisions.md), and [actual verification output](../sdlc/WORKLOG.md).
