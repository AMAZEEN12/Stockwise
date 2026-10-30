import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { useCustomerLedgerQuery, useCustomersQuery } from '../../service/api/customers.api';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { Skeleton } from '../../components/ui/skeleton';
import { CustomerIcon } from './CustomerStates';
import { debtDisplay, storeCreditDisplay } from './customer-balance';
import { formatDelta, formatLagosDateTime, sourceLabel, sourceTone } from './customer-ledger';
import { IssueStoreCreditDialog } from './IssueStoreCreditDialog';
import { formatMoney } from '../../lib/money';
import type { User } from '../../models/responses/auth.response';
import type { HttpError } from '../../service/http-client';
import '../../styles/customers.css';

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const navigate = useNavigate();
  const user = useOutletContext<User>();
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  const canIssueCredit = ['OWNER', 'ADMIN'].includes(user.role);

  const customersQuery = useCustomersQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  const customer = customersQuery.data?.find((c) => c.id === customerId);

  const { data: ledger, isLoading, isError, error, refetch, isFetching } = useCustomerLedgerQuery(
    { customerId },
    { skip: !customerId, refetchOnMountOrArgChange: false }
  );

  const items = ledger?.items || [];

  return (
    <div className="customer-detail-page">
      <nav aria-label="Breadcrumb" className="customer-breadcrumb">
        <Link to="/app/customers" className="customer-back-link">
          ← Back to customers
        </Link>
      </nav>

      {customersQuery.isLoading ? (
        <div aria-busy="true" aria-label="Loading customer details" className="customer-detail-loading">
          <Skeleton lines={2} className="customer-skeleton" />
        </div>
      ) : !customer ? (
        <div className="customer-not-found">
          <EmptyState
            layout="panel"
            headingLevel="h2"
            icon={<CustomerIcon kind="empty" />}
            title="Customer not found"
            description="The customer record could not be found or may have been removed."
            action={{ label: 'Back to customer list', onClick: () => void navigate('/app/customers') }}
            actionProps={{ variant: 'primary', size: 'lg' }}
          />
        </div>
      ) : (
        <>
          <header className="customer-detail-header">
            <div className="customer-detail-title-group">
              <h1>{customer.displayName}’s Ledger</h1>
              <p className="customer-micro">
                {customer.contactPlaceholder ? `${customer.contactPlaceholder} · ` : ''}
                Customer ID: {customer.id.slice(0, 8)}…
              </p>
            </div>
            <div className="customer-detail-actions">
              {canIssueCredit && (
                <Button
                  variant="secondary"
                  size="md"
                  className="issue-credit-btn"
                  onClick={() => setCreditDialogOpen(true)}
                >
                  + Issue store credit
                </Button>
              )}
            </div>
          </header>

          <section className="customer-detail-summary-cards" aria-label="Customer balance summary">
            <div className="customer-detail-summary-card">
              <span className="customer-micro">Current debt owed</span>
              <strong className={customer.balanceKobo > 0 ? 'customer-ledger-balance-debt' : undefined}>
                {debtDisplay(customer)}
              </strong>
            </div>
            <div className="customer-detail-summary-card">
              <span className="customer-micro">Available store credit</span>
              <strong className={customer.storeCreditKobo > 0 ? 'customer-ledger-balance-credit' : undefined}>
                {storeCreditDisplay(customer)}
              </strong>
            </div>
          </section>

          <section className="customer-statement-section" aria-label="Statement history">
            <div className="customer-statement-section-header">
              <h2>Transaction Statement</h2>
              <span className="customer-micro">
                {items.length} {items.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {isLoading ? (
              <div aria-busy="true" aria-label="Loading ledger statement" className="customer-ledger-loading">
                <div className="customer-skeletons">
                  <Skeleton lines={2} className="customer-skeleton" />
                  <Skeleton lines={2} className="customer-skeleton" />
                  <Skeleton lines={2} className="customer-skeleton" />
                </div>
                <p role="status" className="customer-micro">Loading ledger statement…</p>
              </div>
            ) : isError ? (
              <ErrorState
                layout="panel"
                headingLevel="h3"
                className="customer-state"
                icon={<CustomerIcon kind="error" />}
                title="Couldn’t load ledger statement"
                description={
                  (error as HttpError)?.status === 401
                    ? 'Your session ended. Sign in again to view ledger.'
                    : 'Check your connection and try again.'
                }
                details={
                  (error as HttpError)?.requestId && (
                    <p className="customer-micro">Request ID {(error as HttpError).requestId}</p>
                  )
                }
                onRetry={() => void refetch()}
                retrying={isFetching}
                retryLabel="Retry"
                actionProps={{ variant: 'secondary', size: 'md' }}
              />
            ) : !items.length ? (
              <EmptyState
                layout="panel"
                headingLevel="h3"
                className="customer-state customer-ledger-empty"
                icon={<CustomerIcon kind="empty" />}
                title="No ledger entries"
                description="Credit sales, repayments, reversals, and store credit activity for this customer will appear here."
              />
            ) : (
              <div className="customer-statement-table-wrapper">
                <table className="customer-statement-table">
                  <caption className="sr-only">
                    Statement of credit purchases, repayments, reversals, and store credit with running balances for {customer.displayName}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Date & Time</th>
                      <th scope="col">Type</th>
                      <th scope="col">Reference</th>
                      <th scope="col" className="text-right">Amount</th>
                      <th scope="col" className="text-right">Balance After</th>
                      <th scope="col" className="text-right">Store Credit After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <time dateTime={entry.createdAt} className="customer-statement-date">
                            {formatLagosDateTime(entry.createdAt)}
                          </time>
                        </td>
                        <td>
                          <StatusBadge tone={sourceTone(entry.sourceType)} appearance="outline">
                            {sourceLabel(entry.sourceType)}
                          </StatusBadge>
                        </td>
                        <td className="customer-micro">
                          {entry.sourceId ? `Ref #${entry.sourceId.slice(-6)}` : '—'}
                        </td>
                        <td className="text-right">
                          <span
                            className={`customer-ledger-delta customer-ledger-delta-${entry.sourceType.toLowerCase()}`}
                          >
                            {formatDelta(entry.deltaKobo, entry.sourceType)}
                          </span>
                        </td>
                        <td className="text-right font-medium">
                          {formatMoney(entry.balanceAfterKobo)}
                        </td>
                        <td className="text-right font-medium">
                          {entry.storeCreditAfterKobo > 0 ? formatMoney(entry.storeCreditAfterKobo) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Statement Feed */}
                <div className="customer-statement-mobile-feed" role="feed" aria-label="Ledger transactions">
                  {items.map((entry) => (
                    <article key={entry.id} className="customer-ledger-item">
                      <div className="customer-ledger-item-header">
                        <div className="customer-ledger-item-type">
                          <StatusBadge tone={sourceTone(entry.sourceType)} appearance="outline">
                            {sourceLabel(entry.sourceType)}
                          </StatusBadge>
                          <time dateTime={entry.createdAt} className="customer-micro">
                            {formatLagosDateTime(entry.createdAt)}
                          </time>
                        </div>
                        <span
                          className={`customer-ledger-delta customer-ledger-delta-${entry.sourceType.toLowerCase()}`}
                        >
                          {formatDelta(entry.deltaKobo, entry.sourceType)}
                        </span>
                      </div>
                      <div className="customer-ledger-item-footer">
                        <span className="customer-micro">
                          Balance after: <strong>{formatMoney(entry.balanceAfterKobo)}</strong>
                        </span>
                        {entry.storeCreditAfterKobo > 0 && (
                          <span className="customer-micro">
                            Store credit: <strong>{formatMoney(entry.storeCreditAfterKobo)}</strong>
                          </span>
                        )}
                        {entry.sourceId && (
                          <span className="customer-micro">
                            Ref #{entry.sourceId.slice(-6)}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <IssueStoreCreditDialog
            customer={customer}
            open={creditDialogOpen}
            onOpenChange={setCreditDialogOpen}
            onSuccess={() => {
              void customersQuery.refetch();
              void refetch();
            }}
          />
        </>
      )}
    </div>
  );
}
