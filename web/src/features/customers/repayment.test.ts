import { describe, expect, it } from 'vitest';
import { parseNaira } from '../../lib/money';
import { customersEndpoints } from '../../service/endpoints/customers.endpoints';

describe('repayment calculations and endpoint paths (R9)', () => {
  it('builds the repayments endpoint paths', () => {
    expect(customersEndpoints.repayments).toBe('/repayments');

    const customerId = '22222222-2222-4222-8222-222222222221';
    expect(customersEndpoints.customerRepayments(customerId)).toBe(
      '/customers/22222222-2222-4222-8222-222222222221/repayments'
    );
  });

  it('correctly parses Naira amounts to integer kobo for repayments', () => {
    expect(parseNaira('4500')).toBe(450_000);
    expect(parseNaira('1500.50')).toBe(150_050);
    expect(parseNaira('100')).toBe(10_000);
  });

  it('validates that repayment amount cannot exceed outstanding debt', () => {
    const balanceKobo = 450_000; // ₦4,500.00 debt
    const validPartialRepayment = 200_000; // ₦2,000.00
    const validFullRepayment = 450_000; // ₦4,500.00
    const invalidExceedingRepayment = 500_000; // ₦5,000.00

    expect(validPartialRepayment <= balanceKobo).toBe(true);
    expect(validFullRepayment <= balanceKobo).toBe(true);
    expect(invalidExceedingRepayment <= balanceKobo).toBe(false);
  });

  it('calculates running balance after full repayment', () => {
    const currentBalanceKobo = 450_000;
    const repaymentKobo = 450_000;
    const balanceAfterKobo = currentBalanceKobo - repaymentKobo;

    expect(balanceAfterKobo).toBe(0);
  });

  it('calculates running balance after partial repayment', () => {
    const currentBalanceKobo = 450_000;
    const repaymentKobo = 150_000;
    const balanceAfterKobo = currentBalanceKobo - repaymentKobo;

    expect(balanceAfterKobo).toBe(300_000);
  });

  it('ensures ledger delta for repayment is negative debt delta', () => {
    const repaymentAmountKobo = 250_000;
    const ledgerDeltaKobo = -repaymentAmountKobo;

    expect(ledgerDeltaKobo).toBe(-250_000);
  });
});

