import { describe, expect, it } from 'vitest';
import { loginSchema, registrationSchema } from './auth.schema';
describe('contract-aligned auth validation', () => {
  it('rejects invalid emails, blank passwords, and out-of-contract lengths', async () => {
    for (const input of [{ email: 'owner@', password: '' }, { email: 'owner@shop.com', password: 'short' }, { email: 'owner@shop.com', password: 'x'.repeat(129) }]) expect(await loginSchema.isValid(input)).toBe(false);
    expect(await loginSchema.isValid({ email: 'owner@stockwise.test', password: 'demo-pass' })).toBe(true);
  });
  it('validates full name for the proposed registration without requiring extra fields', async () => {
    expect(await registrationSchema.isValid({ displayName: '', email: 'owner@shop.com', password: 'demo-pass' })).toBe(false);
    expect(await registrationSchema.isValid({ displayName: 'Demo Owner', email: 'owner@shop.com', password: 'demo-pass' })).toBe(true);
  });
});
