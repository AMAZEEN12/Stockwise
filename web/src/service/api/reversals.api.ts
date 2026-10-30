import { authApi } from './auth.api';
import { reversalsEndpoints } from '../endpoints/reversals.endpoints';
import { isReversalSimulation } from '../../features/sales/reversal-simulation';
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
      queryFn: async (body, _api, _options, baseQuery) => {
        if (!isReversalSimulation()) return {error:{status:403,code:'SIMULATION_ONLY',fields:{}}};
        const result = await baseQuery({
        url: reversalsEndpoints.authorizations,
        method: 'POST',
        data: body,
        });
        return result.error ? {error:result.error} : {data:result.data as ReversalAuthorization};
      },
    }),
    reverseSale: builder.mutation<
      SaleReversalResponse,
      { saleId: string; body: SaleReversalRequest; key: string }
    >({
      queryFn: async ({ saleId, body, key }, _api, _options, baseQuery) => {
        if (!isReversalSimulation()) return {error:{status:403,code:'SIMULATION_ONLY',fields:{}}};
        const result = await baseQuery({
        url: reversalsEndpoints.reversal(saleId),
        method: 'POST',
        data: body,
        headers: { 'Idempotency-Key': key },
        });
        return result.error ? {error:result.error} : {data:result.data as SaleReversalResponse};
      },
      invalidatesTags: (_data, error) =>
        error ? [] : ['Products', 'Customers', 'Sales'],
    }),
  }),
});

export const { useGenerateReversalCodeMutation, useReverseSaleMutation } = reversalsApi;

