import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ShopLayout } from './ShopLayout';
import type { User } from '../../models/responses/auth.response';

async function renderShopLayout(user: User) {
  const router = createMemoryRouter(
    [
      {
        path: '/app',
        element: <ShopLayout />,
        loader: () => user,
        HydrateFallback: () => null,
        children: [
          { index: true, element: <div>Child view</div> },
        ],
      },
    ],
    { initialEntries: ['/app'] }
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole('navigation', { name: 'Shop navigation' });
}

describe('ShopLayout role-based sidebar navigation', () => {
  it('shows Sell, Products, Customers, and Sales links for OWNER', async () => {
    await renderShopLayout({
      id: '1',
      displayName: 'Demo Owner',
      email: 'owner@stockwise.test',
      role: 'OWNER',
    });
    expect(screen.getAllByRole('link', { name: 'Sell' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Products' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Customers' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Sales' }).length).toBeGreaterThan(0);
  });

  it('shows Sell, Products, Customers, and Sales links for ASSISTANT', async () => {
    await renderShopLayout({
      id: '2',
      displayName: 'Demo Assistant',
      email: 'assistant@stockwise.test',
      role: 'ASSISTANT',
    });
    expect(screen.getAllByRole('link', { name: 'Sell' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Products' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Customers' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Sales' }).length).toBeGreaterThan(0);
  });

  it('hides Sell and shows Products, Customers, and Sales links for ADMIN', async () => {
    await renderShopLayout({
      id: '3',
      displayName: 'Demo Admin',
      email: 'admin@stockwise.test',
      role: 'ADMIN',
    });
    expect(screen.queryByRole('link', { name: 'Sell' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Products' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Customers' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Sales' }).length).toBeGreaterThan(0);
  });
});
