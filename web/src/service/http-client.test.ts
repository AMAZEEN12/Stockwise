import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { httpClient, normalizeHttpError } from './http-client';

describe('HTTP boundary', () => {
  it('preserves operation headers and request IDs on retries', async () => {
    const seen: AxiosHeaders[] = [];
    await httpClient.request({ url: '/sales', method: 'POST', headers: { 'Idempotency-Key': 'same-submission', 'If-Match': '7', 'X-Request-Id': 'request-1' }, adapter: async (config) => {
      seen.push(AxiosHeaders.from(config.headers));
      return { status: 201, statusText: 'Created', data: {}, headers: {}, config };
    } });
    expect(seen[0].get('Idempotency-Key')).toBe('same-submission');
    expect(seen[0].get('If-Match')).toBe('7');
    expect(seen[0].get('X-Request-Id')).toBe('request-1');
  });
  it('retains field errors, code and request ID without exposing raw transport errors', () => {
    const error = new AxiosError('raw transport message', 'ERR_BAD_REQUEST', undefined, undefined, { status: 400, statusText: 'Bad Request', config: { headers: new AxiosHeaders() }, headers: {}, data: { code: 'VALIDATION_FAILED', requestId: 'trace-1', errors: [{ field: 'email', message: 'Invalid email' }] } });
    expect(normalizeHttpError(error)).toEqual({ status: 400, code: 'VALIDATION_FAILED', requestId: 'trace-1', fields: { email: 'Invalid email' } });
    expect(normalizeHttpError(new Error('private internals'))).toEqual({ status: 'NETWORK', fields: {} });
  });
});
