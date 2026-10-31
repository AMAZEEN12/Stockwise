import type { components } from '../../api/schema';
export type ProductCreate = components['schemas']['ProductCreate'];
export interface ProductFilters { q?: string; category?: string; stockState?: components['schemas']['StockState']; page?: number; size?: number }

export interface ProductUpdate {
  name?: string;
  reference?: string;
  category?: string;
  priceKobo?: number;
  lowStockThreshold?: number;
  active?: boolean;
}
