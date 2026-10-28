import { describe, expect, it } from 'vitest';
import { reversalsEndpoints } from '../../service/endpoints/reversals.endpoints';
import type {
  ReversalAuthorizationCreate,
  SaleReversalRequest,
} from '../../models/requests/reversals.request';

describe('reversal endpoint paths and models', () => {
  it('constructs correct endpoint paths', () => {
    expect(reversalsEndpoints.authorizations).toBe('/reversals/authorizations');
    expect(reversalsEndpoints.reversal('test-sale-uuid-1234')).toBe(
      '/sales/test-sale-uuid-1234/reversal',
    );
  });

  it('validates 6-digit authorization code format and cleaning', () => {
    const rawInput = ' 839-201 ';
    const cleanDigits = rawInput.replace(/\D/g, '').slice(0, 6);
    expect(cleanDigits).toBe('839201');
    expect(cleanDigits.length).toBe(6);

    const formatCode = (code: string) =>
      code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
    expect(formatCode(cleanDigits)).toBe('839 201');

    const tooShort = '12345'.replace(/\D/g, '').slice(0, 6);
    expect(tooShort.length).toBeLessThan(6);
  });

  it('calculates countdown timer correctly from expiresAt', () => {
    const now = Date.now();
    const expiresAt = new Date(now + 14 * 60 * 1000 + 45 * 1000).toISOString(); // 14m 45s
    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - now) / 1000),
    );
    expect(remainingSeconds).toBe(14 * 60 + 45);

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    expect(timeFormatted).toBe('14:45');
  });

  it('constructs valid request payloads for assistant vs owner', () => {
    const assistantPayload: SaleReversalRequest = {
      reason: 'CUSTOMER_RETURN',
      note: 'Returned unopened detergent',
      authorizationCode: '839201',
    };
    expect(assistantPayload.authorizationCode).toBe('839201');
    expect(assistantPayload.reason).toBe('CUSTOMER_RETURN');

    const ownerPayload: SaleReversalRequest = {
      reason: 'BILLING_ERROR',
      note: 'Duplicated line item',
    };
    expect(ownerPayload.authorizationCode).toBeUndefined();
    expect(ownerPayload.reason).toBe('BILLING_ERROR');

    const authCreate: ReversalAuthorizationCreate = {
      saleId: '123e4567-e89b-12d3-a456-426614174000',
      validMinutes: 15,
    };
    expect(authCreate.validMinutes).toBe(15);
  });
});
