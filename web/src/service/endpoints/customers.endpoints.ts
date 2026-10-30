export const customersEndpoints = {
  list: '/customers',
  storeCredit: (customerId: string) => `/customers/${customerId}/store-credit`,
  ledger: (customerId: string) => `/customers/${customerId}/ledger`,
};

