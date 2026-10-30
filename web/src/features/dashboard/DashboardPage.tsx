import { Link, useNavigate, useOutletContext } from 'react-router';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import { EmptyState } from '../../components/ui/empty-state';
import { formatMoney } from '../../lib/money';
import { formatLagosDateTime } from '../products/product-movements';
import { useDashboardQuery } from '../../service/api/dashboard.api';
import type { User } from '../../models/responses/auth.response';
import { InteractiveSalesChart } from './InteractiveSalesChart';
import '../../styles/dashboard.css';

export function DashboardPage() {
  const user = useOutletContext<User>();
  const navigate = useNavigate();
  const { data, isLoading, isError, isFetching, refetch } = useDashboardQuery(
    undefined,
    { refetchOnMountOrArgChange: true }
  );

  const lagosAsOf = data?.computedAt
    ? new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Africa/Lagos',
      }).format(new Date(data.computedAt))
    : null;

  return (
    <div className="dashboard-page" aria-label="Shop Dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title-group">
          <h1 className="dashboard-page-title">Dashboard</h1>
          <p
            className="micro dashboard-subtitle"
            title="Figures computed from shop records in Africa/Lagos (WAT)."
          >
            {lagosAsOf ? `as of ${lagosAsOf} WAT` : 'Computing shop metrics…'}
            {isFetching && data ? ' · refreshing…' : ''}
            <span className="demo-badge">Demonstration data</span>
          </p>
        </div>

        <div className="dashboard-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          {user.role !== 'ADMIN' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => void navigate('/app/sell')}
            >
              New sale
            </Button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div
          aria-busy="true"
          aria-label="Loading dashboard metrics"
          className="dashboard-loading-grid"
        >
          <Skeleton lines={4} className="dashboard-card-skeleton" />
          <Skeleton lines={6} className="dashboard-card-skeleton" />
          <Skeleton lines={4} className="dashboard-card-skeleton" />
        </div>
      ) : isError || !data ? (
        <ErrorState
          title="Could not load dashboard"
          description="We were unable to compute the demonstration metrics from the records."
          onRetry={() => void refetch()}
          retryLabel="Retry"
          retrying={isFetching}
          actionProps={{ variant: 'secondary', size: 'lg' }}
        />
      ) : (
        <>
          {/* Key Metric Summary Cards */}
          <section
            className="dashboard-metric-cards"
            aria-label="Key performance indicators"
          >
            {/* Today's Sales Revenue */}
            <div className="metric-card">
              <span className="micro metric-card-label">Today's Revenue</span>
              <strong className="metric-card-value">
                {formatMoney(data.todaySales.totalKobo)}
              </strong>
              <div className="metric-card-footer">
                <span className="micro">
                  {data.todaySales.count}{' '}
                  {data.todaySales.count === 1 ? 'sale' : 'sales'} recorded today
                </span>
                <Link to="/app/sales" className="metric-link">
                  View sales →
                </Link>
              </div>
            </div>

            {/* Total Outstanding Customer Credit */}
            <div className="metric-card">
              <span className="micro metric-card-label">Outstanding Credit</span>
              <strong className="metric-card-value text-warning">
                {formatMoney(data.outstandingCreditKobo)}
              </strong>
              <div className="metric-card-footer">
                <span className="micro">
                  Owed by {data.customersOwing}{' '}
                  {data.customersOwing === 1 ? 'customer' : 'customers'}
                </span>
                <Link to="/app/customers" className="metric-link">
                  Customers →
                </Link>
              </div>
            </div>

            {/* Total Store Credit Held */}
            <div className="metric-card">
              <span className="micro metric-card-label">Store Credit Held</span>
              <strong className="metric-card-value text-primary">
                {formatMoney(data.storeCreditHeldKobo)}
              </strong>
              <div className="metric-card-footer">
                <span className="micro">Value held for customers</span>
                <Link to="/app/customers" className="metric-link">
                  Ledgers →
                </Link>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="metric-card">
              <span className="micro metric-card-label">Low Stock Alerts</span>
              <strong
                className={`metric-card-value ${data.lowStockCount > 0 ? 'text-danger' : ''}`}
              >
                {data.lowStockCount}
              </strong>
              <div className="metric-card-footer">
                <span className="micro">
                  {data.lowStockCount === 0
                    ? 'All products well stocked'
                    : `${data.lowStockCount} items at or below threshold`}
                </span>
                <Link to="/app/products?stockState=LOW" className="metric-link">
                  Catalogue →
                </Link>
              </div>
            </div>
          </section>

          {/* Interactive Sales Chart Component */}
          <section className="dashboard-chart-section">
            <InteractiveSalesChart
              todaySales={data.todaySales}
              dateLabel={`Sales for ${data.today} (WAT)`}
            />
          </section>

          {/* Split Sections: Low Stock Table & Recent Sales */}
          <div className="dashboard-split-layout">
            {/* Low Stock Watchlist */}
            <section
              className="dashboard-watchlist-card"
              aria-label="Low stock items needing restock"
            >
              <div className="watchlist-card-header">
                <div>
                  <h2 className="watchlist-title">Low Stock Alerts</h2>
                  <p className="micro watchlist-subtitle">
                    {data.lowStockCount > 0
                      ? `Showing ${data.lowStock.length} of ${data.lowStockCount} items at risk`
                      : 'No low stock warnings today'}
                  </p>
                </div>
                {user.role === 'OWNER' && (
                  <Link to="/app/products" className="watchlist-action-link">
                    Products
                  </Link>
                )}
              </div>

              {data.lowStock.length === 0 ? (
                <EmptyState
                  layout="panel"
                  className="watchlist-empty"
                  title="No low stock items"
                  description="All active catalogue items are comfortably above their reorder thresholds."
                />
              ) : (
                <div className="watchlist-table-wrapper">
                  <table className="watchlist-table">
                    <thead>
                      <tr>
                        <th scope="col">Product</th>
                        <th scope="col" className="text-right">
                          Stock
                        </th>
                        <th scope="col" className="text-right">
                          Threshold
                        </th>
                        <th scope="col" className="text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStock.map((item) => (
                        <tr
                          key={item.id}
                          className="watchlist-row"
                          onClick={() =>
                            void navigate(`/app/products/${item.id}/movements`)
                          }
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void navigate(`/app/products/${item.id}/movements`);
                            }
                          }}
                        >
                          <td>
                            <Link
                              to={`/app/products/${item.id}/movements`}
                              className="watchlist-product-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <strong className="watchlist-product-name">
                                {item.name}
                              </strong>
                            </Link>
                            <span className="micro watchlist-ref">
                              {item.reference}
                            </span>
                          </td>
                          <td className="text-right watchlist-mono">
                            {item.quantity}
                          </td>
                          <td className="text-right watchlist-mono text-muted">
                            {item.lowStockThreshold}
                          </td>
                          <td className="text-right">
                            <StatusBadge
                              appearance="outline"
                              tone={item.quantity === 0 ? 'danger' : 'warning'}
                              className="watchlist-badge"
                            >
                              {item.quantity === 0
                                ? 'Out of stock'
                                : `Low (${item.quantity} left)`}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recent Sales Activity */}
            <section
              className="dashboard-watchlist-card"
              aria-label="Recent sales activity"
            >
              <div className="watchlist-card-header">
                <div>
                  <h2 className="watchlist-title">Recent Sales</h2>
                  <p className="micro watchlist-subtitle">
                    Newest transactions recorded
                  </p>
                </div>
                <Link to="/app/sales" className="watchlist-action-link">
                  All sales →
                </Link>
              </div>

              {data.recentSales.length === 0 ? (
                <EmptyState
                  layout="panel"
                  className="watchlist-empty"
                  title="No sales yet today"
                  description="When sales are recorded, they will appear here in chronological order."
                />
              ) : (
                <div className="watchlist-table-wrapper">
                  <table className="watchlist-table">
                    <thead>
                      <tr>
                        <th scope="col">Reference</th>
                        <th scope="col">Payment</th>
                        <th scope="col" className="text-right">
                          Amount
                        </th>
                        <th scope="col" className="text-right">
                          Time (WAT)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="watchlist-row"
                          onClick={() => void navigate(`/app/receipts/${sale.id}`)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void navigate(`/app/receipts/${sale.id}`);
                            }
                          }}
                        >
                          <td>
                            <Link
                              to={`/app/receipts/${sale.id}`}
                              className="watchlist-product-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <strong className="watchlist-product-name">
                                {sale.reference}
                              </strong>
                            </Link>
                          </td>
                          <td>
                            <StatusBadge
                              appearance="outline"
                              tone={sale.paymentType === 'PAID' ? 'success' : 'neutral'}
                              className="watchlist-badge"
                            >
                              {sale.paymentType}
                            </StatusBadge>
                          </td>
                          <td className="text-right watchlist-mono">
                            {formatMoney(sale.totalKobo)}
                          </td>
                          <td className="text-right micro text-muted">
                            {formatLagosDateTime(sale.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
