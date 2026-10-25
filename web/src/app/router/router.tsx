import { createBrowserRouter } from 'react-router';
import { HomePage } from '../../features/home/HomePage';
import { RouteErrorPage } from './RouteErrorPage';
import { ShopLayout } from '../../components/layouts/ShopLayout';
import { shopLoader, roleLandingLoader, legacyWorkspaceLoader } from '../../auth/shop-loader';

export const router = createBrowserRouter([
  { path: '/app', id: 'shop', Component: ShopLayout, loader: shopLoader, errorElement: <RouteErrorPage/>, children: [
    { index: true, loader: roleLandingLoader },
    {path:'sell', lazy:async () => ({Component:(await import('../../features/sales/NewSalePage')).NewSalePage})},
    {path:'customers', lazy:async () => ({Component:(await import('../../features/customers/CustomersPage')).CustomersPage})},
    {path:'sales', lazy:async () => ({Component:(await import('../../features/sales/SalesHistoryPage')).SalesHistoryPage})},
    {path:'receipts/:saleId', lazy:async () => ({Component:(await import('../../features/sales/ReceiptPage')).ReceiptPage})},
    {path: 'products', lazy: async () => ({Component: (await import('../../features/products/ProductsPage')).ProductsPage}), children: [
      {path: 'new', lazy: async () => ({Component: (await import('../../features/products/AddProductPage')).AddProductPage})},
    ]},
  ]},
  { path: '/', element: <HomePage />, errorElement: <RouteErrorPage />, children: [
    { path: 'sign-in', lazy: async () => ({ Component: (await import('../../features/auth/AuthOverlay')).SignInPage }) },
    { path: 'sign-up', lazy: async () => ({ Component: (await import('../../features/auth/AuthOverlay')).SignUpPage }) },
  ] },
  { path: '/workspace', loader: legacyWorkspaceLoader, errorElement: <RouteErrorPage /> },
  { path: '*', element: <RouteErrorPage notFound /> },
]);
