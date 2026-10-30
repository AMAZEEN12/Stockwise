import type { components } from '../../api/schema';
import type { operations } from '../../api/schema';
export type SaleCreate = components['schemas']['SaleCreate'] & {
  useStoreCredit?: boolean;
};
export type SalesFilters = NonNullable<operations['listSales']['parameters']['query']>;

