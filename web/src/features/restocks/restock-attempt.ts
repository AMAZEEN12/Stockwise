import { createUuid } from '../../shared/utils/uuid';
import type { RestockCreate } from '../../models/requests/restocks.request';
import { httpClient } from '../../service/http-client';
import { isCalendarDate } from '../../shared/lagos-date';

const storageKey = 'stockwise.pending-restock';
export interface RestockAttempt {
  key: string;
  userId: string;
  apiBase: string;
  body: RestockCreate;
  createdAt: string;
}

function validBody(body: unknown): body is RestockCreate {
  if (!body || typeof body !== 'object') return false;
  const value = body as Partial<RestockCreate>;
  return typeof value.productId === 'string' && Number.isInteger(value.quantity)
    && Number(value.quantity) >= 1 && Number(value.quantity) <= 2147483647
    && typeof value.receivedOn === 'string' && isCalendarDate(value.receivedOn)
    && (value.note === undefined || (typeof value.note === 'string' && [...value.note].length <= 500));
}

export function readRestockAttempt(userId: string): RestockAttempt | 'other' | 'invalid' | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RestockAttempt>;
    if (typeof value.key !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.key)
      || typeof value.userId !== 'string' || typeof value.apiBase !== 'string'
      || !validBody(value.body) || typeof value.createdAt !== 'string'
      || !Number.isFinite(Date.parse(value.createdAt))) return 'invalid';
    if (value.userId !== userId || value.apiBase !== (httpClient.defaults.baseURL || '')) return 'other';
    return value as RestockAttempt;
  } catch { return 'invalid'; }
}

export function persistRestockAttempt(userId: string, body: RestockCreate): RestockAttempt {
  if (readRestockAttempt(userId)) throw new Error('An earlier restock needs checking.');
  const attempt: RestockAttempt = {
    key: createUuid(), userId, apiBase: httpClient.defaults.baseURL || '', body, createdAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(attempt);
  sessionStorage.setItem(storageKey, serialized);
  if (sessionStorage.getItem(storageKey) !== serialized) throw new Error('Recovery storage unavailable.');
  return attempt;
}

export function clearRestockAttempt() { sessionStorage.removeItem(storageKey); }
