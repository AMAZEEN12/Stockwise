import { readSession } from '../../auth/session';
import { httpClient } from '../../service/http-client';

/** Identifies the local simulation for demonstration labels and its existing recovery storage. */
export function isReversalSimulation(): boolean {
  try {
    const base = new URL(httpClient.defaults.baseURL || '');
    return ((base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname)) || base.hostname.endsWith('.devtunnels.ms'))
      && Boolean(readSession()?.accessToken.startsWith('stockwise-simulation-'));
  } catch { return false; }
}
