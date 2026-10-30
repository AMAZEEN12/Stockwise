import { useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import {
  useGetPortalCustomerQuery,
  useGetPortalProductsQuery,
  useCreatePortalOrderMutation,
} from "../../service/api/portal.api";
import { formatMoney, sumKobo } from "../../lib/money";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import type { PortalProduct } from "../../models/responses/portal.response";
import type { PortalPaymentPreference } from "../../models/requests/portal.request";
import type { HttpError } from "../../service/http-client";
import "../../styles/customer-portal.css";

export function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<"catalogue" | "statement" | "contact">("catalogue");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Map<string, { product: PortalProduct; quantity: number }>>(
    new Map()
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [paymentPreference, setPaymentPreference] = useState<PortalPaymentPreference>("PAY_ON_PICKUP");
  const [pickupNote, setPickupNote] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string>("");
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState<string>("");

  const {
    data: portalData,
    isLoading: isCustomerLoading,
    error: customerErrorRaw,
    refetch: refetchCustomer,
  } = useGetPortalCustomerQuery(token || "", { skip: !token });

  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useGetPortalProductsQuery(
    { token: token || "", q: search.trim() },
    { skip: !token }
  );

  const [createPortalOrder, { isLoading: isSubmitting }] = useCreatePortalOrderMutation();

  const customerError = customerErrorRaw as HttpError | undefined;

  // Cart calculation using integer arithmetic
  const cartLines = useMemo(() => Array.from(cart.values()), [cart]);
  const cartItemsCount = useMemo(
    () => cartLines.reduce((acc, line) => acc + line.quantity, 0),
    [cartLines]
  );
  const cartSubtotalKobo = useMemo(() => {
    if (cartLines.length === 0) return 0;
    try {
      return sumKobo(
        cartLines.map((line) => ({
          priceKobo: line.product.priceKobo,
          quantity: line.quantity,
        }))
      );
    } catch {
      return 0;
    }
  }, [cartLines]);

  const storeCreditAvailableKobo = portalData?.customer?.storeCreditKobo || 0;
  const storeCreditAppliedKobo =
    paymentPreference === "USE_STORE_CREDIT"
      ? Math.min(storeCreditAvailableKobo, cartSubtotalKobo)
      : 0;
  const amountDueKobo = cartSubtotalKobo - storeCreditAppliedKobo;

  const updateQuantity = (product: PortalProduct, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(product.id);
      const newQty = (current ? current.quantity : 0) + delta;

      if (newQty <= 0) {
        next.delete(product.id);
      } else {
        const cappedQty = Math.min(newQty, product.quantity, 10000);
        next.set(product.id, { product, quantity: cappedQty });
      }
      return next;
    });
  };

  const handleOrderSubmit = async () => {
    if (!token || cartLines.length === 0) return;

    try {
      const response = await createPortalOrder({
        token,
        body: {
          lines: cartLines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
          paymentPreference,
          pickupNote: pickupNote.trim() || undefined,
        },
      }).unwrap();

      setLastOrderNumber(response.orderNumber);
      setLastWhatsappUrl(response.whatsappUrl || "");
      setCart(new Map());
      setIsReviewOpen(false);
      setIsSuccessOpen(true);
    } catch {
      // Error handled via mutation state or UI notification
    }
  };

  if (!token) {
    return (
      <main className="portal-container">
        <div className="portal-wrapper">
          <div className="portal-header text-center p-8">
            <h1 className="text-xl font-bold">Invalid Portal Link</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">
              No customer link token was provided in the URL.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (isCustomerLoading) {
    return (
      <main className="portal-container" aria-busy="true">
        <div className="portal-wrapper">
          <div className="portal-header">
            <Skeleton lines={2} className="h-6 w-48 mb-2" />
            <Skeleton lines={1} className="h-4 w-64" />
          </div>
          <div className="portal-balances-grid">
            <Skeleton lines={2} className="h-24 rounded-md" />
            <Skeleton lines={2} className="h-24 rounded-md" />
          </div>
          <Skeleton lines={4} className="h-48 rounded-md" />
        </div>
      </main>
    );
  }

  if (customerError) {
    const isExpired = customerError.status === 410 || customerError.code === "TOKEN_EXPIRED";
    return (
      <main className="portal-container">
        <div className="portal-wrapper">
          <div className="portal-header p-6">
            <span className="portal-brand-badge text-[var(--color-danger)] bg-[var(--color-danger-subtle)]">
              {isExpired ? "Link Expired" : "Portal Unavailable"}
            </span>
            <h1 className="portal-shop-title mt-2">
              {isExpired ? "This portal link has expired" : "Customer Portal Link Invalid"}
            </h1>
            <p className="portal-shop-meta mt-2">
              {isExpired
                ? "For security, customer self-service links expire periodically. Please send a message to the shop owner on WhatsApp or visit the shop to request a fresh portal link."
                : "The link you opened could not be found or has been revoked. Please check the URL link provided by your store."}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  void refetchCustomer();
                  void refetchProducts();
                }}
              >
                Retry
              </Button>
              <Link to="/" className="inline-flex items-center text-sm text-[var(--color-primary)] hover:underline self-center ml-2">
                Visit Stockwise Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!portalData || !portalData.customer) return null;

  const { shop, customer } = portalData;

  return (
    <main className="portal-container">
      <div className="portal-wrapper">
        {/* Header / Shop Identity */}
        <header className="portal-header">
          <div className="flex items-center justify-between">
            <span className="portal-brand-badge">Customer Self-Service Portal</span>
            {portalData.tokenExpiresAt && (
              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                Active link
              </span>
            )}
          </div>
          <div>
            <h1 className="portal-shop-title">{shop.name}</h1>
            <p className="portal-shop-meta">{shop.address}</p>
          </div>
          <p className="portal-customer-greeting">
            Welcome back, <strong>{customer.displayName}</strong>
          </p>
        </header>

        {/* Customer Balance Summary Cards */}
        <section className="portal-balances-grid" aria-label="Account Balances">
          <div className="portal-balance-card" data-testid="portal-balance-owed">
            <p className="portal-balance-label">Outstanding Balance</p>
            <p className="portal-balance-amount">
              {formatMoney(customer.balanceKobo)}
            </p>
            <p className="portal-balance-subtext">
              {customer.balanceKobo > 0 ? "Payment due" : "All clear · No debt"}
            </p>
          </div>

          <div
            className={`portal-balance-card ${customer.storeCreditKobo > 0 ? "credit" : ""}`}
            data-testid="portal-store-credit"
          >
            <p className="portal-balance-label">Store Credit</p>
            <p className="portal-balance-amount">
              {formatMoney(customer.storeCreditKobo)}
            </p>
            <p className="portal-balance-subtext">
              {customer.storeCreditKobo > 0
                ? "Available to spend"
                : "No store credit"}
            </p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <nav className="portal-tabs" aria-label="Portal Navigation">
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "catalogue" ? "active" : ""}`}
            onClick={() => setActiveTab("catalogue")}
          >
            Order Online
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "statement" ? "active" : ""}`}
            onClick={() => setActiveTab("statement")}
          >
            Statement
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "contact" ? "active" : ""}`}
            onClick={() => setActiveTab("contact")}
          >
            Contact Shop
          </button>
        </nav>

        {/* TAB 1: Online Catalogue & Pre-order */}
        {activeTab === "catalogue" && (
          <section className="portal-catalogue-section" aria-label="Product Catalogue">
            <div className="portal-search-bar">
              <input
                type="search"
                className="portal-search-input"
                placeholder="Search products in store…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
              />
            </div>

            {isProductsLoading ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                <Skeleton lines={2} className="h-16 rounded-md" />
                <Skeleton lines={2} className="h-16 rounded-md" />
                <Skeleton lines={2} className="h-16 rounded-md" />
              </div>
            ) : !productsData?.items.length ? (
              <div className="portal-header text-center py-8">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {search ? `No products matching "${search}"` : "No products available for online ordering right now."}
                </p>
              </div>
            ) : (
              <div className="portal-products-list">
                {productsData.items.map((product) => {
                  const inCart = cart.get(product.id)?.quantity || 0;
                  return (
                    <article key={product.id} className="portal-product-item">
                      <div className="portal-product-info">
                        <h3 className="portal-product-name">{product.name}</h3>
                        <div className="portal-product-meta">
                          <span className="portal-product-price">
                            {formatMoney(product.priceKobo)}
                          </span>
                          <span className="portal-product-stock">
                            · {product.quantity} in stock
                          </span>
                        </div>
                      </div>

                      <div className="portal-stepper" aria-label={`Quantity for ${product.name}`}>
                        <button
                          type="button"
                          className="portal-step-btn"
                          disabled={inCart <= 0}
                          onClick={() => updateQuantity(product, -1)}
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          −
                        </button>
                        <span className="portal-step-count" aria-live="polite">
                          {inCart}
                        </span>
                        <button
                          type="button"
                          className="portal-step-btn"
                          disabled={inCart >= product.quantity}
                          onClick={() => updateQuantity(product, 1)}
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Statement & Balance Breakdown */}
        {activeTab === "statement" && (
          <section className="portal-catalogue-section" aria-label="Customer Statement">
            <div className="portal-header">
              <h2 className="text-lg font-bold">Ledger Balance Summary</h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Live balances maintained in real time with Ngozi Provisions Store.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-sm">Store Credit Available</span>
                  <span className="text-sm font-mono font-bold text-[var(--color-primary)]">
                    {formatMoney(customer.storeCreditKobo)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-sm">Outstanding Debt Owed</span>
                  <span className="text-sm font-mono font-bold">
                    {formatMoney(customer.balanceKobo)}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold">
                  <span className="text-sm">Net Account Position</span>
                  <span className="text-sm font-mono">
                    {customer.storeCreditKobo > customer.balanceKobo
                      ? `+${formatMoney(customer.storeCreditKobo - customer.balanceKobo)} (Net Credit)`
                      : customer.balanceKobo > customer.storeCreditKobo
                      ? `-${formatMoney(customer.balanceKobo - customer.storeCreditKobo)} (Net Due)`
                      : "₦0.00 (Balanced)"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Payments made in cash or bank transfer at the shop are credited to your account ledger upon receipt.
              </p>
            </div>
          </section>
        )}

        {/* TAB 3: Contact Shop */}
        {activeTab === "contact" && (
          <section className="portal-catalogue-section" aria-label="Contact Shop">
            <div className="portal-header">
              <h2 className="text-lg font-bold">Contact Store</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Have questions about your order, account statement, or special items? Reach out directly.
              </p>

              <div className="mt-4 flex flex-col gap-4">
                <div className="p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)]">Shop Address</p>
                  <p className="text-sm font-medium mt-1">{shop.address}</p>
                </div>

                {shop.whatsappPhone && (
                  <a
                    href={`https://wa.me/${shop.whatsappPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hello ${shop.name}, I'm messaging regarding my customer account (${customer.displayName}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="portal-whatsapp-btn"
                  >
                    Chat on WhatsApp ({shop.whatsappPhone})
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Floating Cart Sticky Bar */}
        {cartLines.length > 0 && activeTab === "catalogue" && (
          <aside className="portal-floating-cart" aria-label="Current Cart">
            <div className="portal-cart-info">
              <span className="portal-cart-count">
                {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"}
              </span>
              <span className="portal-cart-total">{formatMoney(cartSubtotalKobo)}</span>
            </div>
            <Button
              size="md"
              onClick={() => setIsReviewOpen(true)}
              aria-label="Review pre-order"
            >
              Review Pre-Order
            </Button>
          </aside>
        )}

        {/* Pre-Order Review Dialog */}
        <Dialog
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          title="Review Your Pre-Order"
          description="Confirm your selected items, payment preference, and pickup details."
          footer={
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsReviewOpen(false)}
                disabled={isSubmitting}
              >
                Back to Shopping
              </Button>
              <Button
                size="md"
                onClick={() => void handleOrderSubmit()}
                loading={isSubmitting}
                loadingLabel="Submitting…"
                disabled={isSubmitting || cartLines.length === 0}
              >
                Submit Pre-Order
              </Button>
            </div>
          }
        >
          <div className="portal-order-dialog-content">
            <div className="portal-order-lines-list" aria-label="Order Items">
              {cartLines.map(({ product, quantity }) => (
                <div key={product.id} className="portal-order-line">
                  <span className="portal-order-line-name">
                    {product.name} <small className="text-xs text-[var(--color-text-muted)]">× {quantity}</small>
                  </span>
                  <span className="portal-order-line-price">
                    {formatMoney(product.priceKobo * quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment Preference */}
            <div className="portal-payment-options">
              <p className="portal-payment-label">Payment Preference</p>

              {storeCreditAvailableKobo > 0 && (
                <label
                  className={`portal-payment-option ${
                    paymentPreference === "USE_STORE_CREDIT" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentPreference"
                    value="USE_STORE_CREDIT"
                    checked={paymentPreference === "USE_STORE_CREDIT"}
                    onChange={() => setPaymentPreference("USE_STORE_CREDIT")}
                  />
                  <div className="portal-payment-text">
                    <span className="portal-payment-title">
                      Use Available Store Credit ({formatMoney(storeCreditAvailableKobo)})
                    </span>
                    <span className="portal-payment-desc">
                      Deduct {formatMoney(storeCreditAppliedKobo)} automatically from your credit balance.
                    </span>
                  </div>
                </label>
              )}

              <label
                className={`portal-payment-option ${
                  paymentPreference === "PAY_ON_PICKUP" ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="paymentPreference"
                  value="PAY_ON_PICKUP"
                  checked={paymentPreference === "PAY_ON_PICKUP"}
                  onChange={() => setPaymentPreference("PAY_ON_PICKUP")}
                />
                <div className="portal-payment-text">
                  <span className="portal-payment-title">Pay on Pickup</span>
                  <span className="portal-payment-desc">Pay cash or card when collecting at the store.</span>
                </div>
              </label>

              <label
                className={`portal-payment-option ${
                  paymentPreference === "ON_ACCOUNT" ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="paymentPreference"
                  value="ON_ACCOUNT"
                  checked={paymentPreference === "ON_ACCOUNT"}
                  onChange={() => setPaymentPreference("ON_ACCOUNT")}
                />
                <div className="portal-payment-text">
                  <span className="portal-payment-title">Add to Credit Tab</span>
                  <span className="portal-payment-desc">Record on your store debt ledger for later payment.</span>
                </div>
              </label>
            </div>

            {/* Optional Pickup Note */}
            <div>
              <label htmlFor="portal-pickup-note" className="portal-payment-label block mb-1">
                Pickup Note (Optional)
              </label>
              <input
                id="portal-pickup-note"
                type="text"
                className="portal-search-input"
                placeholder="e.g. Will pick up around 5:30 PM today"
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
              />
            </div>

            {/* Order Totals Summary */}
            <div className="portal-order-summary">
              <div className="portal-summary-row">
                <span>Subtotal ({cartItemsCount} items)</span>
                <span className="font-mono">{formatMoney(cartSubtotalKobo)}</span>
              </div>
              {storeCreditAppliedKobo > 0 && (
                <div className="portal-summary-row credit">
                  <span>Store credit applied</span>
                  <span className="font-mono">−{formatMoney(storeCreditAppliedKobo)}</span>
                </div>
              )}
              <div className="portal-summary-row total">
                <span>Total Due on Pickup</span>
                <span className="font-mono text-base font-bold text-[var(--color-primary)]">
                  {formatMoney(amountDueKobo)}
                </span>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Order Success Dialog */}
        <Dialog
          open={isSuccessOpen}
          onOpenChange={setIsSuccessOpen}
          title="Pre-Order Submitted!"
          description="Your pre-order has been received by the shop."
          footer={
            <Button
              size="md"
              onClick={() => setIsSuccessOpen(false)}
              className="w-full"
            >
              Order More Items
            </Button>
          }
        >
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)] flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase">
                Order Reference
              </p>
              <h3 className="text-2xl font-bold font-mono text-[var(--color-primary)] mt-1">
                {lastOrderNumber}
              </h3>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
              {shop.name} is preparing your items. You will receive an update when your package is ready for pickup.
            </p>

            {lastWhatsappUrl && (
              <a
                href={lastWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="portal-whatsapp-btn mt-2"
              >
                Send Order Confirmation on WhatsApp
              </a>
            )}
          </div>
        </Dialog>
      </div>
    </main>
  );
}
