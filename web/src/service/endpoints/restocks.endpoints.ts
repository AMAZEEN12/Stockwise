export const restocksEndpoints = {
  list: '/restocks',
  detail: (id: string) => `/restocks/${encodeURIComponent(id)}`,
};
