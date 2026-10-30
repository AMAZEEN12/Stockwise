# Delegated Sale Reversal Authorization (Supervisor OTP) Proposal

**Date:** 2026-10-28  
**Proposed by:** Interface Engineer (Victor Oyeleke; logged by Codex)  
**Status:** DRAFT Proposal — Pending two-engineer contract sign-off: Isaac Bassey (API & Access) and Nnaemeka Chukwuma (Data & Rules).

---

## 1. Problem Statement & Fraud Risk Mitigation

In retail shops and supermarkets, inventory and cash shrinkage frequently occur through unauthorized sale cancellations and voids:
- If shop assistants (cashiers) can unilaterally reverse sales, a dishonest cashier can complete a cash sale, pocket the physical cash, and later reverse the sale on the system to balance the stock count.
- Conversely, requiring the Owner or Admin to physically stand at the checkout counter to type their account password creates severe checkout bottleneck during busy periods. Even worse, busy owners frequently compromise security by giving their master password to assistants.

### The Solution: Single-Use Supervisor Authorization Codes (OTP)
1. An **Assistant** can initiate a sale reversal, but must provide a valid **6-digit authorization code**.
2. An **Owner** or **Admin** can generate an authorization code remotely (or at their desk/phone) tied specifically to the transaction.
3. The code expires in 15 minutes and can only be redeemed once.
4. Owners and Admins can reverse sales directly without requiring a separate code.

---

## 2. API Contract Specification

### 2.1 Endpoint 1: Generate Reversal Authorization Code
- **Method & Path:** `POST /api/v1/reversals/authorizations`
- **Authorized Roles:** `OWNER`, `ADMIN`
- **Request Body (`ReversalAuthorizationCreate`):**
  ```json
  {
    "saleId": "123e4567-e89b-12d3-a456-426614174000",
    "validMinutes": 15
  }
  ```
  - `saleId`: UUID of the sale to be reversed.
  - `validMinutes`: Integer (default 15, max 60).
- **Response (`201 Created`):**
  ```json
  {
    "code": "839201",
    "saleId": "123e4567-e89b-12d3-a456-426614174000",
    "expiresAt": "2026-10-28T02:35:00Z",
    "generatedBy": "Ngozi Okeke",
    "generatedByRole": "OWNER"
  }
  ```

### 2.2 Endpoint 2: Execute Sale Reversal with Code
- **Method & Path:** `POST /api/v1/sales/{saleId}/reversal`
- **Authorized Roles:** `OWNER`, `ADMIN`, `ASSISTANT`
- **Headers:** `Idempotency-Key: <UUID>` (Required)
- **Route alignment:** PR #31's frontend already uses this sale-specific route. Use this route for the future sale reversal contract and service; do not implement a competing generic sale reversal endpoint. The routes for reversing restocks and repayments are separate and remain to be agreed.
- **Request Body (`SaleReversalRequest`):**
  ```json
  {
    "reason": "CUSTOMER_RETURN",
    "note": "Customer brought back unopened biscuit carton",
    "authorizationCode": "839201"
  }
  ```
  - `authorizationCode`: String (6 digits). Required for role `ASSISTANT`; optional/ignored for `OWNER` or `ADMIN`.
