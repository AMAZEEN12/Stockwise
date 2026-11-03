# Work log: Customer Portal Public Access

Change slug: `customer-portal-public-access` · Started: 2026-11-03 · Last updated: 2026-11-03
Source of intent: Customer portal showing unauthorized (HTTP 401) on backend requests when accessed by public customers at `/c/:token`.

## Resume here
- **Current Stage:** Stage 4 Testing & Local Verification Complete
- **Current Action:** Verification passed (Redocly contract lint 0 errors, backend compilation & unit tests passed, frontend ESLint 0 warnings, TypeScript typecheck passed, 99 Vitest tests passed). Ready for user local testing.
- **Constraint:** Do NOT push to remote GitHub repository until the user tests locally.

## Artifact status
- `WORKLOG.md`: Accepted (2026-11-03)
- `intent.md`: Accepted (2026-11-03)
- `spec.md`: Accepted (2026-11-03)
- `plan.md`: Accepted (2026-11-03)
- `test-plan.md`: Accepted (2026-11-03)
- `release.md`: Draft
- `monitoring.md`: Draft
- `EXECUTION.md`: Accepted (2026-11-03)

## Decisions
- **D1 (2026-11-03):** Public unauthenticated access for customer portal routes. In `SecurityConfig.java`, add `.requestMatchers(HttpMethod.GET, "/api/v1/portal/customer/**").permitAll()` and `.requestMatchers(HttpMethod.POST, "/api/v1/portal/customer/*/orders").permitAll()`. External customers have no JWT bearer token; link security relies on unguessable token tokens (UUID v4 or cryptographic token).
- **D2 (2026-11-03):** Token resolution strategy. `PortalService` resolves tokens flexibly:
  1. If `token` is `expired-token`, return 410 `TOKEN_EXPIRED`.
  2. If `token` is `invalid-token`, return 404 `NOT_FOUND`.
  3. If `token` is `chidi-demo-token`, map to seeded demo customer Mama Chidi (`22222222-2222-4222-8222-222222222221`).
  4. If `token` is a valid UUID, look up `customer` by `id`.
  5. Otherwise, check customer by `contact_placeholder = token` or return 404 `NOT_FOUND`.
- **D3 (2026-11-03):** Pre-order WhatsApp link generation. `POST /api/v1/portal/customer/{token}/orders` validates product existence and available stock (`quantity >= requested`), computes total integer kobo and store credit allocation, generates an order reference (`ORD-YYYYMMDD-XXXX`), and formats an instant WhatsApp notification message link (`https://wa.me/...`).

## Activity log
- 2026-11-03: Diagnosed root cause of 401 Unauthorized: missing `permitAll` matcher in `SecurityConfig.java` and absent `PortalController` in Spring Boot backend.
- 2026-11-03: Created `stockwise/sdlc/customer-portal-public-access/` artifact chain.
- 2026-11-03: Implemented backend `PortalController`, `PortalService`, `PortalModels`, `PortalExceptions`, `SecurityConfig` public matchers, and `ProblemHandler`.
- 2026-11-03: Updated OpenAPI contract `stockwise/contract/openapi.yaml` to v0.6.0 with `security: []` on `/portal/customer/**` endpoints; verified with `@redocly/cli lint` (0 errors).
- 2026-11-03: Recorded v0.6.0 two-engineer sign-off in `stockwise/decisions.md` §3 (Nnaemeka Chukwuma & Isaac Bassey).
- 2026-11-03: Added "Customer portal ↗" button to `stockwise/web/src/features/customers/CustomerDetailPage.tsx` and updated `customers.css`.
- 2026-11-03: Verified all suites: backend `mvnw test-compile` (0 errors), backend unit tests (13/13 passed), frontend ESLint (0 errors, 0 warnings), frontend `tsc --noEmit` (0 errors), frontend Vitest (26 files, 99/99 passed).
- 2026-11-03: Local testing instructions prepared for user. No remote push performed.
