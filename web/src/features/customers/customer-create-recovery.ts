import {httpClient} from '../../service/http-client';
import type {CustomerCreate} from '../../models/requests/customers.request';

const storageKey = 'stockwise.customer-create';
export interface CustomerAttempt {userId:string; apiBase:string; body:CustomerCreate; createdAt:string; checked?:boolean}
export function readCustomerAttempt(userId:string):CustomerAttempt | 'other' | 'invalid' | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CustomerAttempt>;
    if (typeof value.userId !== 'string' || typeof value.apiBase !== 'string' || !value.body || typeof value.body.displayName !== 'string' || !value.body.displayName.trim()
      || (value.body.contactPlaceholder !== undefined && typeof value.body.contactPlaceholder !== 'string') || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) return 'invalid';
    if (value.userId !== userId || value.apiBase !== httpClient.defaults.baseURL) return 'other';
    return value as CustomerAttempt;
  } catch {return 'invalid';}
}
export function persistCustomerAttempt(userId:string,body:CustomerCreate) {
  if (readCustomerAttempt(userId)) throw new Error('An earlier customer creation needs checking.');
  const attempt:CustomerAttempt = {userId,apiBase:httpClient.defaults.baseURL || '',body,createdAt:new Date().toISOString()};
  const serialized=JSON.stringify(attempt);
  sessionStorage.setItem(storageKey,serialized);
  if (sessionStorage.getItem(storageKey)!==serialized) throw new Error('Recovery storage unavailable.');
}
export function clearCustomerAttempt() {sessionStorage.removeItem(storageKey);}
export function markCustomerListChecked(userId:string) {
  const value = readCustomerAttempt(userId);
  if (value && typeof value === 'object') sessionStorage.setItem(storageKey,JSON.stringify({...value,checked:true}));
}