- **Required combined outcome (R11 and R12):** A successful reversal restores every sold product's stock and appends the corresponding reversing stock movements. For a credit sale it also corrects the customer's debt and writes the corresponding ledger entries. If repayments mean the reversed amount exceeds the debt still attributable under the agreed ledger rules, the excess becomes store credit without making debt negative. These effects, the unique reversal record, and any code redemption must commit together or all roll back. Both original and reversal must remain visible; nothing is edited or deleted in the movement or ledger history. Existing customer debt or prior store-credit use must be handled from actual ledger history rather than assuming all balance belongs to this sale; the allocation details need data-owner agreement.
- **Acceptance example:** A ₦10,000 credit sale, followed by a ₦6,000 repayment and then this one reversal, restores stock, leaves the relevant debt at ₦0, and records ₦6,000 store credit. A subsequent ₦4,000 sale consumes ₦4,000 atomically and leaves ₦2,000. Concurrent sales cannot spend the same credit twice.
- **Retry and uniqueness:** An identical retry with the same key must return the original result without repeating stock, ledger, credit or authorization effects. A different key targeting an already reversed sale must be rejected, including concurrent requests. Reuse of a key with a different request or user must be rejected. Final status codes and response shape require agreement; the table below describes PR #31's proposal rather than an accepted contract.
- **Validation & Business Rules (Database Guarded):**
  | Scenario | HTTP Status | Problem Code | Message |
  |---|---|---|---|
  | Assistant omits code | `403 Forbidden` | `SUPERVISOR_CODE_REQUIRED` | Supervisor authorization code is required for assistants to reverse sales. |
  | Code does not exist or expired | `422 Unprocessable` | `INVALID_AUTHORIZATION_CODE` | The authorization code is invalid or has expired. |
  | Code belongs to a different sale | `422 Unprocessable` | `AUTHORIZATION_SALE_MISMATCH` | This authorization code was not issued for this sale. |
  | Code already redeemed | `409 Conflict` | `AUTHORIZATION_ALREADY_USED` | This authorization code has already been redeemed. |
  | Sale already reversed | `409 Conflict` | `SALE_ALREADY_REVERSED` | Sale has already been reversed. |

---

## 3. Database Schema & Concurrency Guard

### 3.1 Reversal authorization migration (Proposed)

Choose the next available Flyway version after merging prerequisite work; `feat/restocks` currently proposes V5, so do not reuse V5 if it lands first. Provide the matching undo script and rollback test.
```sql
CREATE TABLE reversal_authorization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(8) NOT NULL,
    sale_id UUID NOT NULL REFERENCES sale(id),
    created_by UUID NOT NULL REFERENCES app_user(id),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reversal_auth_lookup 
    ON reversal_authorization (code, sale_id) 
    WHERE redeemed_at IS NULL;
```

### 3.2 Atomic Code Redemption Guard
In Spring Boot's `JdbcClient` without JPA:
```sql
UPDATE reversal_authorization
SET redeemed_at = NOW(),
    redeemed_by = :userId
WHERE code = :code
  AND sale_id = :saleId
  AND redeemed_at IS NULL
  AND expires_at > NOW()
RETURNING id;
```
If the query returns zero rows for an `ASSISTANT`, the transaction aborts with `INVALID_AUTHORIZATION_CODE` before touching stock, cash, or customer ledgers.

---

## 4. UI Implementation (Frontend)

### 4.1 Assistant Reversal Dialog
When an `ASSISTANT` clicks "Reverse sale" on a completed receipt or from the Sales History list:
- A modal dialog opens with:
  - Title: **Supervisor Authorization Required**
  - Prompt: *"Ask your store Owner or Admin for a 6-digit reversal code."*
  - 6-cell numeric code input (autofocus, paste-friendly).
  - Reason dropdown: `CUSTOMER_RETURN`, `BILLING_ERROR`, `DAMAGED_PRODUCT`, `OTHER`.
  - Reversal Note textarea.
  - Buttons: **Confirm Reversal** (disabled until 6 digits entered) and **Cancel**.

### 4.2 Owner / Admin Action
On the Owner/Admin dashboard or Sales view:
- A button: **Generate Reversal Code**.
- Displays an accessible modal with the 6-digit code in large monospace font, a live 15-minute countdown progress bar, and a **Copy Code** button.

---

## 5. Review Gates & Approvals

- **Proposed by:** Victor Oyeleke (Interface Engineer, 2026-10-28)
- **Pending Reviewers:**
  - Isaac Bassey (API & Access Owner)
  - Nnaemeka Chukwuma (Data & Rules Owner)
