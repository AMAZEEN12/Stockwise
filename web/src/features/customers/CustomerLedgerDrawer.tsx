import {Dialog} from '../../components/ui/dialog';
import {StatusBadge} from '../../components/ui/status-badge';
import {EmptyState} from '../../components/ui/empty-state';
import {ErrorState} from '../../components/ui/error-state';
import {Skeleton} from '../../components/ui/skeleton';
import {useCustomerLedgerQuery} from '../../service/api/customers.api';
import {CustomerIcon} from './CustomerStates';
import {debtDisplay, storeCreditDisplay} from './customer-balance';
import {formatDelta, formatLagosDateTime, sourceLabel, sourceTone} from './customer-ledger';
import {formatMoney} from '../../lib/money';
import type {Customer} from '../../models/responses/customers.response';
import type {HttpError} from '../../service/http-client';

export interface CustomerLedgerDrawerProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerLedgerDrawer({customer, open, onOpenChange}: CustomerLedgerDrawerProps) {
  const customerId = customer?.id || '';
  const {data, isLoading, isError, error, refetch, isFetching} = useCustomerLedgerQuery(
    {customerId},
    {skip: !open || !customerId, refetchOnMountOrArgChange: true}
  );

  const items = data?.items || [];

  return (
    <Dialog
      placement="right"
      open={open && !!customer}
      onOpenChange={onOpenChange}
      title={customer ? `${customer.displayName}’s Ledger` : 'Customer Ledger'}
      description="Statement of credit purchases, repayments, reversals, and store credit with running balances."
      descriptionClassName="sr-only"
      className="customer-ledger-dialog"
      bodyClassName="customer-ledger-dialog-body"
      titleClassName="customer-dialog-title"
      closeClassName="customer-dialog-close"
      overlayClassName="customer-backdrop"
    >
      {customer && (
        <div className="customer-ledger-body">
          <div className="customer-ledger-summary-card">
            <div className="customer-ledger-summary-item">
              <span className="customer-micro">Current debt owed</span>
              <strong className={customer.balanceKobo > 0 ? 'customer-ledger-balance-debt' : undefined}>
                {debtDisplay(customer)}
              </strong>
            </div>
            <div className="customer-ledger-summary-item">
              <span className="customer-micro">Available store credit</span>
              <strong className={customer.storeCreditKobo > 0 ? 'customer-ledger-balance-credit' : undefined}>
                {storeCreditDisplay(customer)}
              </strong>
            </div>
          </div>

          <div className="customer-ledger-content">
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
                details={(error as HttpError)?.requestId && <p className="customer-micro">Request ID {(error as HttpError).requestId}</p>}
                onRetry={() => void refetch()}
                retrying={isFetching}
                retryLabel="Retry"
                actionProps={{variant: 'secondary', size: 'md'}}
              />
            ) : !items.length ? (
              <EmptyState
                layout="panel"
                headingLevel="h3"
                className="customer-state customer-ledger-empty"
                icon={<CustomerIcon kind="empty" />}
                title="No ledger entries"
                description="Credit sales, repayments, and store credit activity for this customer will appear here."
              />
            ) : (
              <div className="customer-ledger-list" role="feed" aria-label="Ledger transactions">
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
                      <span className={`customer-ledger-delta customer-ledger-delta-${entry.sourceType.toLowerCase()}`}>
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
                        <span className="customer-micro text-[var(--color-text-muted)]">
                          Ref #{entry.sourceId.slice(-6)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
