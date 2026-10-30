export type ReversalReason =
  | 'CUSTOMER_RETURN'
  | 'BILLING_ERROR'
  | 'DAMAGED_PRODUCT'
  | 'OTHER';

export interface ReversalAuthorizationCreate {
  saleId: string;
  validMinutes?: number;
}

export interface SaleReversalRequest {
  reason: ReversalReason;
  note?: string;
  authorizationCode?: string;
}

