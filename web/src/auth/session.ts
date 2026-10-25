import type { Session } from '../models/responses/auth.response';

const storageKey = 'stockwise.session';
let current: Session | null = null;

export function readSession(): Session | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (isSession(stored) && Date.parse(stored.expiresAt) > Date.now()) current = stored;
  } catch { /* Storage can be unavailable; the in-memory session still works. */ }
  if (current && Date.parse(current.expiresAt) > Date.now()) return current;
  clearSession();
  return null;
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Session>;
  return typeof candidate.accessToken === 'string' && candidate.tokenType === 'Bearer'
    && typeof candidate.expiresAt === 'string' && typeof candidate.user?.id === 'string'
    && typeof candidate.user.email === 'string' && typeof candidate.user.displayName === 'string'
    && ['OWNER', 'ASSISTANT', 'ADMIN'].includes(candidate.user.role ?? '');
}

export function saveSession(session: Session) {
  current = session;
  try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* In-memory fallback. */ }
}

export function clearSession() {
  current = null;
  try { sessionStorage.removeItem(storageKey); } catch { /* Storage unavailable. */ }
}
