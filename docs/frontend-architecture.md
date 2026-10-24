# Frontend starter and conventions

Owner and decider: Victor Oyeleke (Interface). Logged by: Codex (logging assistant), 2026-10-24. Decisions: DM32-DM38 in [decisions.md](../decisions.md). Nnaemeka Chukwuma remains the existing decision-log owner; this document does not attribute Victor's decisions to Team 3 or the other interface engineers.

## Current deliverable

Phase 2 is folders, documentation and one empty source file: `web/src/service/http-client.ts`. Empty leaf folders have `.gitkeep` files so a clone preserves them. There are no dependencies, package manifest, configuration, generated types, image or font assets, CSS, screens or application implementation. Remove a folder's placeholder when it gains real files.

The root `service/` is reserved for the Java backend. Frontend HTTP code belongs under `web/src/service/`. Backend, contract, hosting and workflow scaffolding remain with their area owners.

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

## Planned stack and ownership

Vite, React 19, strict TypeScript without `any`, React Router in **Data Mode**, Tailwind CSS, Axios, Formik with Yup, Redux Toolkit and RTK Query. RTK Query replaces TanStack Query from DM21. Keep the planned openapi-typescript generation, Vitest, Testing Library, Playwright, axe, Prism and npm. Verify and pin current compatible package versions when the runnable foundation is separately authorized; Data Mode does not authorize React Router Framework Mode setup.

- `app/router/`: route composition and Data Mode integration; `app/store/`: Redux store and RTK Query integration. RTK Query owns server-data caching; do not introduce a second TanStack Query cache.
- `auth/`: login UI, authentication/session concerns and local authentication components. Session persistence is still unresolved, not an instruction to select browser storage.
- `features/`: product behavior and feature-local screens, components and hooks. Customer ledger and repayments belong with customers; sale details belong with sales; movement-history screens belong with history.
- `components/ui/`: reusable UI from the future shared agreement; `components/layouts/`: reusable layouts. This reservation does not approve component APIs or dependencies.
- `shared/`: cross-feature hooks, constants and utilities. `lib/money.ts` remains the sole naira-formatting location, using integer arithmetic on integer kobo.
- `schema/`: Yup form schemas consumed by Formik, distinct from generated OpenAPI types. Form validation helps the user; it does not replace service/database rule enforcement.
- `styles/`: future token definitions, Tailwind mapping and application styles; `assets/fonts/`: future font assets. None is implemented now.
- `e2e/`: future Playwright journeys and accessibility checks; `public/`: assets that eventually need fixed public paths. Application images use the image-import convention below.

## API separation and future filenames

| Location or example | Responsibility |
|---|---|
| `service/endpoints/products.endpoints.ts` | Central product URL definitions, including parameterized detail URLs when approved in the contract. |
| `service/api/products.api.ts` | Product operations (list, detail, create, update) together in one resource file, referencing those URL definitions. Other resources get their own file. |
| `service/http-client.ts` | One shared Axios client: base URL from the future environment configuration, shared headers, consistent transport/error handling. Empty in this phase. |
| `api/schema.d.ts` | Generated contract types only. Generate when the approved OpenAPI contract exists; never hand-create this file. |
| `models/requests/`, `models/responses/` | Contract-derived request and response type aliases or models. Do not independently invent wire shapes, pagination or response envelopes. |

Resource API modules will connect to RTK Query through a common Axios-backed base query so resource separation still shares one cache for the service. Components will use the resource query/mutation interface rather than duplicating HTTP requests. These are future implementation responsibilities, not source delivered now.

The HTTP layer will attach the current bearer token where required and `X-Request-Id` per request. Operation-specific headers such as `If-Match` and `Idempotency-Key` must pass through intact. Create the submission key once per logical sale, restock or repayment and retain it across retries of that write. Do not regenerate it in a generic request interceptor. Preserve the distinction between a retry of the same submission and an edited/new submission.

Normalize RFC 9457 API problems, field errors, network failures and timeouts without losing status, code or request ID. Forms show relevant field errors; screens choose actionable user messages. Do not log passwords, tokens or full request bodies. An unconfirmed monetary/stock write must never be reported as saved. Login failure, session expiration and forbidden access require different handling; details remain PD14. The existing eight-hour token/no-refresh-token decision still applies.

URLs and wire models must come from `contract/openapi.yaml` once it exists. `/categories` was only an organizational example in the discussion; no category endpoint is approved. New API paths still require two engineers' contract-change sign-off.

## Assets and naming

