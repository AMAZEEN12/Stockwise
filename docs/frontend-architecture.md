# Frontend starter and conventions

Owner: Victor Oyeleke (Interface). Logged by: Codex, 2026-10-24. Decisions DM32–DM40 in [decisions.md](../decisions.md). Shared agreement is attributed to the five interface engineers as reported by Victor; implementation choices and proposals are identified separately. Nnaemeka remains the existing decision-log owner.

## Current deliverable

Phase 3 implements Home and authentication on `feat/auth-ui`, with a runnable Vite/React/TypeScript app, Tailwind v4, Data Mode, copied shared components, generated contract types, Axios/RTK Query, Formik/Yup, self-hosted fonts and a reconstructed SVG coin. Registration remains an explicit pending adapter. See [implementation details](auth-ui-implementation.md), [contract proposals](auth-contract-proposal.md), and WORKLOG for actual verification. Empty unused feature folders keep placeholders; populated folders remove them.

The root `service/` is the Java backend; merged PR #2's database foundation is retained. Frontend HTTP code belongs under `web/src/service/`. Backend HTTP implementation, hosting and workflows remain with their area owners. The existing OpenAPI is consumed unchanged; proposed changes require two-engineer sign-off.

## Folder map

```text
web/
├── public/
├── e2e/
└── src/
    ├── app/
    │   ├── router/
    │   └── store/
    ├── api/
    ├── assets/
    │   ├── fonts/
    │   └── images/
    ├── auth/
    ├── components/
    │   ├── ui/
    │   └── layouts/
    ├── features/
    │   ├── dashboard/
    │   ├── products/
    │   ├── sales/
    │   ├── customers/
    │   ├── restocks/
    │   ├── reversals/
    │   └── history/
    ├── lib/
    ├── models/
    │   ├── requests/
    │   └── responses/
    ├── schema/
    ├── service/
    │   ├── http-client.ts
    │   ├── api/
    │   └── endpoints/
    ├── shared/
    │   ├── constants/
    │   ├── hooks/
    │   └── utils/
    └── styles/
```

## Stack and ownership

Vite, React 19, strict TypeScript without `any`, React Router in **Data Mode**, Tailwind **v4**, Axios, Formik/Yup, Redux Toolkit/RTK Query, openapi-typescript, Vitest, Playwright/axe and npm. Resolved package versions are pinned in package.json and lockfile. Use `react-router`, `createBrowserRouter` and `RouterProvider`; configure `@tailwindcss/vite` beside the React plugin and import Tailwind from the global stylesheet. CSS-first theme mapping belongs in styles/tokens.css. No Framework Mode or parallel query cache.

- `app/router/`: route composition and Data Mode integration; `app/store/`: Redux store and RTK Query integration. RTK Query owns server-data caching; do not introduce a second TanStack Query cache.
- `auth/`: expiry-checked tab sessionStorage with memory fallback (DM40), logout and the pending registration adapter. Auth screens are in features/auth; implementation details and limitations are documented.
- `features/`: product behavior and feature-local screens, components and hooks. Customer ledger and repayments belong with customers; sale details belong with sales; movement-history screens belong with history.
- `components/ui/`: copied shared primitives from the adopted source (DM37), with documented additive styling/loading extensions. `components/layouts/`: reusable layouts.
- `shared/`: cross-feature hooks, constants and utilities. `lib/money.ts` remains the sole naira-formatting location, using integer arithmetic on integer kobo.
- `schema/`: Yup form schemas consumed by Formik, distinct from generated OpenAPI types. Form validation helps the user; it does not replace service/database rule enforcement.
- `styles/`: app-wide Stockwise tokens, Tailwind v4 mapping and responsive styles. Fonts are self-hosted by the pinned Fontsource imports; no remote font request is needed.
- `e2e/`: Playwright auth journeys, reference-size captures and axe checks. `public/`: assets that need fixed public paths. Runtime images use the image-import convention below.

## API separation and future filenames

