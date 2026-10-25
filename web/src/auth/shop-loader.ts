import { redirect } from 'react-router';
import { readSession, clearSession } from './session';
import { store } from '../app/store/store';
import { authApi } from '../service/api/auth.api';
export async function shopLoader({request}: {request: Request}) {
  const returnTo = new URL(request.url).pathname;
  if (!readSession()) return redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const query = store.dispatch(authApi.endpoints.currentUser.initiate(undefined, {forceRefetch: true}));
  try { return await query.unwrap(); }
  catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      clearSession(); return redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    }
    throw new Response('Could not load your shop. Please try again.', {status: 503});
  } finally { query.unsubscribe(); }
}
