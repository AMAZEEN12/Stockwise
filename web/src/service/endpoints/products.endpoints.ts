export const productsEndpoints = {
  list: '/products',
  detail: (id: string) => `/products/${encodeURIComponent(id)}`,
  movements: (id: string) => `/products/${encodeURIComponent(id)}/movements`,
};
