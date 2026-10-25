import {postLoginDestination} from './role-landing';
import { redirect } from 'react-router';
import { readSession, clearSession, saveSession } from './session';
import { store } from '../app/store/store';
import { authApi } from '../service/api/auth.api';
export async function shopLoader({request}: {request: Request}) {
  const url = new URL(request.url);
  const returnTo = url.pathname + url.search;
  const session = readSession();
  if (!session) return redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const query = store.dispatch(authApi.endpoints.currentUser.initiate(undefined, {forceRefetch: true}));
  try { const user = await query.unwrap();
    if (user.id !== session.user.id || !['OWNER','ASSISTANT','ADMIN'].includes(user.role)) throw new Error('Invalid account response');
    saveSession({...session,user});
    return user; }
  catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      clearSession(); return redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    }
    throw new Response('Could not load your shop. Please try again.', {status: 503});
  } finally { query.unsubscribe(); }
}

// Both the index route and old bookmarks resolve a fresh service-owned role.
export async function roleLandingLoader({request}:{request:Request}) {
  const user=await shopLoader({request});
  if(user instanceof Response)return user;
  return redirect(postLoginDestination(user.role,new URL(request.url).searchParams.get('returnTo')));
}
export async function legacyWorkspaceLoader({request}:{request:Request}) {
  if(!readSession())return redirect('/sign-in');
  return roleLandingLoader({request});
}
