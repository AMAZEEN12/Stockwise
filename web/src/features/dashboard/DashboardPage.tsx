import { useId } from 'react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import { EmptyState } from '../../components/ui/empty-state';
import { formatMoney } from '../../lib/money';
import { useDashboardQuery } from '../../service/api/dashboard.api';
import { InteractiveSalesChart } from './InteractiveSalesChart';
import '../../styles/dashboard.css';

// Decorative direction cue for the existing demo percentages, not historical sales data.
function TrendSparkline({ direction }: { direction: 'up' | 'down' }) {
  const fillId = useId();
  const points = direction === 'up'
    ? '2,32 12,27 22,30 32,19 42,23 52,12 62,16 74,4'
    : '2,5 12,11 22,8 32,20 42,16 52,27 62,23 74,34';
  return (
    <svg className={`overview-trend-chart overview-trend-chart--${direction}`} viewBox="0 0 76 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="75%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`2,40 ${points} 74,40`} fill={`url(#${fillId})`} />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatLagosTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${timeStr} WAT`;
}

export function DashboardPage() {
  const { data, isLoading, isError, isFetching, refetch } = useDashboardQuery(
    undefined,
    { refetchOnMountOrArgChange: true }
  )

  return (
    <div className="dashboard-page" aria-label="Shop Dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title-group">
          <h1 className="dashboard-page-title">Dashboard</h1>
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
        <div className="dashboard-main-grid">
          {/* Left column: Overview cards, recent sales and low stock alerts */}
          <div className="dashboard-main-column">
            {/* Top Overview Cards Hero Container (following design of screenshot) */}

              <div className="overview-cards-row">
                {/* Card 1: Today's Revenue */}
                <div className="bg-[#1a1c22] rounded-xl p-4 py-6">
                  <div className="overview-card-header mb-4">
                    <span className="overview-card-label">Total Revenue</span>

                    <span className="metric-trend trend-up">
                      <span aria-hidden="true">↑</span> 17.0%
                    </span>
                  </div>
                  <div className="overview-card-amount-row">
                  <strong className="overview-card-value">
                    {formatMoney(data.todaySales.totalKobo)}
                  </strong>
                    <TrendSparkline direction="up" />
                  </div>
                </div>

                {/* Card 2: Outstanding Credit */}
                <div className="bg-[#1a1c22] rounded-xl p-4 py-6">
                  <div className="overview-card-header mb-4">
                    <span className="overview-card-label">Outstanding Credit</span>
                       <span className="metric-trend trend-down">
                      <span aria-hidden="true">↓</span> 7.0%
                    </span>
                  </div>
                  <div className="overview-card-amount-row">
                  <strong className="overview-card-value text-warning">
                    {formatMoney(data.outstandingCreditKobo)}
                  </strong>
                    <TrendSparkline direction="down" />
                  </div>
                </div>

                {/* Card 3: Store Credit Held */}
                <div className="bg-[#1a1c22] rounded-xl p-4 py-6">
                  <div className="overview-card-header mb-4">
                    <span className="overview-card-label">Store Credit Held</span>
                     <span className="metric-trend trend-up">
                      <span aria-hidden="true">↑</span> 1.8%
                    </span>
                  </div>
                  <div className="overview-card-amount-row">
                  <strong className="overview-card-value text-primary">
                    {formatMoney(data.storeCreditHeldKobo)}
                  </strong>
                    <TrendSparkline direction="up" />
                  </div>
                </div>
              </div>

            {/* Recent Sales Table (Replacing Transaction History, sitting beneath Overview) */}
            <section
              className="dashboard-section-card"
              aria-label="Recent sales activity"
            >
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">Recent Sales</h2>

                </div>
              </div>

              {data.recentSales.length === 0 ? (
                <EmptyState
                  layout="panel"
                  className="section-empty"
                  title="No sales recorded yet"
                  description="When sales are made, they will appear here in chronological order."
                />
              ) : (
                <div
                  className="table-wrapper"
                  tabIndex={0}
                  role="region"
                  aria-label="Recent sales table"
                >
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th scope="col" className="text-left">
                          Transaction
                        </th>
                        <th scope="col" className="text-right">
                          Time (WAT)
                        </th>
                        <th scope="col" className="text-right">
                          Amount
                        </th>
                        <th scope="col" className="text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSales.map((sale) => (
                        <tr key={sale.id} className="dashboard-table-row">
                          <td className="text-left">
                            <strong className="row-title">
                              {sale.reference}
                            </strong>
                          </td>
                          <td className="text-right micro text-muted">
                            {formatLagosTime(sale.createdAt)}
                          </td>
                          <td className="text-right font-mono font-medium">
                            {formatMoney(sale.totalKobo)}
                          </td>
                          <td className="text-right">
                            <div className="table-badge-wrapper">
                              <StatusBadge
                                appearance="outline"
                                tone={
                                  sale.paymentType === 'PAID'
                                    ? 'success'
                                    : 'neutral'
                                }
                                className="table-badge"
                              >
                                {sale.paymentType}
                              </StatusBadge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {/* Low Stock Alerts (Replacing Recent Activity) */}
            <section
              className="dashboard-section-card"
              aria-label="Low stock alerts"
            >
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">Low Stock Alerts</h2>

                </div>
              </div>

              {data.lowStock.length === 0 ? (
                <EmptyState
                  layout="panel"
                  className="section-empty"
                  title="No low stock items"
                  description="All active catalogue items are comfortably above their reorder thresholds."
                />
              ) : (
                <div
                  className="table-wrapper"
                  tabIndex={0}
                  role="region"
                  aria-label="Low stock alerts table"
                >
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th scope="col" className="text-left">
                          Product
                        </th>
                        <th scope="col" className="text-right">
                          Threshold
                        </th>
                        <th scope="col" className="text-right">
                          Stock
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStock.map((item) => (
                        <tr key={item.id} className="dashboard-table-row">
                          <td className="text-left">
                            <strong className="row-title">
                              {item.name}
                            </strong>
                            <span className="micro row-subtitle">
                              {item.reference}
                            </span>
                          </td>
                          <td className="text-right font-mono text-muted">
                            {item.lowStockThreshold}
                          </td>
                          <td className="text-right font-mono">
                            <div className="table-badge-wrapper">
                              <StatusBadge
                                appearance="outline"
                                tone={item.quantity === 0 ? 'danger' : 'warning'}
                                className="table-badge"
                              >
                                {item.quantity === 0
                                  ? 'Out of stock'
                                  : `${item.quantity} left`}
                              </StatusBadge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Right column: Sales breakdown */}
          <div className="dashboard-side-column">
            <InteractiveSalesChart todaySales={data.todaySales} />
          </div>
        </div>
      )}
    </div>
  );
}
