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
}

export interface CustomerPortalDetailsResponse {
  shop: PortalShopInfo;
  customer: PortalCustomerInfo;
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
