import { authApi } from './auth.api';
import { productsEndpoints } from '../endpoints/products.endpoints';
import type { Product, ProductPage } from '../../models/responses/products.response';
import type { ProductCreate, ProductFilters } from '../../models/requests/products.request';
export const productsApi = authApi.injectEndpoints({ endpoints: (builder) => ({
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
  product: builder.query<Product, string>({ query: (id) => ({url: productsEndpoints.detail(id)}) }),
  createProduct: builder.mutation<Product, ProductCreate>({ query: (data) => ({url: productsEndpoints.list, method: 'POST', data}), invalidatesTags: ['Products'] }),
}) });
export const { useProductsQuery, useCatalogueQuery, useCreateProductMutation } = productsApi;
