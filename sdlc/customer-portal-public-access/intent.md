# Intent: Customer Portal Public Access

**Change slug:** `customer-portal-public-access`  
**Status:** Accepted  
**Approver:** Victor Oyeleke (Product Owner) & Nnaemeka Chukwuma (Data & Rules)  
**Date:** 2026-11-03  

---

## 1. Context & Problem Statement

In Stockwise, retail shop customers receive a tokenized web link (`/c/:token`) via SMS or WhatsApp, allowing them to:
1. Inspect their live debt balance and available store credit without creating an account or logging in.
2. Browse in-stock store inventory.
3. Submit a click-and-collect pre-order with payment preferences (`PAY_ON_PICKUP`, `USE_STORE_CREDIT`, `ON_ACCOUNT`) and message the shopkeeper on WhatsApp.

When testing the customer portal against the Spring Boot backend (`stockwise/service`), requests to:
- `GET /api/v1/portal/customer/{token}`
- `GET /api/v1/portal/customer/{token}/products`
- `POST /api/v1/portal/customer/{token}/orders`
fail with **HTTP 401 Unauthorized** (`Full authentication is required to access this resource`).

### Why this happens
1. `SecurityConfig.java` enforces `.anyRequest().authenticated()`. Public portal routes are omitted from `.permitAll()`.
2. The production Spring Boot service lacks `PortalController` and `PortalService` implementations. The portal was previously mocked in the frontend development simulation (`development-api.mjs`) and drafted in `docs/customer-portal-store-credit-proposal.md`, but not implemented in the service.

---

## 2. Goals & Desired Outcome

1. **Unauthenticated Public Reachability:** Allow external customers without staff JWT credentials to access `/api/v1/portal/customer/**` safely.
2. **Customer Link Resolution:** Resolve `{token}` flexibly:
   - Valid UUID strings resolve to `customer.id`.
   - `chidi-demo-token` resolves to demo customer Mama Chidi (`22222222-2222-4222-8222-222222222221`).
   - `expired-token` returns HTTP 410 `TOKEN_EXPIRED`.
   - Non-existent tokens return HTTP 404 `NOT_FOUND`.
3. **In-Stock Product Catalogue:** Return active in-stock products (`active = true AND quantity > 0`), with optional search query filtering (`q`).
4. **Pre-Order Submission:** Validate requested item stock, compute total kobo using safe integer arithmetic, calculate store credit drawdown, and generate a pre-formatted WhatsApp order link (`https://wa.me/...`).
5. **Contract Formalization:** Add OpenAPI contract definitions to `contract/openapi.yaml` (v0.6.0) and record two-engineer sign-off in `decisions.md` §3.