| Location or example | Responsibility |
|---|---|
| `service/endpoints/products.endpoints.ts` | Central product URL definitions, including parameterized detail URLs when approved in the contract. |
| `service/api/products.api.ts` | Product operations (list, detail, create, update) together in one resource file, referencing those URL definitions. Other resources get their own file. |
| `service/http-client.ts` | Shared Axios client, VITE_API_BASE_URL, bearer/request headers, preserved operation headers and normalized transport/problem errors; supplies the common RTK Query base query. |
| `api/schema.d.ts` | Generated from the merged v0.1.0 contract; never edit by hand. Its upstream two-engineer approval record is still pending. |
| `models/requests/`, `models/responses/` | Contract-derived request and response type aliases or models. Do not independently invent wire shapes, pagination or response envelopes. |

Resource API modules connect to RTK Query through a common Axios-backed base query, sharing one cache for the service. Components use resource hooks; central endpoints and request/response aliases come from generated contract types. Authentication is implemented; the other resource files remain future work.

The HTTP layer attaches the current bearer token and `X-Request-Id` per request. Operation-specific headers such as `If-Match` and `Idempotency-Key` pass through intact. Create the submission key once per future logical sale, restock or repayment and retain it across retries of that write. Do not regenerate it in a generic request interceptor. Preserve the distinction between a retry of the same submission and an edited/new submission.

Normalize RFC 9457 API problems, field errors, network failures and timeouts without losing status, code or request ID. Forms show relevant field errors; screens choose actionable user messages. Do not log passwords, tokens or full request bodies. An unconfirmed monetary/stock write must never be reported as saved. Login failure, session expiration and forbidden access require different handling; details remain PD14. The existing eight-hour token/no-refresh-token decision still applies.

URLs and wire models come from `contract/openapi.yaml`. `/categories` was only an organizational example; no category endpoint is approved. New API paths require two engineers' contract-change sign-off. Registration is proposed separately and not called.

## Assets and naming

Store runtime image files in `assets/images/`, exported by the central `index.ts`. The reconstructed coin is the first runtime asset. DM43 commits Victor's design references under `web/Screens/`; these are versioned review inputs, never page backgrounds or runtime imports. The earlier local Login-png ignore pattern remains for any private copies. Other runtime artwork should join the asset import index.

Use lowercase kebab-case directory names and descriptive filenames. Resource API files use `<resource>.api.ts`; URL definition files use `<resource>.endpoints.ts`; Yup files use `<form>.schema.ts`; request/response models use `<operation>.request.ts` and `<operation>.response.ts`. React screen/component filenames use PascalCase by default; copied shared component filenames must follow the eventual shared agreement. Generated types retain their established filename.

Use separate branches: `chore/web-structure`, `feat/<feature>`, and `fix/<bug>`. Commit subjects describe the change, for example `feat(auth): add responsive login screens`. The one-time bootstrap of planning documents on `main` is DM36; later work goes through PR review. A pushed feature branch is immediately visible to teammates but is not merged or deployed.

## Supplied design tokens

DM41 canonical utility convention: prefer `focus-visible:outline-offset-(--focus-ring-offset)`, `rounded-md`, and `font-sans` over equivalent arbitrary-value expressions. `rounded-md` resolves to Stockwise's existing 10px radius token; `font-sans` uses the existing Inter Tight theme mapping. Record recurring mistakes in AGENTS.md and apply this convention to copied shared components. See the official [outline-offset](https://tailwindcss.com/docs/outline-offset), [border-radius](https://tailwindcss.com/docs/border-radius), and [font-family](https://tailwindcss.com/docs/font-family) references.

Source: Victor's token image in the local reference folder. Values are implemented in `web/src/styles/tokens.css`; the image's estimated contrast figures are not test evidence. Actual browser accessibility results are recorded separately in WORKLOG.

