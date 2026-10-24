import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../../service/api/auth.api';
export const store = configureStore({
  reducer: { [authApi.reducerPath]: authApi.reducer },
  middleware: (getDefault) => getDefault().concat(authApi.middleware),
});
