import { readSession } from '../../auth/session';
import { httpClient } from '../../service/http-client';

/** Only the local stateful development simulation may execute this unapproved operation. */
export function isReversalSimulation(): boolean {
  try {
    const base = new URL(httpClient.defaults.baseURL || '');
    return base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname)
      && Boolean(readSession()?.accessToken.startsWith('stockwise-simulation-'));
  } catch { return false; }
}
