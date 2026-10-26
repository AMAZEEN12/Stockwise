import { useState } from "react";
import { Button } from "../../components/ui/button";
import { FilterBar } from "../../components/ui/filter-bar";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { LoadingState } from "../../components/ui/loading-state";
import { StatusPanel } from "../../components/ui/status-panel";
import { useSaleCatalogueQuery } from "../../service/api/products.api";
import type { Product } from "../../models/responses/products.response";
import { formatMoney, sumKobo } from "../../lib/money";
import type { CartLine } from "./sale-draft";

function lineTotal(line: CartLine) {
  try {
    return formatMoney(
      sumKobo([
        {
          priceKobo: line.product.priceKobo,
          quantity: line.quantity,
        },
      ]),
    );
  } catch {
    return "—";
  }
}

export function SaleProductCatalogue({
  disabled,
  cart,
  onSelect,
  onQuantityChange,
  onRemove,
}: {
  disabled: boolean;
  cart: readonly CartLine[];
  onSelect: (product: Product) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  const [{ query, throughPage }, setSearch] = useState({
    query: "",
    throughPage: 0,
  });
  const q = query.trim();
  const result = useSaleCatalogueQuery(
    { q, throughPage },
    { refetchOnMountOrArgChange: true },
  );
  // Previous rows may survive a failed Load more, but never a different search.
  const data =
    result.currentData || (result.data?.query === q ? result.data : undefined);
  const unavailable = disabled || result.isFetching || result.isError;
  const selectedIds = new Set(cart.map((line) => line.product.id));
  const availableItems =
    data?.items.filter((product) => !selectedIds.has(product.id)) ?? [];
  const changeQuery = (value: string) =>
    setSearch({ query: value, throughPage: 0 });
  return (
    <section className="sale-catalogue" aria-label="Product catalogue">
      <div className="sale-catalogue-heading">
        <div>
          <h2>Products</h2>
          <p className="micro">Alphabetical by name</p>
        </div>
        <Button
          variant="ghost"
          size="md"
          disabled={disabled || result.isFetching}
          onClick={() => void result.refetch()}
        >
          Refresh products
        </Button>
      </div>
      <FilterBar
        className="sale-filter-bar"
        label="Product catalogue filters"
        searchLabel="Search products to add"
        searchPlaceholder="Search products to add"
        query={query}
        onQueryChange={changeQuery}
        activeCount={0}
        onClearAll={() => changeQuery("")}
        searchInputProps={{
          type: "text",
          className: "shop-input",
          maxLength: 100,
          disabled,
        }}
        resultMessage={
          data && !result.isFetching && !result.isError
            ? `${availableItems.length} products available${data.nextPage !== null ? " — load more to see the rest" : ""}`
            : undefined
        }
      />
      {!!cart.length && (
        <ul className="sale-selected-list" aria-label="Items in this sale">
          {cart.map((line) => {
            const maximum = Math.min(line.product.quantity, 10000);
            const invalid =
              !!line.issue || line.quantity < 1 || line.quantity > 10000;
            return (
              <li
                className={`sale-selected-row${invalid ? " sale-selected-row-error" : ""}`}
                key={line.product.id}
              >
                <div className="sale-selected-product">
                  <span>
                    <strong>{line.product.name}</strong>
                    <small className="micro">
                      {formatMoney(line.product.priceKobo)} each
                    </small>
                  </span>
                  <span>{lineTotal(line)}</span>
                </div>
                <div className="quantity-controls">
                  <Button
                    variant="ghost"
                    className="icon-button"
                    iconOnly
                    aria-label={`Decrease ${line.product.name}`}
                    disabled={disabled || line.quantity <= 1}
                    onClick={() =>
                      onQuantityChange(line.product.id, line.quantity - 1)
                    }
                  >
                    −
                  </Button>
                  <label className="sr-only" htmlFor={`quantity-${line.product.id}`}>
                    Quantity for {line.product.name}
                  </label>
                  <Input
                    id={`quantity-${line.product.id}`}
                    className="quantity-input"
                    aria-label={`Quantity for ${line.product.name}`}
                    inputMode="numeric"
                    value={line.quantity}
                    disabled={disabled}
                    onChange={(event) => {
                      if (/^\d{0,7}$/.test(event.target.value))
                        onQuantityChange(
                          line.product.id,
                          Number(event.target.value),
                        );
                    }}
                  />
                  <Button
                    variant="ghost"
                    className="icon-button"
                    iconOnly
                    aria-label={`Increase ${line.product.name}`}
                    disabled={disabled || line.quantity >= maximum}
                    onClick={() =>
                      onQuantityChange(line.product.id, line.quantity + 1)
                    }
                  >
                    ＋
                  </Button>
                  <Button
                    variant="ghost"
                    className="remove-line"
                    iconOnly
                    aria-label={`Remove ${line.product.name}`}
                    disabled={disabled}
                    onClick={() => onRemove(line.product.id)}
                  >
                    ×
                  </Button>
                </div>
                {(line.issue || line.quantity > 10000) && (
                  <p className="line-error">
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle cx="8" cy="8" r="7" />
                      <path d="M8 4v5m0 2v1" strokeWidth="1.5" />
                    </svg>
                    {line.quantity > 10000
                      ? "Quantity cannot exceed 10,000."
                      : line.issue}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div
        className="sale-search-results"
        aria-label="Product catalogue results"
        aria-busy={result.isFetching}
      >
        {result.isFetching && !data && (
          <LoadingState
            label={q ? "Searching products…" : "Loading products…"}
          />
        )}
        {result.isError && (
          <StatusPanel
            error
            title={
              data ? "Could not refresh products" : "Could not load products"
            }
          >
            <p>
              {data
                ? "Previously loaded products may be out of date. Retry before adding one."
                : "Check your connection and try again."}
            </p>
            {result.error &&
              "requestId" in result.error &&
              result.error.requestId && (
                <p className="micro">Request ID {result.error.requestId}</p>
              )}
            <Button
              variant="secondary"
              size="lg"
              disabled={result.isFetching}
              onClick={() => void result.refetch()}
            >
              Retry products
            </Button>
          </StatusPanel>
        )}
        {data && (
          <>
            {!!availableItems.length && (
              <ul
                className="sale-catalogue-list"
                aria-label="Products available for this sale"
              >
                {availableItems.map((product) => (
                  <li key={product.id}>
                    <Button
                      variant="ghost"
                      contentClassName="search-result-content"
                      className="search-result"
                      disabled={unavailable || product.quantity === 0}
                      onClick={() => {
                        onSelect(product);
                        changeQuery("");
                      }}
                    >
                      <span>
                        <strong>{product.name}</strong>
                        <small className="micro">
                          {product.quantity > 0
                            ? `${product.quantity} in stock`
                            : "Out of stock"}
                        </small>
                      </span>
                      <span>{formatMoney(product.priceKobo)}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {!data.items.length && !result.isFetching && !result.isError && (
              <EmptyState
                layout="panel"
                className="status-panel"
                title={q ? "No matching products" : "No products yet"}
                description={
                  q
                    ? "Try a different name or reference."
                    : "Active products added to the shop will appear here."
                }
              />
            )}
            {!!data.items.length &&
              !availableItems.length &&
              !result.isFetching &&
              !result.isError && (
                <EmptyState
                  layout="panel"
                  className="status-panel"
                  title="All matching products selected"
                  description="Adjust their quantities above or search for another product."
                />
              )}
            <div className="sale-catalogue-actions">
              {data.nextPage !== null && (
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={unavailable}
                  onClick={() =>
                    setSearch({ query, throughPage: data.nextPage! })
                  }
                >
                  {result.isFetching
                    ? "Loading products…"
                    : "Load more products"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
