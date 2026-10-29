export const reversalsEndpoints = {
  authorizations: '/reversals/authorizations',
  reversal: (saleId: string) => `/sales/${saleId}/reversal`,
};