Store image files in `assets/images/`; add a central `assets/images/index.ts` of named exports once real assets exist. Screens import named images from that location. Do not create an empty index file in this phase or pretend the design screenshot supplies production image files.

Use lowercase kebab-case directory names and descriptive filenames. Resource API files use `<resource>.api.ts`; URL definition files use `<resource>.endpoints.ts`; Yup files use `<form>.schema.ts`; request/response models use `<operation>.request.ts` and `<operation>.response.ts`. React screen/component filenames use PascalCase by default; copied shared component filenames must follow the eventual shared agreement. Generated types retain their established filename.

Use separate branches: `chore/web-structure`, `feat/<feature>`, and `fix/<bug>`. Commit subjects describe the change, for example `feat(auth): add responsive login screens`. The one-time bootstrap of planning documents on `main` is DM36; later work goes through PR review. A pushed feature branch is immediately visible to teammates but is not merged or deployed.

## Supplied design tokens

Source: the token image supplied by Victor in this conversation. These are recorded design values, not implemented CSS or independently verified contrast measurements. The image's contrast estimates are not accessibility test evidence.

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

Login-specific references: Syne 800 wordmark (200 px/0.92 desktop, `min(50px, 13.5vw)` mobile with 16 px side padding); STOCK solid white and WISE outlined. Login headline uses Inter Tight 500 at 58 px/1.02 desktop and 26 px mobile, with an Instrument Serif italic lime accent. Coin artwork, wordmark layout, hero composition and animation belong to the later login work. The reference describes a desktop-only decorative coin with a static reduced-motion treatment; do not generate or implement it in this phase.

Keep the foundational colors, type, spacing, radii and focus treatment app-wide (DM34). Do not extrapolate unspecified success/warning colors, font delivery, responsive layouts or component states from this image. Both invalid-credential and network-error behavior must be considered at every supported screen size; their appearance on different reference frames does not restrict which device can experience them.

## Pending agreement and phase 3 questions

The finalized four-engineer shared source is [tesa-shared-components](https://github.com/spr-tech/interface-eng-shared-components). Copy required primitives into `src/components/ui/`; do not add it as a runtime dependency. Replace its neutral token values with the Stockwise tokens. Shadcn is not required, and Formik/Yup remains the Stockwise form choice.

Before implementing the affected phase 3 behavior, align on PD14:

- Session persistence across refresh, logout and multiple tabs; expired sessions or role changes during an unfinished form or pending write; post-login destination.
- Pending-write recovery after navigation or refresh, storage/lifetime of submission keys and payloads, retry limits and cancellation behavior. Never invent offline success or replay a changed payload with an old key.
- A product becoming archived, stock dropping, or the server price changing while a cart is open; presentation of conflicts and updated totals before confirmation.
- Presenting store credit, amount applied and remaining balance; customer selection for paid sales that may use credit; repayment or reversal conflicts. Existing business rules stay authoritative; wire details require the API owner.
- Login validation, generic wrong-credential messaging, network errors, waking notice after the existing 3-second threshold, success/confirmation and meaningful empty-state behavior; demo-account controls await Victor's screen prompt.
- Naira input rules and maximum safe client amounts for JSON int64 money; no floating-point money arithmetic or parsing policy is selected here.
- Final responsive screens, reduced-motion artwork, missing tokens, font assets and the shared Formik-compatible component interfaces.

## Verification for this phase

Check the exact folder map, empty `.gitkeep` files, the zero-byte HTTP-client file, absence of application/configuration files, Markdown link targets and consistency of decision references. Review staged diffs and whitespace before commits. After publication compare local commit IDs with remote branch heads and confirm the PR targets `main`.

The service wrapper, OpenAPI contract and web package manifest do not exist, so the application commands in AGENTS.md are unavailable, not passed. This phase changes no business rules or rendered UI. Keep runtime checks planned and run them when a runnable foundation is introduced.

## Phase 3 frontend alignment (2026-10-24)

- Login implementation uses the existing OpenAPI PR #2 contract (`POST /auth/sessions`, `GET /me`) and does not invent a registration endpoint.
- Sign-up is currently a validated UI flow with an explicit pending adapter until the API owner approves a registration contract.
- The finalized four-engineer shared component set is a copy-in source; Stockwise does not depend on that repository at runtime.
- Stockwise supplied design tokens are the single source of truth for every feature and override neutral shared token values.
- The local `web/Stockwise — Login-png/` design-reference folder is ignored and is not a runtime asset.
- Decided by: Victor Oyeleke. Logged by: Codex.
