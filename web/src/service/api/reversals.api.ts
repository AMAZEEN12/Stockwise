import { authApi } from './auth.api';
import { reversalsEndpoints } from '../endpoints/reversals.endpoints';
import type {
  ReversalAuthorizationCreate,
  SaleReversalRequest,
} from '../../models/requests/reversals.request';
import type {
  ReversalAuthorization,
  SaleReversalResponse,
} from '../../models/responses/reversals.response';

export const reversalsApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    generateReversalCode: builder.mutation<ReversalAuthorization, ReversalAuthorizationCreate>({
      query: (body) => ({
        url: reversalsEndpoints.authorizations,
        method: 'POST',
        data: body,
      }),
    }),
    reverseSale: builder.mutation<
      SaleReversalResponse,
      { saleId: string; body: SaleReversalRequest; key: string }
    >({
      query: ({ saleId, body, key }) => ({
        url: reversalsEndpoints.reversal(saleId),
        method: 'POST',
        data: body,
        headers: { 'Idempotency-Key': key },
      }),
      invalidatesTags: (_data, error) =>
        error ? [] : ['Products', 'Customers', 'Sales'],
    }),
  }),
});

export const { useGenerateReversalCodeMutation, useReverseSaleMutation } = reversalsApi;

