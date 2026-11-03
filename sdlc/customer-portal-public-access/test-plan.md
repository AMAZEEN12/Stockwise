# Test Plan: Customer Portal Public Access

**Change slug:** `customer-portal-public-access`  
**Derived from:** `plan.md`  
**Status:** Accepted  
**Approver:** Nnaemeka Chukwuma (Data & Rules)  
**Date:** 2026-11-03  

---

## 1. Automated Verification Matrix

| Test Suite / Command | Target Layer | Expected Result |
| :--- | :--- | :--- |
| `npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml` | OpenAPI Contract | 0 errors, valid API description |
| `cd service && ./mvnw test -Dtest=Portal*Test` | Backend Unit | All tests pass |
| `cd service && ./mvnw test-compile` | Backend Compile | Clean compilation with Spring Security permits |
| `cd web && npm run lint` | Web ESLint | 0 errors, 0 warnings |
| `cd web && npm run typecheck` | Web TypeScript | 0 errors (strict mode) |
| `cd web && npm test -- --run` | Web Vitest | All tests pass |

---

## 2. Test Cases (`PortalEndpointIT`)

1. **TC-PORTAL-1 (Public Reachability):** Requesting `GET /api/v1/portal/customer/{validId}` without any `Authorization` header returns 200 OK with shop info, customer name, debt balance, and store credit.
2. **TC-PORTAL-2 (Demo Token Support):** Requesting `GET /api/v1/portal/customer/chidi-demo-token` returns 200 OK mapped to demo customer Mama Chidi.
3. **TC-PORTAL-3 (Expired Link Guard):** Requesting `GET /api/v1/portal/customer/expired-token` returns HTTP 410 GONE with code `TOKEN_EXPIRED`.
4. **TC-PORTAL-4 (Invalid Link Guard):** Requesting `GET /api/v1/portal/customer/invalid-token` or random unknown string returns HTTP 404 NOT FOUND with code `NOT_FOUND`.
5. **TC-PORTAL-5 (Live Catalogue):** `GET /api/v1/portal/customer/{token}/products` returns active, in-stock products only.
6. **TC-PORTAL-6 (Pre-Order Creation):** `POST /api/v1/portal/customer/{token}/orders` with valid cart returns 201 Created with order number and formatted WhatsApp link.
7. **TC-PORTAL-7 (Insufficient Stock Guard):** Attempting to order quantity exceeding available stock returns 409 `INSUFFICIENT_STOCK`.
8. **TC-PORTAL-8 (Staff Route Protection):** Unauthenticated calls to staff routes (`POST /api/v1/sales`, `POST /api/v1/products`) continue to return HTTP 401 Unauthorized.
