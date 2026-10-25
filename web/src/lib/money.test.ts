import { describe, expect, it } from 'vitest';
import { formatMoney, parseNaira, sumKobo } from './money';
describe('exact money boundaries', () => {
  it('parses decimal digits exactly and formats integer kobo', () => {
    expect(parseNaira('450.05')).toBe(45005);
    expect(parseNaira('0.01')).toBe(1);
    expect(formatMoney(615000)).toBe('₦6,150.00');
    expect(sumKobo([{priceKobo: 180000, quantity: 3}, {priceKobo: 15000, quantity: 5}])).toBe(615000);
  });
  it('refuses rounding, exponents, negative and unsafe values', () => {
    for (const value of ['450.505', '1e3', '-1', '1,000', '90071992547409.92']) expect(() => parseNaira(value)).toThrow();
    expect(() => sumKobo([{priceKobo: Number.MAX_SAFE_INTEGER, quantity: 2}])).toThrow();
    expect(() => formatMoney(1.5)).toThrow();
  });
});
