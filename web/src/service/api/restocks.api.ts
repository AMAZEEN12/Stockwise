import { authApi } from './auth.api';
import { restocksEndpoints } from '../endpoints/restocks.endpoints';
import type { RestockCreate, RestockFilters } from '../../models/requests/restocks.request';
import type { Restock, RestockPage } from '../../models/responses/restocks.response';

export const restocksApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    restocks: builder.query<RestockPage, RestockFilters>({
      query: (params) => ({ url: restocksEndpoints.list, params }),
      providesTags: ['Restocks'],
    }),
    restock: builder.query<Restock, string>({
      query: (id) => ({ url: restocksEndpoints.detail(id) }),
      providesTags: ['Restocks'],
    }),
    createRestock: builder.mutation<Restock, { body: RestockCreate; key: string }>({
      query: ({ body, key }) => ({
        url: restocksEndpoints.list,
        method: 'POST',
        data: body,
        headers: { 'Idempotency-Key': key },
      }),
      invalidatesTags: (_data, error) => error ? [] : ['Products', 'Restocks'],
    }),
  }),
});

export const { useRestocksQuery, useRestockQuery, useCreateRestockMutation } = restocksApi;
