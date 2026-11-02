/**
 * Helper to determine whether a customer's payment is due within 48 hours.
 */
export function isPaymentDueIn48Hours(customer: {
  balanceKobo: number;
  paymentDueAt?: string | null;
}): boolean {
  if (customer.balanceKobo <= 0) return false;
  if (!customer.paymentDueAt) return true;
  const dueTime = new Date(customer.paymentDueAt).getTime();
  if (Number.isNaN(dueTime)) return true;
  const diffHours = (dueTime - Date.now()) / (1000 * 60 * 60);
  return diffHours <= 48;
}