| Token | Supplied value | Intended use |
|---|---|---|
| bg | `#0B0B0A` | Page background |
| surface | `#121211` | Form/card surfaces |
| line | `#C1C1C1` at 20% opacity | Card and divider borders, 1 px |
| control | `#8C8C8A` | Input borders |
| lime | `#B7E737` | Primary actions, focus and accents |
| on-lime | `#0B0B0A` | Text on lime fills |
| text | `#FFFFFF` | Headings and input text |
| muted | `#C1C1C1` | Labels, hints and placeholders |
| error | `#FF8F85` | Error text and icon treatment |

General typography: Inter Tight for headings, body, inputs and labels; heading 600 at 34 px/1.1, body/input 400 at 16 px/1.5, labels 500 at 14 px, help/notes 13 px/1.4. Micro text uses JetBrains Mono at 12 px with 0.04 em tracking. Spacing steps: 4, 8, 12, 16, 24, 32 and 48 px. Reference panel padding is 48 px desktop and 20 px mobile. Control radius is 10 px and card radius 16 px. Targets are at least 44 px; buttons and fields are 48 px. Focus is a 3 px lime outline with 2 px offset.

Login-specific token-sheet references: Syne 800 wordmark (200px desktop; fluid mobile with 16px side padding), solid STOCK and outlined WISE; Inter Tight headline with Instrument Serif italic lime accent. The supplied Home frame governs its measured 48px desktop headline and mobile composition; see auth-ui-implementation.md for this explicit difference from the token-sheet 58px note. The reconstructed desktop coin has pointer/idle motion and a static reduced-motion pose, and is hidden on mobile.

Keep the foundational colors, type, spacing, radii and focus treatment app-wide (DM34). Do not extrapolate unspecified success/warning colors, font delivery, responsive layouts or component states from this image. Both invalid-credential and network-error behavior must be considered at every supported screen size; their appearance on different reference frames does not restrict which device can experience them.

## Shared agreement and remaining questions

DM37 adopts the five engineers' shared copy-in source as reported by Victor. The earlier PDF is historical context; current upstream source and README define component APIs. Shadcn is not required. Formik/Yup remains Stockwise's form stack; native Input props and FormField render props support it. The upstream decision file still names four engineers, so a fifth name is not invented. See the implementation document for revision, dependencies and local extensions.

DM40 settles the current auth defaults; [the proposal](auth-contract-proposal.md) records remaining registration/API questions. Before future cart/money features, align on the remaining PD14 items:

- Future cross-tab sessions and role changes during an unfinished money form; the current auth tab persistence, logout and welcome handoff are documented by DM40.
- Pending-write recovery after navigation or refresh, storage/lifetime of submission keys and payloads, retry limits and cancellation behavior. Never invent offline success or replay a changed payload with an old key.
- A product becoming archived, stock dropping, or the server price changing while a cart is open; presentation of conflicts and updated totals before confirmation.
- Presenting store credit, amount applied and remaining balance; customer selection for paid sales that may use credit; repayment or reversal conflicts. Existing business rules stay authoritative; wire details require the API owner.
- Backend demo seed credentials and registration authorization remain pending. The implemented auth states and fill-only demo buttons are documented by DM40.
- Naira input rules and maximum safe client amounts for JSON int64 money; no floating-point money arithmetic or parsing policy is selected here.
- Original coin artwork and human visual-baseline approval remain pending; current fonts, responsive auth screens, reduced motion and Formik compatibility are implemented.

## Verification

Check the exact folder map, empty `.gitkeep` files, the zero-byte HTTP-client file, absence of application/configuration files, Markdown link targets and consistency of decision references. Review staged diffs and whitespace before commits. After publication compare local commit IDs with remote branch heads and confirm the PR targets `main`.

Phase 2 checks above are historical. The service wrapper, OpenAPI and web manifest now exist. Run frontend lint/typecheck/unit/build, contract lint, and Playwright/axe as documented in auth-ui-implementation.md. Record actual output and environment limitations in WORKLOG. This frontend feature changes no database business rule or migration.
