import { authApi } from './auth.api';
import { DASHBOARD_ENDPOINTS } from '../endpoints/dashboard.endpoints';
import type { Dashboard } from '../../models/responses/dashboard.response';

export const dashboardApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    dashboard: builder.query<Dashboard, void>({
      query: () => ({ url: DASHBOARD_ENDPOINTS.DASHBOARD }),
      providesTags: ['Sales', 'Products', 'Customers'],
    }),
  }),
});

export const { useDashboardQuery } = dashboardApi;

