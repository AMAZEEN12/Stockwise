import type { components } from '../../api/schema';

export type ReversalReason = components['schemas']['ReversalReason'];
export type ReversalAuthorizationCreate = Omit<components['schemas']['ReversalAuthorizationCreate'], 'validMinutes'> & { validMinutes?: number };
export type SaleReversalRequest = components['schemas']['SaleReversalRequest'];
