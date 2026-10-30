import type { components } from '../../api/schema';

export type RestockCreate = components['schemas']['RestockCreate'];
export interface RestockFilters { productId?: string; page?: number; size?: number }
