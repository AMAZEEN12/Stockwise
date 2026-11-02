export const ordersEndpoints = {
  list: (params?: { status?: string }) => {
    return params?.status
      ? `/orders?status=${encodeURIComponent(params.status)}`
      : "/orders";
  },
  fulfill: (id: string) => `/orders/${encodeURIComponent(id)}/fulfill`,
};

