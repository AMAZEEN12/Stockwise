import { beforeEach, describe, expect, it } from 'vitest';
import { httpClient } from '../../service/http-client';
import { clearRestockAttempt, persistRestockAttempt, readRestockAttempt } from './restock-attempt';

const body = { productId: '11111111-1111-4111-8111-111111111111', quantity: 4, receivedOn: '2026-10-29', note: 'Delivery' };

describe('pending restock recovery', () => {
  beforeEach(() => sessionStorage.clear());
  it('preserves one exact body and key until the attempt is cleared', () => {
    const saved = persistRestockAttempt('owner', body);
    expect(readRestockAttempt('owner')).toEqual(saved);
    expect(() => persistRestockAttempt('owner', { ...body, quantity: 5 })).toThrow();
    clearRestockAttempt();
    expect(readRestockAttempt('owner')).toBeNull();
  });
  it('does not expose an attempt to another user or service', () => {
    persistRestockAttempt('owner', body);
    expect(readRestockAttempt('assistant')).toBe('other');
    const base = httpClient.defaults.baseURL;
    try { httpClient.defaults.baseURL = 'http://different-service'; expect(readRestockAttempt('owner')).toBe('other'); }
    finally { httpClient.defaults.baseURL = base; }
  });
});
