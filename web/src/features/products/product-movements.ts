import type { MovementPage, MovementSourceType } from '../../models/responses/products.response';

/**
 * Validates that an untrusted object satisfies the MovementPage wire schema.
 */
export function validMovementPage(data: unknown): data is MovementPage {
  if (!data || typeof data !== 'object') return false;
  const page = data as Partial<MovementPage>;
  return (
    typeof page.productId === 'string' &&
    typeof page.currentQuantity === 'number' &&
    Number.isInteger(page.currentQuantity) &&
    typeof page.page === 'number' &&
    Number.isInteger(page.page) &&
    page.page >= 0 &&
    typeof page.size === 'number' &&
    Number.isInteger(page.size) &&
    page.size >= 1 &&
    typeof page.totalItems === 'number' &&
    Number.isInteger(page.totalItems) &&
    page.totalItems >= 0 &&
    Array.isArray(page.items) &&
    page.items.every(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.sourceType === 'string' &&
        ['OPENING', 'SALE', 'SALE_REVERSAL', 'RESTOCK', 'RESTOCK_REVERSAL'].includes(m.sourceType) &&
        typeof m.delta === 'number' &&
        Number.isInteger(m.delta) &&
        m.delta !== 0 &&
        typeof m.quantityAfter === 'number' &&
        Number.isInteger(m.quantityAfter) &&
        typeof m.createdAt === 'string' &&
        !Number.isNaN(Date.parse(m.createdAt)) &&
        (m.sourceId === undefined || typeof m.sourceId === 'string')
    )
  );
}

/**
 * Returns a human-friendly semantic label for movement source types.
 */
export function sourceLabel(sourceType: MovementSourceType): string {
  switch (sourceType) {
    case 'OPENING':
      return 'Opening stock';
    case 'RESTOCK':
      return 'Restock';
    case 'SALE':
      return 'Sale';
    case 'SALE_REVERSAL':
      return 'Sale reversal';
    case 'RESTOCK_REVERSAL':
      return 'Restock reversal';
  }
}

/**
 * Returns a StatusBadge semantic tone for movement source types.
 */
export function sourceTone(
  sourceType: MovementSourceType
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (sourceType) {
    case 'OPENING':
      return 'neutral';
    case 'RESTOCK':
    case 'SALE_REVERSAL':
      return 'success';
    case 'SALE':
      return 'warning';
    case 'RESTOCK_REVERSAL':
      return 'danger';
  }
}

/**
 * Formats a signed movement delta (e.g. "+10" or "-2").
 */
export function formatMovementDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

/**
 * Formats a timestamp into Africa/Lagos (WAT) display.
 */
export function formatLagosDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${formatted} WAT`;
}

