import { Link, useOutletContext, useParams } from "react-router";
import { useState } from "react";
import { useSaleQuery } from "../../service/api/sales.api";
import { useCustomersQuery } from "../../service/api/customers.api";
import type { User } from "../../models/responses/auth.response";
import { formatMoney } from "../../lib/money";
import { Button } from "../../components/ui/button";
import { LoadingState } from "../../components/ui/loading-state";
import { StatusPanel } from "../../components/ui/status-panel";
import { readReceipt, validSale } from "./sale-draft";
import { isReversalSimulation } from "./reversal-simulation";
import type { SaleReversalResponse } from "../../models/responses/reversals.response";
import { ReverseSaleDialog } from "./ReverseSaleDialog";
import { GenerateReversalCodeDialog } from "./GenerateReversalCodeDialog";
import "../../styles/sales.css";

export function ReceiptPage() {
  const { saleId = "" } = useParams();
  const user = useOutletContext<User>();
  const simulation = isReversalSimulation();
  const [saved] = useState(() => readReceipt(saleId, user.id));
  const query = useSaleQuery(saleId, { skip: !!saved && !simulation });
  const sale = query.data || saved?.sale;

  const customers = useCustomersQuery(undefined, { skip: !sale?.customerId });
  const customerName =
    saved?.customerName ||
    customers.data?.find((c) => c.id === sale?.customerId)?.displayName;

  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [generateCodeDialogOpen, setGenerateCodeDialogOpen] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [reversalResult, setReversalResult] = useState<SaleReversalResponse | null>(null);
  const reversed =
    isReversed || Boolean((sale as { reversed?: boolean } | undefined)?.reversed);

  return (
    <div className="receipt-page">
      <h1>Receipt</h1>
      {query.isError ? (
        <StatusPanel error title="Could not load this receipt">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </StatusPanel>
      ) : !sale ? (
        <LoadingState label="Loading receipt…" />
      ) : !validSale(sale) ? (
        <StatusPanel error title="The receipt amounts could not be verified" />
      ) : (
        <>
          <section className="receipt-card">
            {reversed ? (
              <h2 className="text-[var(--color-danger)]">
                <span aria-hidden="true">✕</span> Sale reversed
              </h2>
            ) : (
              <h2>
                <span aria-hidden="true">✓</span> Sale recorded
              </h2>
            )}
            <p className="micro">
              {sale.reference} ·{" "}
              {new Date(sale.createdAt).toLocaleTimeString("en-GB", {
                timeZone: "Africa/Lagos",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              WAT
            </p>
            {reversed && (
              <div className="p-3 bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] rounded-md text-sm text-[var(--color-danger)] my-3">
                This sale has been reversed. Inventory items have been returned to stock.
              </div>
            )}
            {reversalResult && simulation && <p className="micro" role="status">Simulated debt removed: {formatMoney(reversalResult.debtRemovedKobo || 0)} · Store credit returned: {formatMoney(reversalResult.storeCreditAddedKobo || 0)}</p>}
            <div className="receipt-lines">
              {sale.lines.map((line, index) => (
                <div key={`${line.productId}-${index}`}>
                  <span>
                    {line.productName}{" "}
                    <small className="micro">× {line.quantity}</small>
                  </span>
                  <span>{formatMoney(line.lineTotalKobo)}</span>
                </div>
              ))}
            </div>
            {!!saved?.creditApplied && (
              <div className="credit-breakdown">
                <p>
                  <span>Subtotal</span>
                  <span>{formatMoney(sale.totalKobo)}</span>
                </p>
                <p>
                  <span>Store credit applied</span>
                  <span>−{formatMoney(saved.creditApplied)}</span>
                </p>
              </div>
            )}
            <div className="receipt-total">
              <strong>Total</strong>
              <strong>
                {formatMoney(sale.totalKobo - (saved?.creditApplied || 0))}
              </strong>
            </div>
            <p className="micro">
              {sale.paymentType === "CREDIT" ? "On credit" : "Paid"}
              {customerName ? ` · ${customerName}` : ""}
            </p>
            {saved?.simulated && (
              <small className="settlement-note">
                Simulated demonstration receipt
              </small>
            )}
          </section>
          <div className="receipt-actions">
            <Link className="primary-link" to="/app/sell">
              New sale
            </Link>
            {!reversed && (
              <Button
                size="lg"
                variant="danger"
                onClick={() => setReverseDialogOpen(true)}
              >
                Reverse sale
              </Button>
            )}
            {["OWNER", "ADMIN"].includes(user.role) && !reversed && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setGenerateCodeDialogOpen(true)}
              >
                Generate reversal code
              </Button>
            )}
            <Button
              size="lg"
              variant="secondary"
              disabled
              aria-describedby="history-note"
            >
              View in Sales
            </Button>
          </div>
          {!reversed && <p className="micro">{simulation ? 'Sale reversal is a simulation; no real shop data is changed.' : 'Sale reversal is unavailable until the service contract is approved.'}</p>}
          <p id="history-note" className="micro">
            Open Sales from the menu to view history. Receipt linking is coming
            later.
          </p>

          <ReverseSaleDialog
            open={reverseDialogOpen}
            onOpenChange={setReverseDialogOpen}
            saleId={sale.id}
            saleReference={sale.reference}
            totalKobo={sale.totalKobo}
            userRole={user.role}
            onSuccess={(result) => { setReversalResult(result); setIsReversed(true); }}
            onRequestCodeClick={() => {
              setReverseDialogOpen(false);
              setGenerateCodeDialogOpen(true);
            }}
          />

          <GenerateReversalCodeDialog
            open={generateCodeDialogOpen}
            onOpenChange={setGenerateCodeDialogOpen}
            saleId={sale.id}
            saleReference={sale.reference}
          />
        </>
      )}
    </div>
  );
}
