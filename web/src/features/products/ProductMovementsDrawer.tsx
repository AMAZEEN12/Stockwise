import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { LoadingState } from '../../components/ui/loading-state';
import { StatusBadge } from '../../components/ui/status-badge';
import { StatusPanel } from '../../components/ui/status-panel';
import { useProductMovementsQuery, useProductQuery } from '../../service/api/products.api';
import {
  formatLagosDateTime,
  formatMovementDelta,
  sourceLabel,
  sourceTone,
} from './product-movements';

export function ProductMovementsDrawer() {
  const { productId = '' } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(0);

  const productQuery = useProductQuery(productId, { skip: !productId });
  const movementsQuery = useProductMovementsQuery(
    { productId, page, size: 20 },
    { skip: !productId }
  );

  const close = () => {
    void navigate({ pathname: '/app/products', search: location.search });
  };

  const product = productQuery.data;
  const movements = movementsQuery.data;
  const isLoading = productQuery.isLoading || movementsQuery.isLoading;
  const isError = productQuery.isError || movementsQuery.isError;
  const isFetching = productQuery.isFetching || movementsQuery.isFetching;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="Stock movements"
      description={`Stock movement history for ${product?.name ?? 'product'}`}
      placement="right"
      className="product-sheet product-movements-sheet"
      overlayClassName="shop-backdrop"
      headerClassName="sheet-header"
      bodyClassName="product-dialog-body"
      descriptionClassName="sr-only"
      closeClassName="icon-button"
      closeLabel="Close stock movements"
      closeContent={
        <>
          <span className="desktop-close">×</span>
          <span className="mobile-back">←</span>
        </>
      }
    >
      {isLoading ? (
        <div className="sheet-body">
          <LoadingState label="Loading stock movements…" />
        </div>
      ) : isError ? (
        <div className="sheet-body">
          {!product && productQuery.isError ? (
            <StatusPanel error title="Product not found">
              <p>This product could not be loaded or no longer exists.</p>
              <Button size="lg" variant="secondary" onClick={close}>
                Back to products
              </Button>
            </StatusPanel>
          ) : (
            <ErrorState
              layout="panel"
              className="status-panel"
              title="Could not load stock movements"
              description="Check your network connection and try again."
              onRetry={() => {
                void productQuery.refetch();
                void movementsQuery.refetch();
              }}
              retrying={isFetching}
              retryLabel="Retry"
              actionProps={{ variant: 'secondary', size: 'lg' }}
            />
          )}
        </div>
      ) : product && movements ? (
        <div className="sheet-body movement-sheet-body">
          <div className="product-movement-summary-card">
            <div className="movement-summary-main">
              <strong>{product.name}</strong>
              <span className="micro">
                {product.reference} · {product.category}
              </span>
            </div>
            <div className="movement-summary-meta">
              <StatusBadge
                appearance="outline"
                tone={
                  product.stockState === 'IN_STOCK'
                    ? 'success'
                    : product.stockState === 'LOW'
                      ? 'warning'
                      : product.stockState === 'OUT'
                        ? 'danger'
                        : 'neutral'
                }
                className={`stock-badge stock-${product.stockState.toLowerCase()}`}
              >
                {product.stockState === 'IN_STOCK'
                  ? `In stock (${movements.currentQuantity} units)`
                  : product.stockState === 'LOW'
                    ? `Low stock (${movements.currentQuantity} units)`
                    : product.stockState === 'OUT'
                      ? 'Out of stock (0 units)'
                      : `Archived (${movements.currentQuantity} units)`}
              </StatusBadge>
              <span className="micro movement-total-count">
                {movements.totalItems}{' '}
                {movements.totalItems === 1 ? 'movement' : 'movements'} recorded
              </span>
            </div>
          </div>

          {movements.items.length === 0 ? (
            <EmptyState
              layout="panel"
              className="status-panel movement-empty-panel"
              title="No stock movements yet"
              description="Stock changes from opening stock, sales, and restocks will appear here."
            />
          ) : (
            <>
              <ol className="movement-feed" aria-label="Stock movement history">
                {movements.items.map((movement) => (
                  <li key={movement.id} className="movement-feed-item">
                    <div className="movement-item-header">
                      <StatusBadge
                        tone={sourceTone(movement.sourceType)}
                        appearance="outline"
                        className="movement-source-badge"
                      >
                        {sourceLabel(movement.sourceType)}
                      </StatusBadge>
                      <span
                        className={`movement-delta ${
                          movement.delta > 0 ? 'delta-positive' : 'delta-negative'
                        }`}
                      >
                        {formatMovementDelta(movement.delta)}
                      </span>
                    </div>
                    <div className="movement-item-details">
                      <span className="movement-after micro">
                        Stock after: <strong>{movement.quantityAfter}</strong>
                      </span>
                      <time
                        dateTime={movement.createdAt}
                        className="micro movement-time"
                      >
                        {formatLagosDateTime(movement.createdAt)}
                      </time>
                    </div>
                    {movement.sourceId && (
                      <div className="movement-source-ref micro">
                        <span>Source Ref: </span>
                        <code>{movement.sourceId.slice(-8)}</code>
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {movements.totalItems > movements.size && (
                <div className="pagination">
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={!page}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span>Page {page + 1}</span>
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={(page + 1) * movements.size >= movements.totalItems}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
      <footer className="sheet-footer">
        <Button size="lg" variant="secondary" onClick={close}>
          Close
        </Button>
      </footer>
    </Dialog>
  );
}

