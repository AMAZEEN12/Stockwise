import { authApi } from "./auth.api";
import { ordersEndpoints } from "../endpoints/orders.endpoints";
import type { PickupOrder } from "../../models/responses/orders.response";

export const ordersApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    getPickupOrders: builder.query<PickupOrder[], { status?: string } | void>({
      query: (params) => ({
        url: ordersEndpoints.list(params || undefined),
        method: "GET",
      }),
      providesTags: ["Sales"],
    }),
    fulfillOrder: builder.mutation<
      PickupOrder,
      { orderId: string; saleId?: string }
    >({
      query: ({ orderId, saleId }) => ({
        url: ordersEndpoints.fulfill(orderId),
        method: "POST",
        data: { saleId },
      }),
      invalidatesTags: ["Sales", "Customers", "Products"],
    }),
  }),
});

export const { useGetPickupOrdersQuery, useFulfillOrderMutation } = ordersApi;
