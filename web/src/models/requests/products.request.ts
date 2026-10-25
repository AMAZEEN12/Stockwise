import type { components } from '../../api/schema';
export type ProductCreate = components['schemas']['ProductCreate'];
export interface ProductFilters { q?: string; category?: string; stockState?: components['schemas']['StockState']; page?: number; size?: number }
