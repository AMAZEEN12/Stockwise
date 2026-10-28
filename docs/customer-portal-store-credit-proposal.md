# Customer Portal & Store Credit: Contract & UI Architecture Proposal

**Date:** 2026-10-28  
**Proposed by:** Interface Engineer (Victor Oyeleke; logged by Codex)  
**Status:** DRAFT Proposal — Pending two-engineer contract sign-off: Isaac Bassey (API & Access) and Nnaemeka Chukwuma (Data & Rules).

---

## 1. Executive Summary & Store Adoption Strategy

### 1.1 The Business Objective
Small retail shops in Nigeria (groceries, provisions, neighborhood pharmacies, mini-supermarkets) struggle with two chronic friction points:
1. **Debt Recovery & Reconciliation Friction:** Awkward debt-chasing, disputed receipts, forgotten balances, and customer claims like *"I thought I paid for that last week."*
2. **Cash Drain on Returns:** Offering cash refunds reduces available cash flow, while offering informal IOUs on paper scrap leads to fraud and leakage.

This proposal introduces a two-sided solution:
- **Shop-facing Store Credit System:** A formal, audit-trailed store credit ledger allowing shops to issue credit for returned goods, customer cash advance deposits, or customer goodwill without cash drain.
- **Customer Self-Service Portal (`/c/:token`):** A zero-login, tokenized web portal where trusted customers can review their live debt and store credit statements, view store catalogue, and place online click-and-collect orders.

### 1.2 What Makes Stores Want to Adopt This?

| Store Pain Point | Stockwise Solution | Adoption Incentive |
|---|---|---|
| **Awkward debt chasing** | Customers can check their own statement anytime at `/c/:token` from a link shared via WhatsApp or SMS. | Cuts payment disputes and eliminates the social awkwardness of debt reminders. |
| **Cash drain on customer returns** | Return transactions credit the customer's account (`POST /customers/{id}/store-credit`) rather than paying out cash. | Preserves store working capital and guarantees repeat footfall. |
| **Counter congestion during peak hours** | Regular customers submit pre-orders online; shop assistant packs items in advance for fast counter collection. | Increases shop turnover without hiring more staff or expanding shop floor space. |
| **Customer leakage to competing shops** | Store credit cannot be spent elsewhere; shoppers return to burn their store credit balance. | Directly drives customer loyalty and increases repeat customer lifetime value. |
| **Password & app install drop-off** | Tokenized URLs (`/c/{customerToken}`) require zero app installation and zero password creation. | 100% immediate accessibility on WhatsApp across all smartphone tiers. |

---

## 2. Store Credit Architecture (Proposed by Interface Engineer)

### 2.1 Ledger & Invariants
- **Data Model:** Store credit is an integer kobo field (`store_credit_kobo BIGINT NOT NULL DEFAULT 0 CHECK (store_credit_kobo >= 0)`), backed by append-only rows in `ledger_entry` with types `STORE_CREDIT_INC` and `STORE_CREDIT_DEC`.
- **Rule DM5 Reaffirmed:** Store credit is never negative. When paying a sale:
  $$\text{storeCreditApplied} = \min(\text{customer.storeCreditKobo}, \text{subtotalKobo})$$
- **No Automatic Netting:** Debt (`balance_kobo`) and Store Credit (`store_credit_kobo`) are tracked as distinct ledgers. A customer who owes ₦5,000 debt from a credit sale and has ₦2,000 in store credit from a returned carton is NOT automatically netted to ₦3,000 without an explicit settlement action.

### 2.2 Proposed Service Endpoints

#### Endpoint A: Issue Store Credit
- **Method & Path:** `POST /api/v1/customers/{id}/store-credit`
- **Authorized Roles:** `OWNER`, `ADMIN`
- **Headers:** `Idempotency-Key: <UUID>` (Required)
- **Request Body (`CustomerStoreCreditGrant`):**
  ```json
  {
    "amountKobo": 500000,
    "reason": "RETURN_REFUND",
    "note": "Returned 1x Dettol 500ml unopened with receipt"
  }
  ```
  - `reason` enum: `RETURN_REFUND`, `ADVANCE_DEPOSIT`, `OVERPAYMENT`, `LOYALTY_REWARD`, `MANUAL_ADJUSTMENT`.
  - `amountKobo`: Integer kobo, range `1 .. 9007199254740991`.
- **Response:** `201 Created`
  ```json
  {
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayName": "Ada Okafor",
      "contactPlaceholder": "+2348030000000",
      "balanceKobo": 0,
      "storeCreditKobo": 500000,
      "hasDebtActivity": false,
      "hasStoreCreditActivity": true,
      "createdAt": "2026-10-25T10:00:00Z"
    },
    "ledgerEntryId": "770e8400-e29b-41d4-a716-446655440011",
    "issuedAt": "2026-10-28T02:00:00Z"
  }
  ```

#### Endpoint B: Sale Checkout with Store Credit Split
- **Method & Path:** `POST /api/v1/sales`
- **Authorized Roles:** `OWNER`, `ASSISTANT`
- **Headers:** `Idempotency-Key: <UUID>`
- **Request Body Extension:**
  ```json
  {
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentMethod": "CASH",
    "useStoreCredit": true,
    "lines": [
      { "productId": "123e4567-e89b-12d3-a456-426614174000", "quantity": 2 }
    ]
  }
  ```
