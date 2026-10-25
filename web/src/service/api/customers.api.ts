import {authApi} from './auth.api';
import {customersEndpoints} from '../endpoints/customers.endpoints';
import type {Customer, CustomerPage} from '../../models/responses/sales.response';
export const customersApi = authApi.injectEndpoints({endpoints:(builder) => ({
  customers:builder.query<Customer[],void>({
    async queryFn(_argument,_api,_options,baseQuery) {
      const items:Customer[] = [];
      for (let page = 0; ; page++) {
        const result = await baseQuery({url:customersEndpoints.list, params:{page,size:100}});
        if (result.error) return {error:result.error};
        const data = result.data as CustomerPage; items.push(...data.items);
        if (!data.items.length || items.length >= data.totalItems) return {data:items};
      }
    }, providesTags:['Customers'],
  }),
})});
export const {useCustomersQuery} = customersApi;
