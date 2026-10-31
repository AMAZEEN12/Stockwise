import { describe, it, expect } from 'vitest';
import { productSchema, productEditSchema } from './product.schema';

describe('productSchema (create)', () => {
  it('validates required fields and trims strings', async () => {
    const valid = {
      name: '  Milo Refill 500g  ',
      reference: '  MIL-500  ',
      category: '  Beverages  ',
      price: '2500.50',
      quantity: '20',
      lowStockThreshold: '5',
    };
    const result = await productSchema.validate(valid);
    expect(result.name).toBe('Milo Refill 500g');
    expect(result.reference).toBe('MIL-500');
    expect(result.category).toBe('Beverages');
    expect(result.quantity).toBe('20');
  });

  it('rejects invalid or non-integer quantities and thresholds', async () => {
    await expect(
      productSchema.validate({
        name: 'Product',
        reference: 'REF-1',
        category: 'General',
        price: '100',
        quantity: '-5',
        lowStockThreshold: '2',
      })
    ).rejects.toThrow();

    await expect(
      productSchema.validate({
        name: 'Product',
        reference: 'REF-1',
        category: 'General',
        price: '100',
        quantity: '5.5',
        lowStockThreshold: '2',
      })
    ).rejects.toThrow();
  });
});

describe('productEditSchema (update)', () => {
  it('validates editable catalogue fields without requiring opening quantity', async () => {
    const valid = {
      name: '  Updated Product Name  ',
      reference: '  REF-002  ',
      category: '  Dairy  ',
      price: '1800.00',
      lowStockThreshold: '10',
    };
    const result = await productEditSchema.validate(valid);
    expect(result.name).toBe('Updated Product Name');
    expect(result.reference).toBe('REF-002');
    expect(result.category).toBe('Dairy');
    expect(result.lowStockThreshold).toBe('10');
  });

  it('rejects invalid price format', async () => {
    await expect(
      productEditSchema.validate({
        name: 'Product',
        reference: 'REF-2',
        category: 'Food',
        price: 'invalid-price',
        lowStockThreshold: '5',
      })
    ).rejects.toThrow();
  });
});
