import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../http-client';
import { authEndpoints } from '../endpoints/auth.endpoints';
import type { LoginRequest } from '../../models/requests/auth.request';
import type { Session, User } from '../../models/responses/auth.response';

export const authApi = createApi({
  reducerPath: 'stockwiseApi', baseQuery: axiosBaseQuery,
  tagTypes: ['Products', 'Customers', 'Sales'],
  endpoints: (builder) => ({
    createSession: builder.mutation<Session, LoginRequest>({ query: (data) => ({ url: authEndpoints.sessions, method: 'POST', data }) }),
    currentUser: builder.query<User, void>({ query: () => ({ url: authEndpoints.me }) }),
  }),
});
export const { useCreateSessionMutation } = authApi;
