import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { Skeleton } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { formatMoney } from '../../lib/money';
import type { User } from '../../models/responses/auth.response';
import type { HttpError } from '../../service/http-client';
import { usePatchProductMutation, useProductMovementsQuery, useProductQuery } from '../../service/api/products.api';
import {
  formatLagosDateTime,
  formatMovementDelta,
  sourceLabel,
  sourceTone,
} from './product-movements';

export function ProductMovementsPage() {
  const { productId = '' } = useParams<{ productId: string }>();
  const user = useOutletContext<User>();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [patchProduct] = usePatchProductMutation();
  const { toast } = useToast();

  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useProductQuery(productId, { skip: !productId });

  const {
    data: movements,
    isLoading: movementsLoading,
    isError: movementsError,
    refetch: refetchMovements,
  } = useProductMovementsQuery(
    { productId, page, size: 20 },
    { skip: !productId }
  );

  const handleArchiveToggle = async (nextActive: boolean) => {
    if (!product) return;
    try {
      await patchProduct({
        id: product.id,
        version: product.version,
        data: { active: nextActive },
      }).unwrap();
      toast({
        variant: 'success',
        title: nextActive ? `${product.name} activated` : `${product.name} archived`,
        description: nextActive
          ? 'Product is active and visible in the new sale catalogue.'
          : 'Product is archived and hidden from sales.',
      });
    } catch (caught) {
      const error = caught as HttpError;
      if (error?.status === 412) {
        toast({
          variant: 'error',
          title: 'Conflict: product modified',
          description: 'This product was modified in another session. Changes have been reverted. Please refresh.',
        });
      } else if (error?.status === 403) {
        toast({
          variant: 'error',
          title: 'Permission denied',
          description: 'Only the owner can edit or archive products. Changes have been reverted.',
        });
      } else {
        toast({
          variant: 'error',
          title: nextActive ? 'Could not activate product' : 'Could not archive product',
          description: 'Request failed. Changes have been reverted.',
        });
      }
    }
  };

  return (
    <div className="product-movements-page">
      <nav aria-label="Breadcrumb" className="product-movements-breadcrumb">
        <Link to="/app/products" className="product-back-link">
          ← Back to products
        </Link>
      </nav>

      {productLoading ? (
        <div role="status" aria-busy="true" aria-label="Loading product details" className="product-movements-loading">
          <Skeleton lines={3} className="product-skeleton" />
        </div>
      ) : productError || !product ? (
        <ErrorState
          title="Product unavailable"
          description="This product could not be loaded or may have been removed."
          onRetry={() => void navigate('/app/products')}
          retryLabel="Back to products"
          actionProps={{ variant: 'primary', size: 'lg' }}
        />
      ) : (
        <>
          <header className="product-movements-header">
            <div className="product-movements-title-group">
              <h1 className="product-movements-page-title">Stock Movements</h1>
              <h2 className="product-movements-product-name">{product.name}</h2>
              <p className="micro product-movements-subtitle">
                {product.reference} · {product.category}
              </p>
            </div>
            <div className="product-movements-actions">
              {user?.role === 'OWNER' && (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    className="product-edit-btn"
                    onClick={() => void navigate(`/app/products/${productId}/edit`)}
                  >
                    Edit product
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    className={`product-archive-btn ${product.active ? 'text-danger' : 'text-primary'}`}
                    onClick={() => {
                      if (product.active) {
                        setArchiveConfirmOpen(true);
                      } else {
                        void handleArchiveToggle(true);
                      }
                    }}
                  >
                    {product.active ? 'Archive' : 'Unarchive'}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="product-restock-btn"
                    onClick={() => void navigate(`/app/products/${productId}/restock`)}
                  >
                    Restock
                  </Button>
                </>
              )}
            </div>
          </header>

          <section className="product-movements-summary-cards" aria-label="Stock summary">
            <div className="product-movements-summary-card">
              <span className="micro product-card-label">Current stock</span>
              <div className="product-card-value-row">
                <strong className="product-card-value">
                  {movements?.currentQuantity ?? product.quantity} units
                </strong>
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
                    ? 'In stock'
                    : product.stockState === 'LOW'
                      ? 'Low stock'
                      : product.stockState === 'OUT'
                        ? 'Out of stock'
                        : 'Archived'}
                </StatusBadge>
              </div>
            </div>

            <div className="product-movements-summary-card">
              <span className="micro product-card-label">Selling price</span>
              <strong className="product-card-value">
                {formatMoney(product.priceKobo)}
              </strong>
            </div>

            <div className="product-movements-summary-card">
              <span className="micro product-card-label">Recorded movements</span>
              <strong className="product-card-value">
                {movements?.totalItems ?? 0}
              </strong>
            </div>
          </section>

          <section className="product-statement-section" aria-label="Movement history">
            <div className="product-statement-section-header">
              <h2>Movement Timeline</h2>
              <span className="micro product-statement-count">
                {movements?.totalItems ?? 0}{' '}
                {movements?.totalItems === 1 ? 'record' : 'records'}
              </span>
            </div>

            {movementsLoading ? (
              <div role="status" aria-busy="true" aria-label="Loading movements" className="product-movements-loading">
                <Skeleton lines={4} className="product-skeleton" />
              </div>
            ) : movementsError || !movements ? (
              <ErrorState
                title="Could not load stock movements"
                description="Something went wrong while retrieving movement history."
                onRetry={() => void refetchMovements()}
                retryLabel="Retry"
                actionProps={{ variant: 'secondary', size: 'lg' }}
              />
            ) : movements.items.length === 0 ? (
              <EmptyState
                layout="panel"
                className="status-panel movement-empty-panel"
                title="No stock movements yet"
                description="Stock changes from opening stock, sales, and restocks will appear here."
              />
            ) : (
              <div className="product-statement-table-wrapper">
                <table className="product-statement-table">
                  <caption className="sr-only">
                    Stock movements history and running balances for {product.name}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Date & Time</th>
                      <th scope="col">Event Type</th>
                      <th scope="col">Source Reference</th>
                      <th scope="col" className="text-right">Change (Delta)</th>
                      <th scope="col" className="text-right">Stock After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.items.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          <time dateTime={movement.createdAt} className="product-statement-date">
                            {formatLagosDateTime(movement.createdAt)}
                          </time>
                        </td>
                        <td>
                          <StatusBadge
                            tone={sourceTone(movement.sourceType)}
                            appearance="outline"
                            className="movement-source-badge"
                          >
                            {sourceLabel(movement.sourceType)}
                          </StatusBadge>
                        </td>
                        <td className="micro product-source-ref">
                          {movement.sourceId ? `#${movement.sourceId.slice(-8)}` : '—'}
                        </td>
                        <td className="text-right font-medium">
                          <span
                            className={`movement-delta ${
                              movement.delta > 0 ? 'delta-positive' : 'delta-negative'
                            }`}
                          >
                            {formatMovementDelta(movement.delta)}
                          </span>
                        </td>
                        <td className="text-right font-medium">
                          <strong>{movement.quantityAfter}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Feed */}
                <div className="product-statement-mobile-feed" role="feed" aria-label="Movement list">
                  {movements.items.map((movement) => (
                    <article key={movement.id} className="movement-feed-item">
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
                        <time dateTime={movement.createdAt} className="micro movement-time">
                          {formatLagosDateTime(movement.createdAt)}
                        </time>
                      </div>
                      {movement.sourceId && (
                        <div className="movement-source-ref micro">
                          <span>Source Ref: </span>
                          <code>{movement.sourceId.slice(-8)}</code>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {movements && movements.totalItems > movements.size && (
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
          </section>
          <ConfirmDialog
            open={archiveConfirmOpen}
            onOpenChange={(open) => {
              if (!open) setArchiveConfirmOpen(false);
            }}
            title={`Archive ${product.name}?`}
            description="Archived products are hidden from the new sale catalogue and cannot be sold. Stock movements and ledger history are preserved."
            className="shop-confirm"
            overlayClassName="shop-confirm-backdrop"
            closeClassName="hidden"
            tone="danger"
            confirmLabel="Archive product"
            cancelLabel="Keep active"
            confirmButtonProps={{ variant: 'secondary', size: 'lg' }}
            cancelButtonProps={{ variant: 'primary', size: 'lg' }}
            onConfirm={() => {
              setArchiveConfirmOpen(false);
              void handleArchiveToggle(false);
            }}
          />
        </>
      )}
    </div>
  );
}

