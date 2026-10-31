import { describe, expect, it } from 'vitest';
import {
  formatLagosDateTime,
  formatMovementDelta,
  sourceLabel,
  sourceTone,
  validMovementPage,
} from './product-movements';
import { productsEndpoints } from '../../service/endpoints/products.endpoints';

describe('product-movements helpers', () => {
  it('formats positive and negative movement deltas correctly', () => {
    expect(formatMovementDelta(10)).toBe('+10');
    expect(formatMovementDelta(1)).toBe('+1');
    expect(formatMovementDelta(-5)).toBe('-5');
    expect(formatMovementDelta(-1)).toBe('-1');
  });

  it('maps movement source types to human labels', () => {
    expect(sourceLabel('OPENING')).toBe('Opening stock');
    expect(sourceLabel('RESTOCK')).toBe('Restock');
    expect(sourceLabel('SALE')).toBe('Sale');
    expect(sourceLabel('SALE_REVERSAL')).toBe('Sale reversal');
    expect(sourceLabel('RESTOCK_REVERSAL')).toBe('Restock reversal');
  });

  it('maps movement source types to status badge tones', () => {
    expect(sourceTone('OPENING')).toBe('neutral');
    expect(sourceTone('RESTOCK')).toBe('success');
    expect(sourceTone('SALE')).toBe('warning');
    expect(sourceTone('SALE_REVERSAL')).toBe('success');
    expect(sourceTone('RESTOCK_REVERSAL')).toBe('danger');
  });

  it('formats timestamps into Africa/Lagos (WAT) time', () => {
    const formatted = formatLagosDateTime('2026-10-24T08:41:00Z');
    // UTC 08:41 is WAT 09:41 (UTC+1)
    expect(formatted).toContain('09:41');
    expect(formatted).toContain('WAT');
    expect(formatLagosDateTime('invalid-date')).toBe('—');
  });

  it('builds the movements endpoint url with proper encoding', () => {
    expect(productsEndpoints.movements('prod-123')).toBe('/products/prod-123/movements');
    expect(productsEndpoints.movements('prod/with/slash')).toBe('/products/prod%2Fwith%2Fslash/movements');
  });

  describe('validMovementPage', () => {
    const sampleValid = {
      productId: '11111111-1111-4111-8111-000000000001',
      currentQuantity: 48,
      items: [
        {
          id: '44444444-4444-4444-8444-000000000002',
          delta: -1,
          sourceType: 'SALE',
          sourceId: '33333333-3333-4333-8333-000000000001',
          quantityAfter: 48,
          createdAt: '2026-10-24T09:00:00Z',
        },
        {
          id: '44444444-4444-4444-8444-000000000001',
          delta: 49,
          sourceType: 'OPENING',
          quantityAfter: 49,
          createdAt: '2026-10-24T08:00:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalItems: 2,
    };

    it('accepts a well-formed MovementPage', () => {
      expect(validMovementPage(sampleValid)).toBe(true);
    });

    it('rejects null, non-objects, and missing metadata', () => {
      expect(validMovementPage(null)).toBe(false);
      expect(validMovementPage(undefined)).toBe(false);
      expect(validMovementPage('string')).toBe(false);
      expect(validMovementPage({})).toBe(false);
      expect(validMovementPage({ ...sampleValid, currentQuantity: 12.5 })).toBe(false);
      expect(validMovementPage({ ...sampleValid, page: -1 })).toBe(false);
      expect(validMovementPage({ ...sampleValid, size: 0 })).toBe(false);
    });

    it('rejects movements with delta 0 or invalid source types', () => {
      expect(
        validMovementPage({
          ...sampleValid,
          items: [{ ...sampleValid.items[0], delta: 0 }],
        })
      ).toBe(false);

      expect(
        validMovementPage({
          ...sampleValid,
          items: [{ ...sampleValid.items[0], sourceType: 'UNKNOWN_TYPE' }],
        })
      ).toBe(false);
    });

    it('rejects movements with invalid date timestamps', () => {
      expect(
        validMovementPage({
          ...sampleValid,
          items: [{ ...sampleValid.items[0], createdAt: 'not-a-date' }],
        })
      ).toBe(false);
    });
  });
});

