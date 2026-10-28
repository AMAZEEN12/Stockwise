import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/form-field";
import { Select } from "../../components/ui/select";
import { StatusBadge } from "../../components/ui/status-badge";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/toast";
import { useSalesHistoryQuery } from "../../service/api/sales.api";
import type { Sale } from "../../models/responses/sales.response";
import type { SalesFilters } from "../../models/requests/sales.request";
import type { HttpError } from "../../service/http-client";
import { formatMoney } from "../../lib/money";
import { CustomerIcon } from "../customers/CustomerStates";
import {
  historyDates,
  historyTime,
  historyDay,
  type HistoryPeriod,
} from "./sales-history";
import "../../styles/sales-history.css";

function PaymentBadge({ sale }: { sale: Sale }) {
  return (
    <StatusBadge
      appearance="outline"
      className="history-payment"
      icon={
        <span
          className={sale.paymentType === "PAID" ? "history-paid-icon" : ""}
        >
          {sale.paymentType === "PAID" ? "✓" : "◷"}
        </span>
      }
    >
      {sale.paymentType === "PAID" ? "Paid" : "Credit"}
    </StatusBadge>
  );
}
function Identity({ id, staff = false }: { id?: string; staff?: boolean }) {
  return id ? (
    <span className="history-identity" title={id}>
      <span className="sr-only">{staff ? "Staff ID " : "Customer ID "}</span>
      {id}
    </span>
  ) : (
    <span>Paid in full</span>
  );
}
function SalesResults({
  filters,
  period,
  children,
  onRangeRefresh,
}: {
  filters: SalesFilters;
  period: HistoryPeriod;
  children: ReactNode;
  onRangeRefresh: () => boolean;
}) {
  const navigate = useNavigate();
  const [throughPage, setThroughPage] = useState(0);
  const query = useSalesHistoryQuery(
    { filters, throughPage },
    { refetchOnMountOrArgChange: true },
  );
  const { toast } = useToast();
  const baseline = useRef<{ ids: Set<string>; topTime: number } | null>(null);
  const [highlight, setHighlight] = useState<string>();
  const data = query.data;
  const refresh = () => {
    if (!onRangeRefresh()) void query.refetch();
  };
  // Only a newer, server-confirmed first row can produce the reference success message.
  useEffect(() => {
    if (!query.currentData || query.isFetching) return;
    const first = query.currentData.items[0];
    const previous = baseline.current;
    if (
      previous &&
      first &&
      !previous.ids.has(first.id) &&
      Date.parse(first.createdAt) > previous.topTime
    ) {
      setHighlight(first.id);
      toast({
        variant: "success",
        title: `Sale recorded. ${first.reference} is at the top.`,
      });
    }
    baseline.current = {
      ids: new Set(query.currentData.items.map((sale) => sale.id)),
      topTime: first ? Date.parse(first.createdAt) : 0,
    };
  }, [query.currentData, query.isFetching, toast]);
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(undefined), 5000);
    return () => clearTimeout(timer);
  }, [highlight]);
  const error = query.error as HttpError | undefined;
  const rows = data?.items || [];
  const stamp = data?.retrievedAt;
  return (
    <>
      <header className="page-heading history-heading">
        <div>
          <h1>Sales</h1>
          <p
            className="micro"
            title="Last successful retrieval in Africa/Lagos; records may change afterwards."
          >
            {stamp !== undefined
              ? `as of ${historyTime(stamp)} WAT`
              : "Waiting for sales data"}
            {query.isFetching && data ? " · refreshing…" : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          className="history-refresh"
          disabled={query.isFetching}
          onClick={refresh}
        >
          <span aria-hidden="true">↻</span> Refresh
        </Button>
      </header>
      {children}
      <p className="sr-only" role="status">
        {data && !query.isFetching
          ? `${rows.length} of ${data.totalItems} sales shown`
          : ""}
      </p>
      {query.isLoading && !data ? (
        <div aria-busy="true" aria-label="Loading sales">
          <div className="history-skeletons">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} lines={3} className="history-skeleton" />
            ))}
          </div>
          <p className="micro">Loading sales…</p>
        </div>
      ) : (
        <>
          {query.isError && (
            <ErrorState
              layout="panel"
              className="history-state history-error"
              title={data ? "Couldn't refresh sales" : "Couldn't load sales"}
              description={
                error?.status === 401
                  ? "Your session ended. Sign in again to load sales."
                  : data
                    ? "Previously loaded sales may be out of date. Check your connection and try again."
                    : "Check your connection and try again."
              }
              icon={<CustomerIcon kind="error" />}
              details={
                error?.requestId && (
                  <p className="micro">Request ID {error.requestId}</p>
                )
              }
              titleClassName="history-state-title"
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
              retryLabel="Retry"
              actionProps={{ variant: "secondary", size: "lg" }}
            />
          )}
          {!!rows.length && (
            <>
              <table className="history-table">
                <caption className="sr-only">
                  Recorded sales, newest first. Customer and staff are shown by
                  ID. Totals are original sale amounts, not outstanding
                  balances.
                </caption>
                <thead>
                  <tr>
                    {[
                      "Reference",
                      "Time",
                      "Type",
                      "Customer ID",
                      "Created by ID",
                      "Total",
                    ].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((sale) => (
                    <tr
                      key={sale.id}
                      data-highlight={sale.id === highlight}
                      className="history-row-clickable"
                      onClick={() => void navigate(`/app/receipts/${sale.id}`)}
                    >
                      <th scope="row">{sale.reference}</th>
                      <td>
                        <time dateTime={sale.createdAt}>
                          {period === "week" && (
                            <span className="history-date">
                              {historyDay(sale.createdAt)}
                              <br />
                            </span>
                          )}
                          {historyTime(sale.createdAt)}
                        </time>
                      </td>
                      <td>
                        <PaymentBadge sale={sale} />
                      </td>
                      <td>
                        <Identity id={sale.customerId} />
                      </td>
                      <td>
                        <Identity staff id={sale.createdBy} />
                      </td>
                      <td>{formatMoney(sale.totalKobo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="history-cards" aria-label="Recorded sales">
                {rows.map((sale) => (
                  <li key={sale.id}>
                    <Card
                      className="history-card history-card-clickable"
                      bodyClassName="history-card-body"
                      data-highlight={sale.id === highlight}
                      onClick={() => void navigate(`/app/receipts/${sale.id}`)}
                    >
                      <div className="history-card-top">
                        <span>{sale.reference}</span>
                        <time dateTime={sale.createdAt}>
                          {period === "week" && (
                            <span className="history-date">
                              {historyDay(sale.createdAt)}{" "}
                            </span>
                          )}
                          {historyTime(sale.createdAt)}
                        </time>
                      </div>
                      <p className="history-amount">
                        {formatMoney(sale.totalKobo)}
                      </p>
                      <div className="history-card-customer">
                        <PaymentBadge sale={sale} />
                        <Identity id={sale.customerId} />
                      </div>
                      <p className="history-staff">
                        by <Identity staff id={sale.createdBy} />
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
              {data && rows.length < data.totalItems && (
                <div className="history-more">
                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={query.isFetching}
                    onClick={() => setThroughPage((page) => page + 1)}
                  >
                    Load more
                  </Button>
                  <span className="micro">
                    {rows.length} of {data.totalItems} sales
                  </span>
                </div>
              )}
            </>
          )}
          {!rows.length && !query.isError && data && (
            <EmptyState
              layout="panel"
              className="history-state"
              icon={<CustomerIcon kind="empty" />}
              titleClassName="history-state-title"
              title={
                filters.paymentType
                  ? "No sales match these filters"
                  : "No sales recorded yet"
              }
              description={
                filters.paymentType
                  ? "Choose All or another date range to see more sales."
                  : "Sales you record will show up here, newest first."
              }
            />
          )}
        </>
      )}
    </>
  );
}

export function SalesHistoryPage() {
  const [period, setPeriod] = useState<HistoryPeriod>("today");
  const [payment, setPayment] = useState<"PAID" | "CREDIT">();
  const [dates, setDates] = useState(() => historyDates("today"));
  const filters = { ...dates, ...(payment ? { paymentType: payment } : {}) };
  return (
    <section className="sales-history-page" aria-label="Sales history">
      <SalesResults
        key={`${dates.from}:${dates.to}:${payment || "all"}`}
        filters={filters}
        period={period}
        onRangeRefresh={() => {
          const next = historyDates(period);
          if (next.from === dates.from && next.to === dates.to) return false;
          setDates(next);
          return true;
        }}
      >
        <div className="history-controls">
          <FormField label="Date range">
            {(field) => (
              <Select
                {...field}
                className="history-date-select"
                value={period}
                options={[
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "week", label: "Last 7 days" },
                ]}
                onValueChange={(value) => {
                  const next = value as HistoryPeriod;
                  setPeriod(next);
                  setDates(historyDates(next));
                }}
              />
            )}
          </FormField>
          <div
            className="history-payment-filters"
            role="group"
            aria-label="Payment type"
          >
            {(
              [
                { label: "All", value: undefined },
                { label: "Paid", value: "PAID" },
                { label: "Credit", value: "CREDIT" },
              ] as const
            ).map(({ label, value }) => (
              <Button
                key={label}
                variant={payment === value ? "primary" : "secondary"}
                size="lg"
                aria-pressed={payment === value}
                onClick={() => setPayment(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </SalesResults>
      <p className="history-contract-note micro">
        Customer and staff shown by ID. Totals are recorded sale amounts.
      </p>
    </section>
  );
}
