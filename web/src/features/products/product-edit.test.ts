import { configureStore } from '@reduxjs/toolkit';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../service/http-client';
import { productsApi } from '../../service/api/products.api';
import type { Product } from '../../models/responses/products.response';

const createTestStore = () =>
  configureStore({
    reducer: { [productsApi.reducerPath]: productsApi.reducer },
    middleware: (getDefault) => getDefault().concat(productsApi.middleware),
  });

describe('patchProduct mutation and optimistic archive with rollback (R18, DM11)', () => {
  let store = createTestStore();

  afterEach(() => {
    store.dispatch(productsApi.util.resetApiState());
    vi.restoreAllMocks();
    store = createTestStore();
  });

  const sampleProduct: Product = {
    id: 'prod-123',
    reference: 'REF-001',
    name: 'Bournvita Refill 500g',
    category: 'Beverages',
    priceKobo: 395000,
    quantity: 12,
    lowStockThreshold: 5,
    stockState: 'IN_STOCK',
    active: true,
    version: 1,
    createdAt: '2026-10-31T08:00:00Z',
    updatedAt: '2026-10-31T08:00:00Z',
  };

  it('sends PATCH with If-Match header and payload', async () => {
    const requestSpy = vi.spyOn(httpClient, 'request').mockImplementation(async (config) => ({
      data: { ...sampleProduct, name: 'Bournvita 500g Refill', version: 2 },
      status: 200,
      statusText: 'OK',
      headers: { etag: '"2"' },
      config: config as InternalAxiosRequestConfig,
    }));

    const result = await store
      .dispatch(
        productsApi.endpoints.patchProduct.initiate({
          id: 'prod-123',
          version: 1,
          data: { name: 'Bournvita 500g Refill' },
        })
      )
      .unwrap();

    expect(result.version).toBe(2);
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/products/prod-123',
        method: 'PATCH',
        headers: expect.objectContaining({ 'If-Match': '"1"' }),
        data: { name: 'Bournvita 500g Refill' },
      })
    );
  });

  it('optimistically updates archive status and confirms on 200 OK', async () => {
    // Seed detail cache with initiate
    vi.spyOn(httpClient, 'request').mockResolvedValueOnce({
      data: sampleProduct,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    });
    await store.dispatch(productsApi.endpoints.product.initiate('prod-123'));

    let resolveRequest: (value: unknown) => void;
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    vi.spyOn(httpClient, 'request').mockImplementation(async (config) => {
      await requestPromise;
      return {
        data: { ...sampleProduct, active: false, stockState: 'ARCHIVED', version: 2 },
        status: 200,
        statusText: 'OK',
        headers: { etag: '"2"' },
        config: config as InternalAxiosRequestConfig,
      };
    });

    // Fire mutation (unresolved)
    const mutationPromise = store.dispatch(
      productsApi.endpoints.patchProduct.initiate({
        id: 'prod-123',
        version: 1,
        data: { active: false },
      })
    );

    // Allow onQueryStarted microtask to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify optimistic cache state BEFORE response resolves
    const optimistic = productsApi.endpoints.product.select('prod-123')(store.getState());
    expect(optimistic.data?.active).toBe(false);
    expect(optimistic.data?.stockState).toBe('ARCHIVED');

    // Resolve network request
    resolveRequest!(null);
    await mutationPromise.unwrap();

    // Verify confirmed state
    const confirmed = productsApi.endpoints.product.select('prod-123')(store.getState());
    expect(confirmed.data?.active).toBe(false);
    expect(confirmed.data?.version).toBe(2);
  });

  it('rolls back optimistic archive on 412 VERSION_CONFLICT (R18 two-tab conflict)', async () => {
    // Seed detail cache
    store.dispatch(
      productsApi.util.upsertQueryData('product', 'prod-123', sampleProduct)
    );

    vi.spyOn(httpClient, 'request').mockRejectedValue({
      response: {
        status: 412,
        data: {
          code: 'VERSION_CONFLICT',
          message: 'This product was modified in another session. Please refresh.',
        },
      },
      message: 'Request failed with status code 412',
    });

    try {
      await store
        .dispatch(
          productsApi.endpoints.patchProduct.initiate({
            id: 'prod-123',
            version: 1,
            data: { active: false },
          })
        )
        .unwrap();
      expect.fail('Should have rejected with 412');
    } catch {
      // Expected failure
    }

    // Verify cache has been reverted back to original active state
    const reverted = productsApi.endpoints.product.select('prod-123')(store.getState());
    expect(reverted.data?.active).toBe(true);
    expect(reverted.data?.stockState).toBe('IN_STOCK');
    expect(reverted.data?.version).toBe(1);
  });

  it('rolls back optimistic archive on 403 FORBIDDEN', async () => {
    store.dispatch(
      productsApi.util.upsertQueryData('product', 'prod-123', sampleProduct)
    );

    vi.spyOn(httpClient, 'request').mockRejectedValue({
      response: {
        status: 403,
        data: {
          code: 'FORBIDDEN',
          message: 'Only the owner can edit or archive products.',
        },
      },
      message: 'Request failed with status code 403',
    });

    try {
      await store
        .dispatch(
          productsApi.endpoints.patchProduct.initiate({
            id: 'prod-123',
            version: 1,
            data: { active: false },
          })
        )
        .unwrap();
    } catch {
      // Expected
    }

    const reverted = productsApi.endpoints.product.select('prod-123')(store.getState());
    expect(reverted.data?.active).toBe(true);
    expect(reverted.data?.stockState).toBe('IN_STOCK');
  });
});
