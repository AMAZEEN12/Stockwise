import { createUuid } from '../../shared/utils/uuid';
import {authApi} from './auth.api';
import {customersEndpoints} from '../endpoints/customers.endpoints';
import type {Customer, CustomerPage, LedgerPage} from '../../models/responses/customers.response';
import type {CustomerCreate, StoreCreditGrantRequest} from '../../models/requests/customers.request';

export function validCustomer(value:unknown):value is Customer {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Customer>;
  return typeof item.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
    && typeof item.displayName === 'string' && !!item.displayName.trim() && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt))
    && Number.isSafeInteger(item.balanceKobo) && item.balanceKobo! >= 0 && Number.isSafeInteger(item.storeCreditKobo) && item.storeCreditKobo! >= 0
    && typeof item.hasDebtActivity === 'boolean' && typeof item.hasStoreCreditActivity === 'boolean'
    && (item.contactPlaceholder === undefined || typeof item.contactPlaceholder === 'string');
}

export function validLedgerPage(value: unknown): value is LedgerPage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<LedgerPage>;
  return (
    typeof page.customerId === 'string' &&
    Number.isSafeInteger(page.balanceKobo) &&
    Number.isSafeInteger(page.storeCreditKobo) &&
    Number.isSafeInteger(page.page) &&
    Number.isSafeInteger(page.size) &&
    Number.isSafeInteger(page.totalItems) &&
    Array.isArray(page.items) &&
    page.items.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        ['CREDIT_SALE', 'REPAYMENT', 'REVERSAL', 'STORE_CREDIT'].includes(item.sourceType) &&
        Number.isSafeInteger(item.deltaKobo) &&
        Number.isSafeInteger(item.balanceAfterKobo) &&
        Number.isSafeInteger(item.storeCreditAfterKobo) &&
        typeof item.createdAt === 'string' &&
        Number.isFinite(Date.parse(item.createdAt))
    )
  );
}

export const customersApi = authApi.injectEndpoints({endpoints:(builder) => ({
  customers:builder.query<Customer[],void>({
    async queryFn(_argument,_api,_options,baseQuery) {
      const items:Customer[] = [];
      const seen = new Set<string>();
      for (let page = 0; ; page++) {
        const result = await baseQuery({url:customersEndpoints.list, params:{page,size:100}});
        if (result.error) return {error:result.error};
        const data = result.data as CustomerPage;
        if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.totalItems) || data.totalItems < 0 || data.page !== page
          || data.items.some((item) => !validCustomer(item) || seen.has(item.id)) || new Set(data.items.map((item) => item.id)).size !== data.items.length || (!data.items.length && items.length < data.totalItems)) {
          return {error:{status:'NETWORK',fields:{},code:'INVALID_CUSTOMER_RESPONSE'}};
        }
        for (const item of data.items) {seen.add(item.id); items.push(item);}
        if (items.length >= data.totalItems) return {data:items};
      }
    }, providesTags:['Customers'],
  }),
  customerLedger: builder.query<LedgerPage, { customerId: string; page?: number; size?: number }>({
    async queryFn({ customerId, page = 0, size = 50 }, _api, _options, baseQuery) {
      const result = await baseQuery({
        url: customersEndpoints.ledger(customerId),
        params: { page, size },
      });
      if (result.error) return { error: result.error };
      if (!validLedgerPage(result.data)) {
        return { error: { status: 'NETWORK', fields: {}, code: 'INVALID_LEDGER_RESPONSE' } };
      }
      return { data: result.data };
    },
    providesTags: (_result, _error, { customerId }) => [{ type: 'Customers', id: `${customerId}-ledger` }],
  }),
  createCustomer:builder.mutation<Customer,CustomerCreate>({
    query:(data) => ({url:customersEndpoints.list,method:'POST',data}),
    invalidatesTags:(_result,error) => error ? [] : ['Customers'],
  }),
  issueStoreCredit:builder.mutation<Customer,{customerId:string;body:StoreCreditGrantRequest}>({
    query:({customerId,body}) => ({
      url:customersEndpoints.storeCredit(customerId),
      method:'POST',
      headers:{'Idempotency-Key':createUuid()},
      data:body,
    }),
    invalidatesTags:(_result,error) => error ? [] : ['Customers'],
  }),
})});
export const {useCustomersQuery,useCustomerLedgerQuery,useCreateCustomerMutation,useIssueStoreCreditMutation} = customersApi;
