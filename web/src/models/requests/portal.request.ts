export interface PortalOrderLine {
  productId: string;
  quantity: number;
}

export type PortalPaymentPreference = "USE_STORE_CREDIT" | "PAY_ON_PICKUP" | "ON_ACCOUNT";

export interface CreatePortalOrderRequest {
  lines: PortalOrderLine[];
  paymentPreference: PortalPaymentPreference;
  pickupNote?: string;
}
