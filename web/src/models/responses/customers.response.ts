import type {components} from '../../api/schema';
export type Customer = components['schemas']['Customer'];
export type CustomerPage = components['schemas']['CustomerPage'];
export type LedgerEntry = components['schemas']['LedgerEntry'];
export type LedgerPage = components['schemas']['LedgerPage'];
export type LedgerSourceType = components['schemas']['LedgerSourceType'];

export interface RepaymentResponse {
  id: string;
  customerId: string;
  amountKobo: number;
  balanceAfterKobo: number;
  createdAt: string;
}

