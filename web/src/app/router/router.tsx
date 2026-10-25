import { createBrowserRouter, redirect } from 'react-router';
import { HomePage } from '../../features/home/HomePage';
import { WorkspacePage } from '../../auth/WorkspacePage';
import { readSession, clearSession } from '../../auth/session';
import { store } from '../store/store';
import { authApi } from '../../service/api/auth.api';
import { RouteErrorPage } from './RouteErrorPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage />, errorElement: <RouteErrorPage />, children: [
    { path: 'sign-in', lazy: async () => ({ Component: (await import('../../features/auth/AuthOverlay')).SignInPage }) },
    { path: 'sign-up', lazy: async () => ({ Component: (await import('../../features/auth/AuthOverlay')).SignUpPage }) },
  ] },
  { path: '/workspace', element: <WorkspacePage />, errorElement: <RouteErrorPage />, loader: async () => {
    if (!readSession()) return redirect('/sign-in');
    const request = store.dispatch(authApi.endpoints.currentUser.initiate(undefined, { forceRefetch: true }));
    try { return await request.unwrap(); }
    catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) { clearSession(); return redirect('/sign-in'); }
      throw new Response('Could not load your shop.', { status: 503 });
    } finally { request.unsubscribe(); }
  } },
  { path: '*', element: <RouteErrorPage notFound /> },
]);
