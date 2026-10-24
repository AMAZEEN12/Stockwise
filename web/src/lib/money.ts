// Money enters/leaves the wire as safe integer kobo. Never parseFloat or round.
export const MAX_KOBO = BigInt(Number.MAX_SAFE_INTEGER);
export function checkedKobo(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Amount is too large or invalid');
  return value;
}
export function parseNaira(value: string): number {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter a non-negative price with at most 2 decimals.');
  const [whole, fraction = ''] = text.split('.');
  const kobo = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (kobo > MAX_KOBO) throw new Error('Amount is too large');
  return Number(kobo);
}
export function sumKobo(lines: { priceKobo: number; quantity: number }[]): number {
  const total = lines.reduce((sum, line) => {
    checkedKobo(line.priceKobo);
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) throw new Error('Invalid quantity');
    return sum + BigInt(line.priceKobo) * BigInt(line.quantity);
  }, 0n);
  if (total > MAX_KOBO) throw new Error('Amount is too large');
  return Number(total);
}
export function formatMoney(value: number): string {
  const kobo = BigInt(checkedKobo(value));
  const whole = (kobo / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₦${whole}.${(kobo % 100n).toString().padStart(2, '0')}`;
}
