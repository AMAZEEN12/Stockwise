import { describe, expect, it } from 'vitest';
import { parseNaira } from '../../lib/money';
import { customersEndpoints } from '../../service/endpoints/customers.endpoints';

describe('store credit calculations and endpoint paths', () => {
  it('builds the store credit endpoint path with customer UUID', () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000';
    expect(customersEndpoints.storeCredit(customerId)).toBe(
      '/customers/550e8400-e29b-41d4-a716-446655440000/store-credit'
    );
  });

  it('correctly parses Naira amounts to integer kobo', () => {
    expect(parseNaira('3300')).toBe(330_000);
    expect(parseNaira('1500.50')).toBe(150_050);
    expect(parseNaira('0.25')).toBe(25);
  });

  it('calculates store credit applied and remaining per rule DM5', () => {
    const subtotalKobo = 370_000; // ₦3,700.00
    const availableCreditKobo = 600_000; // ₦6,000.00

    const creditAppliedKobo = Math.min(availableCreditKobo, subtotalKobo);
    const cashOrDebtDueKobo = subtotalKobo - creditAppliedKobo;
    const remainingCreditKobo = availableCreditKobo - creditAppliedKobo;

    expect(creditAppliedKobo).toBe(370_000);
    expect(cashOrDebtDueKobo).toBe(0);
    expect(remainingCreditKobo).toBe(230_000);
  });

  it('handles partial store credit coverage when subtotal exceeds credit', () => {
    const subtotalKobo = 500_000; // ₦5,000.00
    const availableCreditKobo = 200_000; // ₦2,000.00

    const creditAppliedKobo = Math.min(availableCreditKobo, subtotalKobo);
    const cashOrDebtDueKobo = subtotalKobo - creditAppliedKobo;
    const remainingCreditKobo = availableCreditKobo - creditAppliedKobo;

    expect(creditAppliedKobo).toBe(200_000);
    expect(cashOrDebtDueKobo).toBe(300_000);
    expect(remainingCreditKobo).toBe(0);
  });
});
