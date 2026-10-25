import { useState } from 'react';
import { NavLink, Outlet, useLoaderData, useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
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
    <button disabled title="Sales history is coming later">Sales</button>
  </nav>;
  const account = <div className="shop-account"><p>{user.displayName}</p><span className="role-badge">{user.role}</span>
    <button className="sign-out" onClick={() => {clearSession(); store.dispatch(authApi.util.resetApiState()); void navigate('/');}}>Sign out</button>
    <small className="demo-label">Demonstration data</small></div>;
  return <div className="shop-shell">
    <aside className="shop-sidebar"><span className="shop-brand">Stockwise</span>{navigation}{account}</aside>
    <header className="shop-mobile-header">
      <button className="menu-toggle" aria-label="Open menu" onClick={() => setMenu(true)}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      <span className="shop-brand">Stockwise</span><span className="role-badge">{user.role}</span><span className="avatar" aria-label={user.displayName}>{initials}</span>
    </header>
    <Dialog.Root open={menu} onOpenChange={setMenu}><Dialog.Portal><Dialog.Overlay className="shop-backdrop"/><Dialog.Content className="mobile-menu">
      <Dialog.Title className="shop-brand">Stockwise</Dialog.Title><Dialog.Description className="sr-only">Navigate your shop</Dialog.Description>
      <Dialog.Close className="icon-button menu-close" aria-label="Close menu">×</Dialog.Close>{navigation}{account}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
    <main className="shop-main"><Outlet context={user}/></main>
  </div>;
}
