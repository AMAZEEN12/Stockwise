import type {components} from '../../api/schema';
export type CustomerCreate = components['schemas']['CustomerCreate'];

export interface StoreCreditGrantRequest {
  amountKobo: number;
  reason: string;
  note?: string;
}

