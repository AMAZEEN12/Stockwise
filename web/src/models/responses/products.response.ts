import type { components } from '../../api/schema';
export type Product = components['schemas']['Product'];
export type ProductPage = components['schemas']['ProductPage'];
export type StockState = components['schemas']['StockState'];

/** Client view over existing product pages; these are not additional wire fields. */
export interface SaleCatalogue {
  query: string;
  items: Product[];
  nextPage: number | null;
}
