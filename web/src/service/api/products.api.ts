import { authApi } from './auth.api';
import { productsEndpoints } from '../endpoints/products.endpoints';
import type { MovementPage, Product, ProductPage, SaleCatalogue } from '../../models/responses/products.response';
import type { ProductCreate, ProductFilters, ProductUpdate } from '../../models/requests/products.request';
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
  patchProduct: builder.mutation<Product, { id: string; version: number; data: ProductUpdate }>({
    query: ({ id, version, data }) => ({
      url: productsEndpoints.detail(id),
      method: 'PATCH',
      headers: {
        'If-Match': `"${version}"`,
      },
      data,
    }),
    async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
      const patches: { undo: () => void }[] = [];

      const patchDetail = dispatch(
        productsApi.util.updateQueryData('product', id, (draft) => {
          if (data.name !== undefined) draft.name = data.name;
          if (data.reference !== undefined) draft.reference = data.reference;
          if (data.category !== undefined) draft.category = data.category;
          if (data.priceKobo !== undefined) draft.priceKobo = data.priceKobo;
          if (data.lowStockThreshold !== undefined) draft.lowStockThreshold = data.lowStockThreshold;
          if (data.active !== undefined) {
            draft.active = data.active;
            draft.stockState = !data.active ? 'ARCHIVED' : (draft.quantity === 0 ? 'OUT' : draft.quantity <= draft.lowStockThreshold ? 'LOW' : 'IN_STOCK');
          }
        })
      );
      patches.push(patchDetail);

      const state = getState() as Record<string, any>;
      const apiState = state[productsApi.reducerPath] || state.stockwiseApi || state.authApi || state.api || {};
      const queries = (apiState.queries || {}) as Record<string, { endpointName?: string; originalArgs?: ProductFilters; data?: ProductPage }>;
      for (const q of Object.values(queries)) {
        if (q && q.endpointName === 'products' && q.originalArgs && q.data?.items?.some((p) => p.id === id)) {
          const patchList = dispatch(
            productsApi.util.updateQueryData('products', q.originalArgs, (draft) => {
              const item = draft.items.find((p) => p.id === id);
              if (item) {
                if (data.name !== undefined) item.name = data.name;
                if (data.reference !== undefined) item.reference = data.reference;
                if (data.category !== undefined) item.category = data.category;
                if (data.priceKobo !== undefined) item.priceKobo = data.priceKobo;
                if (data.lowStockThreshold !== undefined) item.lowStockThreshold = data.lowStockThreshold;
                if (data.active !== undefined) {
                  item.active = data.active;
                  item.stockState = !data.active ? 'ARCHIVED' : (item.quantity === 0 ? 'OUT' : item.quantity <= item.lowStockThreshold ? 'LOW' : 'IN_STOCK');
                }
              }
            })
          );
          patches.push(patchList);
        }
      }

      try {
        const { data: updated } = await queryFulfilled;
        dispatch(
          productsApi.util.updateQueryData('product', id, (draft) => {
            Object.assign(draft, updated);
          })
        );
      } catch {
        for (const patch of patches) {
          patch.undo();
        }
      }
    },
    invalidatesTags: (_result, error, { id }) => (error ? [] : [{ type: 'Products', id }, 'Products']),
  }),
}) });
export const { useProductsQuery, useProductQuery, useCatalogueQuery, useSaleCatalogueQuery, useProductMovementsQuery, useCreateProductMutation, usePatchProductMutation } = productsApi;
