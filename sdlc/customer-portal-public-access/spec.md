# Specification: Customer Portal Public Access

**Change slug:** `customer-portal-public-access`  
**Derived from:** `intent.md`, `docs/customer-portal-store-credit-proposal.md`  
**Status:** Accepted  
**Approver:** Nnaemeka Chukwuma (Data & Rules) & Isaac Bassey (API & Access)  
**Date:** 2026-11-03  

---

## 1. Requirements

### R-PORTAL-1: Public Unauthenticated Spring Security Configuration
* Requests matching `GET /api/v1/portal/customer/**` and `POST /api/v1/portal/customer/*/orders` must be accessible without an `Authorization` header.
* Spring Security's `oauth2ResourceServer` filter must permit these paths anonymously.
* Administrative routes (`/api/v1/products`, `/api/v1/sales`, `/api/v1/customers`, `/api/v1/reversals`) remain strictly guarded.

### R-PORTAL-2: Customer & Shop Profile Lookup (`GET /api/v1/portal/customer/{token}`)
* **Path:** `GET /api/v1/portal/customer/{token}`
* **Response (200 OK):**
  ```json
  {
    "shop": {
      "name": "Ngozi Provisions Store",
      "address": "Shop 4, TeSA Commercial Hub, Lagos",
      "currency": "NGN",
      "whatsappPhone": "+2348021234567"
    },
    "customer": {
      "id": "uuid",
      "displayName": "Ada Okafor",
      "balanceKobo": 150000,
      "storeCreditKobo": 300000,
      "hasDebtActivity": true,
      "hasStoreCreditActivity": true
    },
    "tokenExpiresAt": "2026-12-03T10:00:00Z"
  }
  ```
* **Error Behaviors:**
  * If token is `expired-token`: HTTP 410 with `code: "TOKEN_EXPIRED"`.
  * If customer not found: HTTP 404 with `code: "NOT_FOUND"`.

### R-PORTAL-3: Live Catalogue Lookup (`GET /api/v1/portal/customer/{token}/products`)
* **Path:** `GET /api/v1/portal/customer/{token}/products?q={query}`
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "name": "Golden Penny Spaghetti 500g",
        "priceKobo": 98000,
        "quantity": 25,
        "active": true
      }
    ],
    "totalItems": 1
  }
  ```
* Filters: Only products with `active = true` and `quantity > 0`. If `q` is non-empty, performs case-insensitive substring match on product name.

### R-PORTAL-4: Customer Pre-Order Placement (`POST /api/v1/portal/customer/{token}/orders`)
* **Path:** `POST /api/v1/portal/customer/{token}/orders`
* **Request Body:**
  ```json
  {
    "lines": [
      { "productId": "uuid", "quantity": 2 }
    ],
    "paymentPreference": "USE_STORE_CREDIT",
    "pickupNote": "Will pick up around 5 PM"
  }
  ```
* **Validation & Execution Rules:**
  * Must contain at least one line with quantity $\ge 1$.
  * All referenced products must exist, be active, and have available stock $\ge \text{quantity}$.
  * If stock is insufficient: HTTP 409 `INSUFFICIENT_STOCK`.
  * Computes total integer kobo. If `paymentPreference == "USE_STORE_CREDIT"`, calculates `storeCreditAppliedKobo = min(customer.storeCreditKobo, totalKobo)`.
  * Generates an order number: `ORD-` + date + `-` + sequence.
  * Formats WhatsApp order link with pre-filled message: `https://wa.me/2348021234567?text=...`.
* **Response (201 Created):**
  ```json
  {
    "orderNumber": "ORD-20261103-0042",
    "customerName": "Ada Okafor",
    "itemsCount": 2,
    "totalKobo": 196000,
    "storeCreditAppliedKobo": 196000,
    "paymentPreference": "USE_STORE_CREDIT",
    "pickupNote": "Will pick up around 5 PM",
    "createdAt": "2026-11-03T10:45:00Z",
    "whatsappUrl": "https://wa.me/2348021234567?text=..."
  }
  ```
