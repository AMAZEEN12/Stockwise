import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { formatMoney } from "../../lib/money";
import type { PickupOrder } from "../../models/responses/orders.response";

interface PickupOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: PickupOrder[];
  isLoading?: boolean;
  onSelectOrder: (order: PickupOrder) => void;
  loadingOrderId?: string | null;
}

function paymentPreferenceLabel(pref: PickupOrder["paymentPreference"]) {
  switch (pref) {
    case "ON_ACCOUNT":
      return "On credit";
    case "USE_STORE_CREDIT":
      return "Use store credit";
    case "PAY_ON_PICKUP":
    default:
      return "Pay on pickup";
  }
}

export function PickupOrdersDialog({
  open,
  onOpenChange,
  orders,
  isLoading,
  onSelectOrder,
  loadingOrderId,
}: PickupOrdersDialogProps) {
  const pendingOrders = orders.filter((o) => o.status === "PENDING_PICKUP");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pickup orders"
      description="Customer pre-orders waiting to be fulfilled at the counter."
      className="pickup-orders-dialog"
      overlayClassName="pickup-orders-backdrop"
    >
      <div className="pickup-orders-content">
        {isLoading && (
          <p className="text-(--color-text-muted) py-6 text-center">
            Checking for pending orders…
          </p>
        )}

        {!isLoading && pendingOrders.length === 0 && (
          <div className="pickup-orders-empty">
            <p className="font-semibold text-(--color-text)">
              No pending pickup orders
            </p>
            <p className="text-(--color-text-muted) text-sm mt-1">
              When customers place pre-orders online, they will appear here
              ready to load into a sale.
            </p>
          </div>
        )}

        {!isLoading && pendingOrders.length > 0 && (
          <ul className="pickup-orders-list" aria-label="Pending pickup orders">
            {pendingOrders.map((order) => {
              const isProcessing = loadingOrderId === order.id;
              return (
                <li key={order.id} className="pickup-order-card">
                  <div className="pickup-order-card-header">
                    <div className="pickup-order-badges">
                      <span className="pickup-order-number">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`pickup-order-badge ${
                          order.paymentPreference === "ON_ACCOUNT"
                            ? "badge-credit"
                            : "badge-pickup"
                        }`}
                      >
                        {paymentPreferenceLabel(order.paymentPreference)}
                      </span>
                    </div>
                    <time
                      dateTime={order.createdAt}
                      className="pickup-order-time"
                    >
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  <div className="pickup-order-customer-row">
                    <strong>{order.customerName}</strong>
                    <span className="text-(--color-text-muted) text-sm">
                      {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {order.pickupNote && (
                    <p className="pickup-order-note">
                      Note: &ldquo;{order.pickupNote}&rdquo;
                    </p>
                  )}

                  <div className="pickup-order-lines">
                    {order.lines.map((line, index) => (
                      <div
                        key={line.productId || index}
                        className="pickup-order-line-item"
                      >
                        <span>
                          {line.productName}{" "}
                          <span className="text-(--color-text-muted)">
                            × {line.quantity}
                          </span>
                        </span>
                        <span>{formatMoney(line.lineTotalKobo)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pickup-order-card-footer">
                    <div className="pickup-order-total">
                      <span className="text-sm text-(--color-text-muted)">
                        Total
                      </span>
                      <strong>{formatMoney(order.totalKobo)}</strong>
                    </div>
                    <Button
                      size="lg"
                      loading={isProcessing}
                      loadingLabel="Loading…"
                      onClick={() => onSelectOrder(order)}
                    >
                      Load into sale
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

