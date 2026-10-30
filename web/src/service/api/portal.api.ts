import { authApi } from "./auth.api";
import { portalEndpoints } from "../endpoints/portal.endpoints";
import type { CreatePortalOrderRequest } from "../../models/requests/portal.request";
import type {
  CustomerPortalDetailsResponse,
  PortalProductsResponse,
  CreatePortalOrderResponse,
} from "../../models/responses/portal.response";

export const portalApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    getPortalCustomer: builder.query<CustomerPortalDetailsResponse, string>({
      query: (token) => ({
        url: portalEndpoints.details(token),
        method: "GET",
      }),
      providesTags: ["Customers"],
    }),
    getPortalProducts: builder.query<PortalProductsResponse, { token: string; q?: string }>({
      query: ({ token, q }) => ({
        url: portalEndpoints.products(token),
        method: "GET",
        params: q ? { q } : undefined,
      }),
      providesTags: ["Products"],
    }),
    createPortalOrder: builder.mutation<
      CreatePortalOrderResponse,
      { token: string; body: CreatePortalOrderRequest; idempotencyKey?: string }
    >({
      query: ({ token, body, idempotencyKey }) => ({
        url: portalEndpoints.orders(token),
        method: "POST",
        data: body,
        headers: {
          "Idempotency-Key": idempotencyKey || crypto.randomUUID(),
        },
      }),
      invalidatesTags: ["Customers", "Products", "Sales"],
    }),
  }),
});

export const {
  useGetPortalCustomerQuery,
  useGetPortalProductsQuery,
  useCreatePortalOrderMutation,
} = portalApi;
