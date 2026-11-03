# Execution Runbook: Customer Portal Public Access

**Change slug:** `customer-portal-public-access`  
**Date:** 2026-11-03  

---

## 1. Prerequisites
- Java 25 & Maven Wrapper in `stockwise/service`
- Node.js & npm in `stockwise/web`
- Local testing only — **DO NOT PUSH TO GITHUB** until user explicitly tests locally.

## 2. Implementation Steps
1. Add `TOKEN_EXPIRED` to `service/src/main/java/ng/tesa/stockwise/common/ErrorCode.java`.
2. Add `@ExceptionHandler(TokenExpiredException.class)` in `service/src/main/java/ng/tesa/stockwise/common/ProblemHandler.java`.
3. Add `.requestMatchers(HttpMethod.GET, "/api/v1/portal/customer/**").permitAll()` and `.requestMatchers(HttpMethod.POST, "/api/v1/portal/customer/*/orders").permitAll()` to `service/src/main/java/ng/tesa/stockwise/config/SecurityConfig.java`.
4. Create package `ng.tesa.stockwise.portal`:
   - `PortalExceptions.java`
   - `PortalModels.java`
   - `PortalService.java`
   - `PortalController.java`
5. Update `contract/openapi.yaml` (bump version to 0.6.0) and record sign-off in `decisions.md` §3.
6. In `web/src/features/customers/CustomerDetailPage.tsx`, add the "Customer portal link" button to facilitate staff link sharing.
7. Run `cd web && npm run lint && npm run typecheck && npm test -- --run` and `cd service && ./mvnw test-compile`.
8. Report verification results to user for local testing.
