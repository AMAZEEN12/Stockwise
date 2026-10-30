import { authApi } from './auth.api';
import { productsEndpoints } from '../endpoints/products.endpoints';
import type { MovementPage, Product, ProductPage, SaleCatalogue } from '../../models/responses/products.response';
import type { ProductCreate, ProductFilters } from '../../models/requests/products.request';
import { compareProductNames, validSaleCataloguePage } from '../../shared/product-catalogue';
export const productsApi = authApi.injectEndpoints({ endpoints: (builder) => ({
  saleCatalogue: builder.query<SaleCatalogue, {q:string;throughPage:number}>({
    async queryFn({q,throughPage},api,_options,baseQuery) {
      const items:Product[]=[];
      const ids=new Set<string>();
      let total:number|undefined;
      let received=0;
      // Re-read the prefix rather than mixing a new page with stale stock/prices.
      // Archived-only pages are skipped until another visible batch or the end.
      for(let page=0; ;page++) {
        if(api.signal.aborted)return {error:{status:'CANCELLED',fields:{}}};
        const result=await baseQuery({url:productsEndpoints.list,params:{q,page,size:20}});
        if(result.error)return {error:result.error};
        const data=result.data;
        if(!validSaleCataloguePage(data,page,ids) || (total!==undefined && data.totalItems!==total)) {
          return {error:{status:502,code:'INVALID_PRODUCT_CATALOGUE',fields:{}}};
        }
        total=data.totalItems;
        received+=data.items.length;
        if(received>total || (!data.items.length && received<total)) {
          return {error:{status:502,code:'INVALID_PRODUCT_CATALOGUE',fields:{}}};
        }
        for(const product of data.items) {
          ids.add(product.id);
          if(product.active)items.push(product);
        }
        const complete=received===total;
        if(complete || (page>=throughPage && data.items.some((product)=>product.active))) {
          return {data:{query:q,items:items.sort(compareProductNames),nextPage:complete ? null : page+1}};
        }
      }
    },providesTags:['Products'],
  }),
  catalogue: builder.query<Product[], void>({
    async queryFn(_argument, _api, _options, baseQuery) {
      const items: Product[] = [];
      for (let page = 0; ; page++) {
        const result = await baseQuery({url:productsEndpoints.list, params:{page,size:100}});
        if (result.error) return {error:result.error};
        const data = result.data as ProductPage;
        items.push(...data.items);
        if (!data.items.length || items.length >= data.totalItems) return {data:items};
      }
    }, providesTags:['Products'],
  }),
  products: builder.query<ProductPage, ProductFilters>({ query: (params) => ({url: productsEndpoints.list, params}), providesTags: ['Products'] }),
  product: builder.query<Product, string>({ query: (id) => ({url: productsEndpoints.detail(id)}), providesTags: ['Products'] }),
  productMovements: builder.query<MovementPage, { productId: string; page?: number; size?: number }>({
    query: ({ productId, page = 0, size = 50 }) => ({
      url: productsEndpoints.movements(productId),
      params: { page, size },
    }),
    providesTags: (_result, _error, { productId }) => [{ type: 'Products', id: `${productId}-movements` }, 'Products'],
  }),
  createProduct: builder.mutation<Product, ProductCreate>({ query: (data) => ({url: productsEndpoints.list, method: 'POST', data}), invalidatesTags: ['Products'] }),
}) });
export const { useProductsQuery, useProductQuery, useCatalogueQuery, useSaleCatalogueQuery, useProductMovementsQuery, useCreateProductMutation } = productsApi;
