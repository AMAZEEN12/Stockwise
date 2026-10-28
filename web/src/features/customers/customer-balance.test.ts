import {describe,expect,it} from 'vitest';
import type {Customer} from '../../models/responses/customers.response';
import {debtDisplay,storeCreditDisplay} from './customer-balance';

const customer = (overrides: Partial<Customer>): Customer => ({
  id: '22222222-2222-4222-8222-222222222222',
  displayName: 'Customer',
  balanceKobo: 0,
  storeCreditKobo: 0,
  hasDebtActivity: false,
  hasStoreCreditActivity: false,
  createdAt: '2026-10-26T08:00:00Z',
  ...overrides,
});

describe('customer balance presentation', () => {
  it('keeps unused debt and store credit independent', () => {
    const debtOnly = customer({balanceKobo: 45_000,hasDebtActivity: true});
    expect(debtDisplay(debtOnly)).toBe('₦450.00');
    expect(storeCreditDisplay(debtOnly)).toBe('—');
  });

  it('shows a numeric zero after activity', () => {
    const returnedToZero = customer({hasDebtActivity: true,hasStoreCreditActivity: true});
    expect(debtDisplay(returnedToZero)).toBe('₦0.00');
    expect(storeCreditDisplay(returnedToZero)).toBe('₦0.00');
  });
});
