import type { Role } from './auth.response';

export interface ReversalAuthorization {
  code: string;
  saleId: string;
  expiresAt: string;
  generatedBy: string;
  generatedByRole: Role;
}

export interface SaleReversalResponse {
  reversalId: string;
  saleId: string;
  reversedAt: string;
  reversedBy: string;
  reason: string;
  note?: string;
  stockRestored: boolean;
  /** Development simulation only; not an agreed service response. */
  debtRemovedKobo?: number;
  storeCreditAddedKobo?: number;
}

