import {authApi} from './auth.api';
import {salesEndpoints} from '../endpoints/sales.endpoints';
import type {SaleCreate} from '../../models/requests/sales.request';
import type {Sale} from '../../models/responses/sales.response';
export const salesApi = authApi.injectEndpoints({endpoints:(builder) => ({
  createSale:builder.mutation<Sale,{body:SaleCreate;key:string}>({query:({body,key}) => ({url:salesEndpoints.list,method:'POST',data:body,headers:{'Idempotency-Key':key}}), invalidatesTags:(_data,error) => error ? [] : ['Products','Customers','Sales']}),
  sale:builder.query<Sale,string>({query:(id) => ({url:salesEndpoints.detail(id)})}),
})});
export const {useCreateSaleMutation,useSaleQuery} = salesApi;
