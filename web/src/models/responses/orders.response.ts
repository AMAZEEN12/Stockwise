export interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
}

export interface PickupOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  itemsCount: number;
  totalKobo: number;
  storeCreditAppliedKobo: number;
  paymentPreference: "PAY_ON_PICKUP" | "ON_ACCOUNT" | "USE_STORE_CREDIT";
  pickupNote?: string;
  status: "PENDING_PICKUP" | "FULFILLED" | "CANCELLED";
  createdAt: string;
  fulfilledAt?: string;
  saleId?: string;
}

