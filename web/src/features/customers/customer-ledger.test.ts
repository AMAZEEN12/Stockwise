import { describe, expect, it } from 'vitest';
import { customersEndpoints } from '../../service/endpoints/customers.endpoints';
import { validLedgerPage } from '../../service/api/customers.api';
import {
  formatDelta,
  formatLagosDateTime,
  sourceLabel,
  sourceTone,
} from './customer-ledger';
import type { LedgerPage, LedgerSourceType } from '../../models/responses/customers.response';

describe('customer ledger presentation and formatting', () => {
  it('constructs the ledger endpoint path for a given customer id', () => {
    const customerId = '33333333-3333-4333-8333-333333333333';
    expect(customersEndpoints.ledger(customerId)).toBe(
      '/customers/33333333-3333-4333-8333-333333333333/ledger'
    );
  });

  it('maps ledger source types to expected status tones', () => {
    expect(sourceTone('CREDIT_SALE')).toBe('info');
    expect(sourceTone('REPAYMENT')).toBe('success');
    expect(sourceTone('REVERSAL')).toBe('warning');
    expect(sourceTone('STORE_CREDIT')).toBe('neutral');
    expect(sourceTone('OTHER' as LedgerSourceType)).toBe('neutral');
  });

  it('provides human-readable labels for source types', () => {
    expect(sourceLabel('CREDIT_SALE')).toBe('Credit sale');
    expect(sourceLabel('REPAYMENT')).toBe('Repayment');
    expect(sourceLabel('REVERSAL')).toBe('Reversal');
    expect(sourceLabel('STORE_CREDIT')).toBe('Store credit');
    expect(sourceLabel('UNKNOWN_TYPE' as LedgerSourceType)).toBe('UNKNOWN_TYPE');
  });

  it('formats ledger deltas with proper sign and currency formatting', () => {
    expect(formatDelta(5000, 'CREDIT_SALE')).toBe('+₦50.00');
    expect(formatDelta(2500, 'REPAYMENT')).toBe('-₦25.00');
    expect(formatDelta(1500, 'REVERSAL')).toBe('-₦15.00');
    expect(formatDelta(10_000, 'STORE_CREDIT')).toBe('+₦100.00');
    expect(formatDelta(-10_000, 'STORE_CREDIT')).toBe('-₦100.00');
  });

  it('formats UTC ISO timestamps into Africa/Lagos WAT display', () => {
    const formatted = formatLagosDateTime('2026-10-26T12:00:00Z');
    expect(formatted).toContain('WAT');
    expect(formatted).toContain('26 Oct 2026');
    // UTC 12:00 is 13:00 in Africa/Lagos (UTC+1)
    expect(formatted).toContain('13:00');

    // Invalid timestamp returns input
    expect(formatLagosDateTime('invalid-timestamp')).toBe('invalid-timestamp');
  });
});

describe('customer ledger API response validation', () => {
  const validPage: LedgerPage = {
    customerId: '33333333-3333-4333-8333-333333333333',
    balanceKobo: 45_000,
    storeCreditKobo: 0,
    page: 0,
    size: 50,
    totalItems: 1,
    items: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        sourceType: 'CREDIT_SALE',
        sourceId: '22222222-2222-4222-8222-222222222222',
        deltaKobo: 45_000,
        balanceAfterKobo: 45_000,
        storeCreditAfterKobo: 0,
        createdAt: '2026-10-26T10:00:00Z',
      },
    ],
  };

  it('accepts a valid ledger page response', () => {
    expect(validLedgerPage(validPage)).toBe(true);
  });

  it('rejects null, non-objects, or missing customerId', () => {
    expect(validLedgerPage(null)).toBe(false);
    expect(validLedgerPage(undefined)).toBe(false);
    expect(validLedgerPage('string')).toBe(false);
    expect(validLedgerPage({ ...validPage, customerId: undefined })).toBe(false);
  });

  it('rejects non-integer balances or pagination values', () => {
    expect(validLedgerPage({ ...validPage, balanceKobo: 12.5 })).toBe(false);
    expect(validLedgerPage({ ...validPage, page: -1.5 })).toBe(false);
    expect(validLedgerPage({ ...validPage, totalItems: '1' as unknown as number })).toBe(false);
  });

  it('rejects invalid ledger entries', () => {
    expect(
      validLedgerPage({
        ...validPage,
        items: [
          {
            ...validPage.items[0],
            sourceType: 'INVALID_TYPE' as LedgerSourceType,
          },
        ],
      })
    ).toBe(false);

    expect(
      validLedgerPage({
        ...validPage,
        items: [
          {
            ...validPage.items[0],
            createdAt: 'not-a-date',
          },
        ],
      })
    ).toBe(false);

    expect(
      validLedgerPage({
        ...validPage,
        items: [
          {
            ...validPage.items[0],
            deltaKobo: 99.99,
          },
        ],
      })
    ).toBe(false);
  });
});