- **Service Transaction Semantics:**
  - If `useStoreCredit == true`:
    - Reads customer atomically `FOR UPDATE`.
    - Computes `storeCreditAppliedKobo = min(customer.storeCreditKobo, subtotalKobo)`.
    - If `storeCreditAppliedKobo > 0`: records `STORE_CREDIT_DEC` ledger entry.
    - If `paymentMethod == "CASH"`: remaining `amountPaidKobo = subtotalKobo - storeCreditAppliedKobo`.
    - If `paymentMethod == "CREDIT"`: remaining `debtAddedKobo = subtotalKobo - storeCreditAppliedKobo` (appends debt ledger entry).
- **Response Extension:**
  ```json
  {
    "id": "990e8400-e29b-41d4-a716-446655440099",
    "subtotalKobo": 660000,
    "storeCreditAppliedKobo": 500000,
    "cashPaidKobo": 160000,
    "debtAddedKobo": 0,
    "storeCreditRemainingKobo": 0,
    "createdAt": "2026-10-28T02:05:00Z"
  }
  ```

#### Endpoint C: Customer Ledger Statement
- **Method & Path:** `GET /api/v1/customers/{id}/ledger?page=0&size=20`
- **Authorized Roles:** `OWNER`, `ADMIN`, `ASSISTANT`
- **Response:**
  ```json
  {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440011",
        "entryType": "STORE_CREDIT_INC",
        "amountKobo": 500000,
        "balanceSnapshotKobo": 500000,
        "referenceId": "sale_or_receipt_uuid",
        "note": "Returned 1x Dettol 500ml",
        "recordedAt": "2026-10-28T02:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalItems": 1
  }
  ```

---

## 3. Customer Self-Service Online Screen (`/c/:token`)

### 3.1 Design Principles
1. **Zero Authentication Friction:** The customer accesses `/c/:token` directly via a URL link without needing an account, username, or password.
2. **Read-Only Ledger Transparency:** Displays exact integer-kobo balances for debt and store credit with full statement breakdown.
3. **Optimized Mobile Catalogue:** Lightweight product browsing with instant search and category filtering for pre-order placement.
4. **Click-and-Collect Submission:** Customer can assemble a cart and submit a pickup order.

### 3.2 Proposed Portal Endpoints

#### Endpoint P1: Portal Session & Balance Lookup
- **Method & Path:** `GET /api/v1/portal/customer/{token}`
- **Authentication:** Public (authenticated by cryptographically secure URL token, e.g., 256-bit random hex/base64url).
- **Response:**
  ```json
  {
    "shop": {
      "name": "Ngozi Provisions Store",
      "address": "Shop 4, TeSA Commercial Hub, Lagos",
      "currency": "NGN",
      "whatsappPhone": "+2348021234567"
    },
    "customer": {
      "displayName": "Ada Okafor",
      "balanceKobo": 150000,
      "storeCreditKobo": 300000,
      "hasDebtActivity": true,
      "hasStoreCreditActivity": true
    },
    "tokenExpiresAt": "2026-11-28T00:00:00Z"
  }
  ```

#### Endpoint P2: Portal Catalogue
- **Method & Path:** `GET /api/v1/portal/customer/{token}/products?q=&category=&page=0&size=50`
- **Filter:** Server returns active, in-stock products only (`stockState=IN_STOCK` or `LOW`). Archived or zero-stock products are omitted.

#### Endpoint P3: Customer Pre-Order Placement
- **Method & Path:** `POST /api/v1/portal/customer/{token}/orders`
- **Headers:** `Idempotency-Key: <UUID>`
- **Request Body:**
  ```json
  {
    "lines": [
      { "productId": "123e4567-e89b-12d3-a456-426614174000", "quantity": 1 }
    ],
    "paymentPreference": "USE_STORE_CREDIT",
    "pickupNote": "Will pick up around 5:30 PM today"
  }
  ```
- **Response (`201 Created`):**
  Returns order confirmation with unique `orderNumber` (e.g. `ORD-20261028-0042`), estimated total, and instant WhatsApp notification link.

---

## 4. UI Architecture & Implementation Plan

### 4.1 Shop Cashier View (`/app/sales/new`)
- In `NewSalePage.tsx`:
  - When a customer with `storeCreditKobo > 0` is selected in `CustomerPicker`, a green badge appears in the payment section:
    > **Store Credit Available: ₦3,000.00**
  - Cashier sees a toggle: `[x] Apply Store Credit (₦3,000.00)`.
  - The calculated breakdown updates instantly:
    - Subtotal: `₦4,500.00`
    - Store Credit Applied: `-₦3,000.00`
    - Cash Due: `₦1,500.00`

### 4.2 Customer Portal View (`/c/:token`)
- Mobile-first React route `web/src/features/portal/CustomerPortalPage.tsx`.
- Dark/light responsive theme retaining Stockwise brand tokens (`bg-background`, `accent`, `text-primary`).
- Header cards:
  - **Payment Owed (Debt):** `₦1,500.00` (or `—` if no debt activity).
  - **Store Credit:** `₦3,000.00` (or `—` if no credit activity).
- Tabs:
  1. **Order Online:** Catalogue grid with search, quantity stepper, and "Place Order" sticky footer.
  2. **My Account Statement:** Transaction history showing date, items, amounts, and payments.
  3. **Contact Shop:** One-click WhatsApp link pre-filled with order inquiry message.

---

## 5. Review Gates & Approvals

- **Proposed by:** Victor Oyeleke (Interface Engineer, 2026-10-28)
- **Pending Reviewers:**
  - Isaac Bassey (API and Access Owner) — to review endpoint paths, security token lifespan, and contract schema.
  - Nnaemeka Chukwuma (Data and Rules Owner) — to review ledger constraints, atomic locks, and database transaction boundaries.
