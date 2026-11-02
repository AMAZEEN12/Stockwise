import type { PortalPaymentPreference } from "../requests/portal.request";

export interface PortalShopInfo {
  name: string;
  address: string;
  currency: string;
  whatsappPhone?: string;
}

export interface PortalCustomerInfo {
  id?: string;
  displayName: string;
  balanceKobo: number;
  storeCreditKobo: number;
  hasDebtActivity: boolean;
  hasStoreCreditActivity: boolean;
  paymentDueAt?: string | null;
}

export interface PortalStatementEntry {
  id: string;
  sourceType: string;
  sourceId?: string | null;
  deltaKobo: number;
  balanceAfterKobo: number;
  storeCreditAfterKobo: number;
  createdAt: string;
}

export interface CustomerPortalDetailsResponse {
  shop: PortalShopInfo;
  customer: PortalCustomerInfo;
  statement?: PortalStatementEntry[];
  tokenExpiresAt: string;
}

export interface PortalProduct {
  id: string;
  name: string;
  priceKobo: number;
  quantity: number;
  active: boolean;
}

export interface PortalProductsResponse {
  items: PortalProduct[];
  totalItems: number;
}

export interface CreatePortalOrderResponse {
  orderNumber: string;
  customerName: string;
  itemsCount: number;
  totalKobo: number;
  storeCreditAppliedKobo: number;
  paymentPreference: PortalPaymentPreference;
  pickupNote?: string;
  createdAt: string;
  whatsappUrl?: string;
}
