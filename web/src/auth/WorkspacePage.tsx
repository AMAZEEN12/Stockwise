import { Link, useLoaderData, useNavigate } from 'react-router';
import type { User } from '../models/responses/auth.response';
import { clearSession } from './session';
import { store } from '../app/store/store';
import { authApi } from '../service/api/auth.api';
import { Button } from '../components/ui/button';

export function WorkspacePage() {
  const user = useLoaderData<User>();
  const navigate = useNavigate();
  return <main className="session-page">
    <p className="micro">STOCKWISE · DEMONSTRATION DATA</p>
    <h1>Welcome, {user.displayName}.</h1>
    <p>You’re signed in to Stockwise.</p>
    <Link className="primary-link" to="/app/products">Open your shop</Link>
    <p className="session-role">{user.role.toLowerCase()}</p>
    <div className="flex gap-4 items-center"><Link to="/">Home</Link><Button size="lg" onClick={() => {
      clearSession(); store.dispatch(authApi.util.resetApiState()); void navigate('/');
    }}>Sign out</Button></div>
  </main>;
}
