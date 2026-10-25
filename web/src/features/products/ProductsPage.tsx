import { useState } from 'react';
import { Link, Outlet, useOutletContext, useSearchParams } from 'react-router';
import { useProductsQuery, useCatalogueQuery } from '../../service/api/products.api';
import type { User } from '../../models/responses/auth.response';
import type { StockState } from '../../models/responses/products.response';
import { formatMoney } from '../../lib/money';
import { Button } from '../../components/ui/button';
import { StatusPanel } from '../../components/ui/status-panel';

const filters: [string, StockState | ''][] = [['All', ''], ['In stock', 'IN_STOCK'], ['Low', 'LOW'], ['Out of stock', 'OUT'], ['Archived', 'ARCHIVED']];
export function ProductsPage() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const stock = filters.find(([, value]) => value === params.get('stockState'))?.[1] || undefined;
  const page = Math.max(0, Number(params.get('page')) || 0);
  const {data, isFetching, isError, refetch, fulfilledTimeStamp} = useProductsQuery({q: params.get('q') || undefined, category: params.get('category') || undefined, stockState: stock, page, size: 20});
  const categories = useCatalogueQuery();
  const [notice, setNotice] = useState('');
  const update = (key: string, value: string) => {const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); setParams(next, {replace: true});};
  const time = fulfilledTimeStamp ? new Date(fulfilledTimeStamp).toLocaleTimeString('en-GB', {timeZone:'Africa/Lagos', hour:'2-digit', minute:'2-digit'}) : '—';
  return <>
    <div className="page-heading"><div><h1>Products</h1><p className="micro">as of {time} WAT</p></div>{user.role === 'OWNER' && <Link className="primary-link add-product" to="new">＋ Add product</Link>}</div>
    {user.role !== 'OWNER' && <p className="micro role-note">ⓘ Only the owner can add products.</p>}
    {notice && <StatusPanel title={notice}/>}
    <div className="product-filters"><input className="shop-input" aria-label="Search name or reference" placeholder="Search name or reference" value={params.get('q') || ''} onChange={(event) => update('q', event.target.value)}/>
      <select className="shop-input category-filter" aria-label="Filter by category" value={params.get('category') || ''} onChange={(event) => update('category', event.target.value)}><option value="">Category: All</option>{[...new Set(categories.data?.map((item) => item.category))].sort().map((category) => <option key={category}>{category}</option>)}</select></div>
    <div className="filter-chips" aria-label="Stock state">{filters.map(([label, value]) => <button key={label} aria-pressed={(stock ?? '') === value} onClick={() => update('stockState', value)}>{label}</button>)}{params.size > 0 && <button onClick={() => setParams({})}>Clear filters</button>}</div>
    {isError ? <StatusPanel error title="Could not load products"><p>Your filters are still here.</p><Button variant="secondary" size="lg" onClick={() => void refetch()}>Retry</Button></StatusPanel> : !data ? <StatusPanel title="Loading products…"/> : data.items.length === 0 ? <StatusPanel title={params.size ? 'No products match your filters' : 'No products yet'}><p>{params.size ? 'Clear the filters to see your catalogue.' : 'Add your first product to start keeping stock.'}</p></StatusPanel> : <>
      <div className="product-table" aria-busy={isFetching}><div className="product-table-head micro"><span>Name</span><span>Category</span><span>Price</span><span>Stock</span><span>Quantity</span></div>
        {data.items.map((product) => <article className="product-row" key={product.id}><div className="product-name"><strong title={product.name}>{product.name}</strong><span className="micro">{product.reference}<span className="mobile-category"> · {product.category}</span></span></div><span className="desktop-category">{product.category}</span><span className="product-price">{Number.isSafeInteger(product.priceKobo) && product.priceKobo >= 0 ? formatMoney(product.priceKobo) : 'Amount unavailable'}</span>
          <span className={`stock-badge stock-${product.stockState.toLowerCase()}`}>{product.stockState === 'IN_STOCK' ? '✓ In stock' : product.stockState === 'LOW' ? `▲ Low (${product.quantity} left, threshold ${product.lowStockThreshold})` : product.stockState === 'OUT' ? '⊘ Out of stock' : 'Archived'}</span><span className="product-quantity micro"><span>Qty </span>{product.quantity}</span></article>)}
      </div>{data.totalItems > data.size && <div className="pagination"><Button variant="secondary" size="lg" disabled={!page} onClick={() => update('page', String(page - 1))}>Previous</Button><span>Page {page + 1}</span><Button variant="secondary" size="lg" disabled={(page + 1) * data.size >= data.totalItems} onClick={() => update('page', String(page + 1))}>Next</Button></div>}
    </>}
    <Outlet context={{user, onCreated: () => {setNotice('Product added'); setParams({});}}}/>
  </>;
}
