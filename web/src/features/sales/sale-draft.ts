import type { Product } from '../../models/responses/products.response';
import type { SaleCreate } from '../../models/requests/sales.request';
import type { Customer, Sale } from '../../models/responses/sales.response';
import { checkedKobo, sumKobo } from '../../lib/money';
export interface CartLine {product:Product;quantity:number;issue?:string}
export interface PendingSale {key:string;userId:string;body:SaleCreate;cart:CartLine[];customer?:Customer;createdAt:string;simulated:boolean;apiBase?:string}
export interface ReceiptView {sale:Sale;customerName?:string;creditApplied?:number;simulated:boolean}
export interface CartDraft {cart:CartLine[];paymentType:'PAID'|'CREDIT';customerId:string;dueDate:string}
export function readCartDraft(userId:string):CartDraft | null {
  try {const value = JSON.parse(sessionStorage.getItem(`stockwise.cart.${userId}`) || 'null') as CartDraft | null;
    if (!value || !Array.isArray(value.cart) || value.cart.length > 50 || !['PAID','CREDIT'].includes(value.paymentType)) return null;
    sumKobo(value.cart.map((line) => ({priceKobo:line.product.priceKobo,quantity:line.quantity})));
    return value;
  } catch {return null;}
}
export function saveCartDraft(userId:string,value:CartDraft) {try {if (value.cart.length) sessionStorage.setItem(`stockwise.cart.${userId}`,JSON.stringify(value)); else sessionStorage.removeItem(`stockwise.cart.${userId}`);} catch { /* Recording remains blocked if the stronger pending-snapshot write fails. */ }}
const pendingKey = 'stockwise.pending-sale';
export function readPending(userId:string): PendingSale | 'other-user' | 'invalid' | null {
  try {
    const raw = sessionStorage.getItem(pendingKey); if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingSale>;
    if (value.userId !== userId) return 'other-user';
    if (typeof value.key !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.key) || !Array.isArray(value.cart) || !value.body || !Array.isArray(value.body.lines) || value.body.lines.length < 1 || value.body.lines.length > 50 || !['PAID','CREDIT'].includes(value.body.paymentType)) return 'invalid';
    if (value.body.lines.some((line) => !line.productId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000)) return 'invalid';
    if (value.body.paymentType === 'CREDIT' && !value.body.customerId) return 'invalid';
    sumKobo(value.cart.map((line) => ({priceKobo:line.product.priceKobo,quantity:line.quantity})));
    return value as PendingSale;
  } catch {return 'invalid';}
}
export function persistPending(value:PendingSale) {
  const serialized = JSON.stringify(value);
  sessionStorage.setItem(pendingKey,serialized);
  if (sessionStorage.getItem(pendingKey) !== serialized) throw new Error('Recovery storage unavailable');
}
export function clearPending() {sessionStorage.removeItem(pendingKey);}
export function persistReceipt(value:ReceiptView,userId:string) {try {sessionStorage.setItem(`stockwise.receipt.${userId}.${value.sale.id}`,JSON.stringify(value));} catch { /* Receipt is still queryable by its server ID. */ }}
export function readReceipt(id:string,userId:string): ReceiptView | null {
  try {const value = JSON.parse(sessionStorage.getItem(`stockwise.receipt.${userId}.${id}`) || 'null'); if (value?.sale?.id === id && validSale(value.sale)) return value as ReceiptView;} catch { /* Use the API. */ } return null;
}
export function validSale(value:Sale): boolean {
  try {checkedKobo(value.totalKobo); return typeof value.id === 'string' && typeof value.reference === 'string' && Array.isArray(value.lines) && value.lines.length > 0 && value.lines.every((line) => checkedKobo(line.lineTotalKobo) === sumKobo([{priceKobo:line.unitPriceKobo,quantity:line.quantity}])) && sumKobo(value.lines.map((line) => ({priceKobo:line.unitPriceKobo,quantity:line.quantity}))) === value.totalKobo;} catch {return false;}
}
