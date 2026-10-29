export const portalEndpoints = {
  details: (token: string) => `/portal/customer/${encodeURIComponent(token)}`,
  products: (token: string) => `/portal/customer/${encodeURIComponent(token)}/products`,
  orders: (token: string) => `/portal/customer/${encodeURIComponent(token)}/orders`,
};
