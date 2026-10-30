import { configureStore } from '@reduxjs/toolkit';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../http-client';
import { restocksApi } from './restocks.api';

const store = configureStore({
  reducer: { [restocksApi.reducerPath]: restocksApi.reducer },
  middleware: (getDefault) => getDefault().concat(restocksApi.middleware),
});

afterEach(() => { store.dispatch(restocksApi.util.resetApiState()); vi.restoreAllMocks(); });

describe('restocks API', () => {
  it('sends the caller-owned idempotency key with the contract body', async () => {
    const request = vi.spyOn(httpClient, 'request').mockImplementation(async (config) => ({
      data: { id:'r', productId:'p', quantity:3, receivedOn:'2026-10-29', createdBy:'u', createdAt:'2026-10-29T10:00:00Z' },
      status: 201, statusText: 'Created', headers: {}, config: config as InternalAxiosRequestConfig,
    }));
    const body = { productId:'11111111-1111-4111-8111-111111111111', quantity:3, receivedOn:'2026-10-29' };
    await store.dispatch(restocksApi.endpoints.createRestock.initiate({ body, key:'same-restock-key' })).unwrap();
    expect(request.mock.calls[0][0]).toMatchObject({ url:'/restocks', method:'POST', data:body, headers:{'Idempotency-Key':'same-restock-key'} });
  });
});
