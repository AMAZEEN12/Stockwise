# Authentication contract alignment and registration proposal

2026-10-24 · Scope authorized by Victor Oyeleke; proposed details by Codex. Registration and additional responses below are **not approved**, not inserted into OpenAPI, and not called by the UI. API owner Isaac Bassey and one other engineer must agree changes and record them in decisions.md §3.

## Existing contract

PR [#2](https://github.com/AMAZEEN12/Stockwise/pull/2) is merged at `18151aa`; its head was `26400da`. Preserve v0.1.0 and its still-pending two-engineer approval record. Merging is not evidence of those approvals. The frontend generates `web/src/api/schema.d.ts` from that exact local contract.

- `POST /auth/sessions`: `LoginRequest` with email (format email, maximum 254), password (8–128 characters); 201 `Session` with accessToken, tokenType Bearer, expiresAt and user. 400 validation and 401 unauthenticated are documented.
- `GET /me`: 200 `User` or 401. Re-read on protected-route navigation and refresh. OWNER, ASSISTANT, ADMIN remain server-owned roles.
- Base URL: Prism `http://127.0.0.1:4710` (root paths); real service `http://localhost:8080/api/v1`. `VITE_API_BASE_URL` selects one; do not append `/api/v1` to the mock URL.
- Preserve problem code, request ID and field errors. Prism request validation can return its own 422 format. Network failures are transport states, not invented HTTP codes. Shared HTTP configuration preserves Idempotency-Key and If-Match; no automatic retry creates a submission key.
- The merged backend currently has database groundwork, not runnable auth endpoints or demo seed credentials. Browser tests intercept HTTP; they do not prove deployed integration.

## Proposed registration contract

`POST /auth/registrations`, operationId `createRegistration`:

```json
{ "displayName": "Demo Owner", "email": "owner@example.com", "password": "example-password" }
```

- Require exactly those three fields (`additionalProperties: false`). Map the visible Full name field to displayName; proposed trimmed length 1–120. Reuse existing email and password constraints; password is writeOnly and never trimmed.
- Success: 201 with existing `Session`, so the three-field UI and session handoff stay the same.
- Errors: 400 `VALIDATION_FAILED` with field errors; proposed 409 `EMAIL_ALREADY_REGISTERED` using existing Problem envelope. Extend its code enum only after agreement. Agree account-enumeration behavior before exposing conflict text.
- Accept/echo X-Request-Id. Do not accept client-selected role or shop ID. Before enabling, the API/product owners must decide who may register, which role is assigned, and how that person joins this single demonstration shop. Public registration must not silently grant OWNER or ADMIN.
- No fabricated success: the current adapter makes no registration request and displays an explicit unavailable message after local validation.

## Additional API-owner questions

Document 503 `DATABASE_UNAVAILABLE` for session creation if supported; the current session operation lists 201/400/401 only. Agree 429 and Retry-After if rate limits are introduced. A login pending for three seconds displays the reference waking notice; it is an elapsed-time hint, not a server readiness claim or measured percentage.

There is no refresh or server logout endpoint in v0.1.0. Current sign-out clears the tab session and RTK Query cache; it does not revoke the bearer token. Any revocation requirement needs a separately approved contract. The eight-hour expiry decision remains unchanged.

## Demo buttons

2026-10-24 update (DM42): Victor selected contract mock development. Local mock-only configuration uses `owner@stockwise.demo` / `stockwise-demo`. This is an illustrative input, not a seeded account; Prism accepts any body meeting LoginRequest constraints and returns a fixed OWNER response. Assistant/Admin buttons do not simulate distinct roles in this fixture. Real authentication and role testing still require backend implementation and seeds.

Run `npm run mock` in web. The launcher derives ignored `.mock/openapi.yaml` from the unchanged authoritative contract, adding deterministic example responses for session creation and /me. The session expires eight hours after the mock starts; restart it when expired. This fixture copy is not an API-contract amendment or approval.

Owner/Assistant/Admin fill public demonstration details and wait for an explicit Sign in. Emails default to the reference naming convention, with environment overrides. No password is invented: without the seed owner's public VITE_DEMO_PASSWORD, the UI asks for the team-provided password. Do not use real credentials in Vite environment variables; all VITE values are public in the build.

2026-10-25 update (DM60-DM61): main development simulation now issues separate per-account sessions for configured demo emails; explicit --role remains available. POST /auth/sessions and GET /me wire shapes are unchanged. The role returned by fresh /me controls the destination; no client role request field or production authentication behavior is invented. Demo buttons remain fill-only. Static Prism still cannot simulate distinct account roles; use npm run mock for the current multi-role development flow. See auth-role-landing.md. Decided by Victor Oyeleke (scope); technical choices/logged by Codex.
