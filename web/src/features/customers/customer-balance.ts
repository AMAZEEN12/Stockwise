import {formatMoney} from '../../lib/money';
import type {Customer} from '../../models/responses/customers.response';

export function debtDisplay(customer: Customer) {
  return customer.hasDebtActivity ? formatMoney(customer.balanceKobo) : '—';
}

export function storeCreditDisplay(customer: Customer) {
  return customer.hasStoreCreditActivity ? formatMoney(customer.storeCreditKobo) : '—';
}

export function customerBalanceSummary(customer: Customer) {
  return `Balance owed ${debtDisplay(customer)} · Store credit ${storeCreditDisplay(customer)}`;
}
