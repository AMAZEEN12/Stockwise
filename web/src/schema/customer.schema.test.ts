import {describe,it,expect} from 'vitest';
import {customerSchema} from './customer.schema';

describe('customer fields match the contract and database nonblank rule',() => {
  it('accepts an omitted contact after Formik normalizes empty strings',async () => {
    expect(await customerSchema.validate({displayName:'  Demo Customer  '})).toEqual({displayName:'Demo Customer',contactPlaceholder:''});
    await expect(customerSchema.validate({displayName:'   '})).rejects.toThrow('Enter a display name.');
  });
  it('uses Unicode code-point bounds and never treats fictional contact as a real phone',async () => {
    await expect(customerSchema.validate({displayName:'😀'.repeat(120),contactPlaceholder:'fictional note'})).resolves.toBeDefined();
    await expect(customerSchema.validate({displayName:'x'.repeat(121)})).rejects.toThrow('120');
    await expect(customerSchema.validate({displayName:'Demo',contactPlaceholder:'x'.repeat(61)})).rejects.toThrow('60');
  });
});
