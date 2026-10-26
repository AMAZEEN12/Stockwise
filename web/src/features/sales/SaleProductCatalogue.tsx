import {useState} from 'react';
import {Button} from '../../components/ui/button';
import {FilterBar} from '../../components/ui/filter-bar';
import {EmptyState} from '../../components/ui/empty-state';
import {LoadingState} from '../../components/ui/loading-state';
import {StatusPanel} from '../../components/ui/status-panel';
import {useSaleCatalogueQuery} from '../../service/api/products.api';
import type {Product} from '../../models/responses/products.response';
import {formatMoney} from '../../lib/money';

export function SaleProductCatalogue({disabled,onSelect}:{disabled:boolean;onSelect:(product:Product)=>void}) {
  const [{query,throughPage},setSearch]=useState({query:'',throughPage:0});
  const q=query.trim();
  const result=useSaleCatalogueQuery({q,throughPage},{refetchOnMountOrArgChange:true});
  // Previous rows may survive a failed Load more, but never a different search.
  const data=result.currentData || (result.data?.query===q ? result.data : undefined);
  const unavailable=disabled || result.isFetching || result.isError;
  const changeQuery=(value:string)=>setSearch({query:value,throughPage:0});
  return <section className="sale-catalogue" aria-label="Product catalogue">
    <div className="sale-catalogue-heading"><h2>Products</h2><p className="micro">Alphabetical by name</p></div>
    <FilterBar className="sale-filter-bar" label="Product catalogue filters"
      searchLabel="Search products to add" searchPlaceholder="Search products to add"
      query={query} onQueryChange={changeQuery} activeCount={0} onClearAll={()=>changeQuery('')}
      searchInputProps={{type:'text',className:'shop-input',maxLength:100,disabled}}
      resultMessage={data && !result.isFetching && !result.isError ? `${data.items.length} products shown${data.nextPage!==null ? ' — load more to see the rest' : ''}` : undefined}/>
    <div className="sale-search-results" aria-label="Product catalogue results" aria-busy={result.isFetching}>
      {result.isFetching && !data && <LoadingState label={q ? 'Searching products…' : 'Loading products…'}/>}
      {result.isError && <StatusPanel error title={data ? 'Could not refresh products' : 'Could not load products'}>
        <p>{data ? 'Previously loaded products may be out of date. Retry before adding one.' : 'Check your connection and try again.'}</p>
        {result.error && 'requestId' in result.error && result.error.requestId && <p className="micro">Request ID {result.error.requestId}</p>}
        <Button variant="secondary" size="lg" disabled={result.isFetching} onClick={()=>void result.refetch()}>Retry products</Button>
      </StatusPanel>}
      {data && <>
        {!!data.items.length && <ul className="sale-catalogue-list" aria-label="Products available for this sale">
          {data.items.map((product)=><li key={product.id}><Button variant="ghost" contentClassName="search-result-content"
            className="search-result" disabled={unavailable || product.quantity===0} onClick={()=>{onSelect(product);changeQuery('');}}>
            <span><strong>{product.name}</strong><small className="micro">{product.quantity>0 ? `${product.quantity} in stock` : 'Out of stock'}</small></span>
            <span>{formatMoney(product.priceKobo)}</span>
          </Button></li>)}
        </ul>}
        {!data.items.length && !result.isFetching && !result.isError && <EmptyState layout="panel" className="status-panel"
          title={q ? 'No matching products' : 'No products yet'}
          description={q ? 'Try a different name or reference.' : 'Active products added to the shop will appear here.'}/>}
        <div className="sale-catalogue-actions">
          {data.nextPage!==null && <Button variant="secondary" size="lg" disabled={unavailable}
            onClick={()=>setSearch({query,throughPage:data.nextPage!})}>{result.isFetching ? 'Loading products…' : 'Load more products'}</Button>}
          <Button variant="ghost" size="lg" disabled={disabled || result.isFetching} onClick={()=>void result.refetch()}>Refresh products</Button>
        </div>
      </>}
    </div>
  </section>;
}
