import type {components} from '../../api/schema';
export type CustomerCreate = components['schemas']['CustomerCreate'];

export interface StoreCreditGrantRequest {
  amountKobo: number;
  reason: string;
  note?: string;
}

export interface CustomerRepaymentRequest {
  customerId: string;
  amountKobo: number;
  note?: string;
}

