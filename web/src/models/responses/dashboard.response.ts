import type { components } from '../../api/schema';

export type Dashboard = components['schemas']['Dashboard'];
export type TodaySales = Dashboard['todaySales'];
export type LowStockProduct = Dashboard['lowStock'][number];
export type RecentSale = Dashboard['recentSales'][number];

