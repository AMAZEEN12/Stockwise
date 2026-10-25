export const productsEndpoints = { list: '/products', detail: (id: string) => `/products/${encodeURIComponent(id)}` };
