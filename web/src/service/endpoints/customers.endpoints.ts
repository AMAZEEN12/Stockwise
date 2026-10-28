export const customersEndpoints = {
  list: '/customers',
  storeCredit: (customerId: string) => `/customers/${customerId}/store-credit`,
};

