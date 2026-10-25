import { useState } from 'react';
import { NavLink, Outlet, useLoaderData, useNavigate } from 'react-router';
import {Dialog} from '../ui/dialog';
import {Button} from '../ui/button';
import {StatusBadge} from '../ui/status-badge';
import type { User } from '../../models/responses/auth.response';
import { clearSession } from '../../auth/session';
import { store } from '../../app/store/store';
import { authApi } from '../../service/api/auth.api';
import '../../styles/shop.css';

export function ShopLayout() {
  const user = useLoaderData<User>();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const initials = user.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('');
  const navigation = <nav aria-label="Shop navigation">
    <NavLink to="/app/sell" onClick={() => setMenu(false)}>Sell</NavLink>
    <NavLink to="/app/products" onClick={() => setMenu(false)}>Products</NavLink>
    <NavLink to="/app/customers" onClick={() => setMenu(false)}>Customers</NavLink>
    <Button variant="ghost" disabled title="Sales history is coming later">Sales</Button>
  </nav>;
  const account = <div className="shop-account"><p>{user.displayName}</p><StatusBadge appearance="outline" className="role-badge">{user.role}</StatusBadge>
    <Button variant="ghost" className="sign-out" onClick={() => {clearSession(); store.dispatch(authApi.util.resetApiState()); void navigate('/');}}>Sign out</Button>
    <small className="demo-label">Demonstration data</small></div>;
  return <div className="shop-shell">
    <aside className="shop-sidebar"><span className="shop-brand">Stockwise</span>{navigation}{account}</aside>
    <header className="shop-mobile-header">
      <Button variant="ghost" className="menu-toggle" iconOnly aria-label="Open menu" onClick={() => setMenu(true)}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></Button>
      <span className="shop-brand">Stockwise</span><StatusBadge appearance="outline" className="role-badge">{user.role}</StatusBadge><span className="avatar" aria-label={user.displayName}>{initials}</span>
    </header>
    <Dialog open={menu} onOpenChange={setMenu} title="Stockwise" description="Navigate your shop" placement="left"
      className="mobile-menu" overlayClassName="shop-backdrop" titleClassName="shop-brand" descriptionClassName="sr-only" closeClassName="icon-button menu-close" closeLabel="Close menu" bodyClassName="mobile-menu-body">
      {navigation}{account}
    </Dialog>
    <main className="shop-main"><Outlet context={user}/></main>
  </div>;
}
