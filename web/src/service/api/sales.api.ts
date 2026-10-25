import {authApi} from './auth.api';
import {salesEndpoints} from '../endpoints/sales.endpoints';
import type {SaleCreate,SalesFilters} from '../../models/requests/sales.request';
import type {Sale,SalePage} from '../../models/responses/sales.response';
import {validHistorySale} from '../../shared/sales-history-validation';
export const salesApi = authApi.injectEndpoints({endpoints:(builder) => ({
  // retrievedAt is client cache metadata, not an additional API response field.
  salesHistory:builder.query<SalePage & {retrievedAt:number},{filters:SalesFilters;throughPage:number}>({
    async queryFn({filters,throughPage},_api,_options,baseQuery) {
      const items:Sale[]=[];
      const ids=new Set<string>();
      let total:number|undefined;
      // Re-read the displayed prefix so refresh never appends a newer page to stale rows.
      for(let page=0;page<=throughPage;page++) {
        const result=await baseQuery({url:salesEndpoints.list,params:{...filters,page,size:20}});
        if(result.error)return {error:result.error};
        const data=result.data as SalePage;
        if(!data || !Array.isArray(data.items) || data.page!==page || data.size!==20 || !Number.isSafeInteger(data.totalItems) || data.totalItems<0
          || (total!==undefined && total!==data.totalItems) || data.items.length>20 || data.items.some((sale)=>!validHistorySale(sale) || ids.has(sale.id))) {
          return {error:{status:502,code:'INVALID_HISTORY',fields:{}}};
        }
        total=data.totalItems;
        for(const sale of data.items){if(ids.has(sale.id))return {error:{status:502,code:'INVALID_HISTORY',fields:{}}};ids.add(sale.id);items.push(sale);}
        if(items.length>total || (!data.items.length && items.length<total))return {error:{status:502,code:'INVALID_HISTORY',fields:{}}};
        if(items.length>=total || page===throughPage)return {data:{...data,items,retrievedAt:Date.now()}};
      }
      return {error:{status:502,code:'INVALID_HISTORY',fields:{}}};
    },providesTags:['Sales'],
  }),
  createSale:builder.mutation<Sale,{body:SaleCreate;key:string}>({query:({body,key}) => ({url:salesEndpoints.list,method:'POST',data:body,headers:{'Idempotency-Key':key}}), invalidatesTags:(_data,error) => error ? [] : ['Products','Customers','Sales']}),
  sale:builder.query<Sale,string>({query:(id) => ({url:salesEndpoints.detail(id)})}),
})});
export const {useSalesHistoryQuery,useCreateSaleMutation,useSaleQuery} = salesApi;
