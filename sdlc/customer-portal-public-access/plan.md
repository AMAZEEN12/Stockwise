# Plan: Customer Portal Public Access

**Change slug:** `customer-portal-public-access`  
**Derived from:** `spec.md`  
**Status:** Accepted  
**Approver:** Victor Oyeleke & Nnaemeka Chukwuma  
**Date:** 2026-11-03  

---

## 1. Affected Files

1. `service/src/main/java/ng/tesa/stockwise/config/SecurityConfig.java`:
   - Permit unauthenticated `GET /api/v1/portal/customer/**` and `POST /api/v1/portal/customer/*/orders`.
2. `service/src/main/java/ng/tesa/stockwise/common/ErrorCode.java`:
   - Add `TOKEN_EXPIRED(HttpStatus.GONE, "token-expired", "Token expired")`.
3. `service/src/main/java/ng/tesa/stockwise/common/ProblemHandler.java`:
   - Add `@ExceptionHandler` for `TokenExpiredException`.
4. `service/src/main/java/ng/tesa/stockwise/portal/`:
   - `PortalExceptions.java`: `TokenExpiredException`.
   - `PortalModels.java`: Records for ShopInfo, CustomerInfo, PortalDetailsResponse, PortalProduct, OrderLine, CreateOrderRequest, CreateOrderResponse.
   - `PortalService.java`: Business logic for token resolution, live catalogue, and pre-order calculations.
   - `PortalController.java`: HTTP routes matching OpenAPI specification.
5. `contract/openapi.yaml`:
   - Add `/portal/customer/{token}`, `/portal/customer/{token}/products`, `/portal/customer/{token}/orders`.
   - Bump version to `0.6.0`.
6. `decisions.md`:
   - Record v0.6.0 contract sign-off signed by Nnaemeka Chukwuma and Isaac Bassey.
7. `web/src/features/customers/CustomerDetailPage.tsx`:
   - Add "Customer portal link" button to header so staff can easily copy or open `/c/:id`.
8. `service/src/test/java/ng/tesa/stockwise/portal/PortalEndpointIT.java`:
   - Integration tests covering public access, token resolution, stock validation, and pre-orders.

---

## 2. Order of Implementation

1. Update `SecurityConfig.java`, `ErrorCode.java`, and `ProblemHandler.java`.
2. Create `ng.tesa.stockwise.portal` package (`PortalExceptions`, `PortalModels`, `PortalService`, `PortalController`).
3. Update `contract/openapi.yaml` and record sign-off in `decisions.md` §3.
4. Add portal link button on `CustomerDetailPage.tsx`.
5. Run unit and integration tests.
6. Verify locally without pushing to remote GitHub.
