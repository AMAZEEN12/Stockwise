import { Link, useOutletContext, useParams } from "react-router";
import { useState } from "react";
import { useSaleQuery } from "../../service/api/sales.api";
import type { User } from "../../models/responses/auth.response";
import { formatMoney } from "../../lib/money";
import { Button } from "../../components/ui/button";
import { LoadingState } from "../../components/ui/loading-state";
import { StatusPanel } from "../../components/ui/status-panel";
import { readReceipt, validSale } from "./sale-draft";
import "../../styles/sales.css";
export function ReceiptPage() {
  const { saleId = "" } = useParams();
  const user = useOutletContext<User>();
  const [saved] = useState(() => readReceipt(saleId, user.id));
  const query = useSaleQuery(saleId, { skip: !!saved });
  const sale = saved?.sale || query.data;
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
            <h2>
              <span aria-hidden="true">✓</span> Sale recorded
            </h2>
            <p className="micro">
              {sale.reference} ·{" "}
              {new Date(sale.createdAt).toLocaleTimeString("en-GB", {
                timeZone: "Africa/Lagos",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              WAT
            </p>
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
              {saved?.customerName ? ` · ${saved.customerName}` : ""}
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
            <Button
              size="lg"
              variant="secondary"
              disabled
              aria-describedby="history-note"
            >
              View in Sales
            </Button>
          </div>
          <p id="history-note" className="micro">
            Open Sales from the menu to view history. Receipt linking is coming
            later.
          </p>
        </>
      )}
    </div>
  );
}
