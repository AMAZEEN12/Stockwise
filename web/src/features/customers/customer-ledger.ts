import {formatMoney} from '../../lib/money';
import type {LedgerSourceType} from '../../models/responses/customers.response';
import type {StatusBadgeTone} from '../../components/ui/status-badge';

export function sourceTone(type: LedgerSourceType): StatusBadgeTone {
  switch (type) {
    case 'CREDIT_SALE':
      return 'info';
    case 'REPAYMENT':
      return 'success';
    case 'REVERSAL':
      return 'warning';
    case 'STORE_CREDIT':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function sourceLabel(type: LedgerSourceType): string {
  switch (type) {
    case 'CREDIT_SALE':
      return 'Credit sale';
    case 'REPAYMENT':
      return 'Repayment';
    case 'REVERSAL':
      return 'Reversal';
    case 'STORE_CREDIT':
      return 'Store credit';
    default:
      return type;
  }
}

export function formatDelta(deltaKobo: number, sourceType: LedgerSourceType): string {
  if (sourceType === 'CREDIT_SALE') {
    return `+${formatMoney(Math.abs(deltaKobo))}`;
  }
  if (sourceType === 'REPAYMENT' || sourceType === 'REVERSAL') {
    return `-${formatMoney(Math.abs(deltaKobo))}`;
  }
  // STORE_CREDIT: positive is store credit granted, negative is store credit deducted
  return deltaKobo >= 0 ? `+${formatMoney(deltaKobo)}` : `-${formatMoney(Math.abs(deltaKobo))}`;
}

export function formatLagosDateTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
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

