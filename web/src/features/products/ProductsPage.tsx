import { Link, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router";
import {
  useProductsQuery,
  useCatalogueQuery,
} from "../../service/api/products.api";
import type { User } from "../../models/responses/auth.response";
import type { StockState } from "../../models/responses/products.response";
import { formatMoney } from "../../lib/money";
import { Button } from "../../components/ui/button";
import { FilterBar } from "../../components/ui/filter-bar";
import { FormField } from "../../components/ui/form-field";
import { Select } from "../../components/ui/select";
import { StatusBadge } from "../../components/ui/status-badge";
import { ErrorState } from "../../components/ui/error-state";
import { EmptyState } from "../../components/ui/empty-state";
import { LoadingState } from "../../components/ui/loading-state";
import { useToast } from "../../components/ui/toast";

const filters: [string, StockState | ""][] = [
  ["All", ""],
  ["In stock", "IN_STOCK"],
  ["Low", "LOW"],
  ["Out of stock", "OUT"],
  ["Archived", "ARCHIVED"],
];
export function ProductsPage() {
  const user = useOutletContext<User>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const stock =
    filters.find(([, value]) => value === params.get("stockState"))?.[1] ||
    undefined;
  const page = Math.max(0, Number(params.get("page")) || 0);
  const { data, isFetching, isError, refetch, fulfilledTimeStamp } =
    useProductsQuery({
      q: params.get("q") || undefined,
      category: params.get("category") || undefined,
      stockState: stock,
      page,
      size: 20,
    });
  const categories = useCatalogueQuery();
  const { toast } = useToast();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const time = fulfilledTimeStamp
    ? new Date(fulfilledTimeStamp).toLocaleTimeString("en-GB", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Products</h1>
          <p className="micro">as of {time} WAT</p>
        </div>
        {user.role === "OWNER" && (
          <Link className="primary-link add-product" to="new">
            Add product
          </Link>
        )}
      </div>
      {user.role !== "OWNER" && (
        <p className="micro role-note">ⓘ Only the owner can add products.</p>
      )}
      <FilterBar
        className="product-filter-bar"
        searchLabel="Search name or reference"
        searchPlaceholder="Search name or reference"
        searchInputProps={{ type: "text", className: "shop-input" }}
        query={params.get("q") || ""}
        onQueryChange={(value) => update("q", value)}
        activeCount={Number(!!stock) + Number(!!params.get("category"))}
        onClearAll={() => setParams({})}
        resultMessage={data && !isFetching ? `${data.totalItems} products found` : undefined}
      >
        <FormField label="Filter by category" className="category-filter">
          {(field) => <Select {...field} className="shop-input" allowAny anyLabel="Category: All"
            value={params.get("category") ? `category:${params.get("category")}` : undefined}
            onValueChange={(value) => update("category", value?.slice("category:".length) || "")}
            options={[...new Set(categories.data?.map((item) => item.category))].filter(Boolean).sort().map((category) => ({value: `category:${category}`, label: category}))}/>
          }
        </FormField>
      </FilterBar>
      <div className="filter-chips" aria-label="Stock state">
        {filters.map(([label, value]) => (
          <Button variant="ghost" key={label} aria-pressed={(stock ?? "") === value} onClick={() => update("stockState", value)}>{label}</Button>
        ))}
      </div>
      {isError ? (
        <ErrorState layout="panel" className="status-panel" title="Could not load products" description="Your filters are still here." onRetry={() => void refetch()} retrying={isFetching} retryLabel="Retry" actionProps={{variant:"secondary",size:"lg"}}/>
      ) : !data ? (
        <LoadingState label="Loading products…"/>
      ) : data.items.length === 0 ? (
        <EmptyState layout="panel" className="status-panel" title={params.size ? "No products match your filters" : "No products yet"}
          description={params.size ? "Clear the filters to see your catalogue." : "Add your first product to start keeping stock."}/>
      ) : (
        <>
          <div className="product-table" aria-busy={isFetching}>
            <div className="product-table-head micro">
              <span>Name</span>
              <span>Category</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Quantity</span>
            </div>
            {data.items.map((product) => (
              <article
                className="product-row product-row-clickable"
                key={product.id}
                tabIndex={0}
                aria-label={`${product.name}, ${product.reference}, ${product.category}. View stock movements.`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a, button")) return;
                  void navigate(`/app/products/${product.id}/movements${location.search}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if ((e.target as HTMLElement).closest("a, button")) return;
                    e.preventDefault();
                    void navigate(`/app/products/${product.id}/movements${location.search}`);
                  }
                }}
              >
                <div className="product-name">
                  <strong title={product.name}>{product.name}</strong>
                  <span className="micro">
                    {product.reference}
                    <span className="mobile-category">
                      {" "}
                      · {product.category}
                    </span>
                  </span>
                </div>
                <span className="desktop-category">{product.category}</span>
                <span className="product-price">
                  {Number.isSafeInteger(product.priceKobo) &&
                  product.priceKobo >= 0
                    ? formatMoney(product.priceKobo)
                    : "Amount unavailable"}
                </span>
                <StatusBadge
                  appearance="outline"
                  tone={product.stockState === "IN_STOCK" ? "success" : product.stockState === "LOW" ? "warning" : product.stockState === "OUT" ? "danger" : "neutral"}
                  className={`stock-badge stock-${product.stockState.toLowerCase()}`}
                  icon={product.stockState !== "ARCHIVED" ? <span>{product.stockState === "IN_STOCK" ? "✓" : product.stockState === "LOW" ? "▲" : "⊘"}</span> : undefined}
                >
                  {product.stockState === "IN_STOCK"
                    ? "In stock"
                    : product.stockState === "LOW"
                      ? `Low (${product.quantity} left, threshold ${product.lowStockThreshold})`
                      : product.stockState === "OUT"
                        ? "Out of stock"
                        : "Archived"}
                </StatusBadge>
                <span className="product-quantity micro">
                  <span>Qty </span>
                  {product.quantity}
                </span>
              </article>
            ))}
          </div>
          {data.totalItems > data.size && (
            <div className="pagination">
              <Button
                variant="secondary"
                size="lg"
                disabled={!page}
                onClick={() => update("page", String(page - 1))}
              >
                Previous
              </Button>
              <span>Page {page + 1}</span>
              <Button
                variant="secondary"
                size="lg"
                disabled={(page + 1) * data.size >= data.totalItems}
                onClick={() => update("page", String(page + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      <Outlet
        context={{
          user,
          onCreated: () => {
            toast({ variant: "success", title: "Product added" });
            setParams({});
          },
          onRestocked: (quantity: number, productName: string) => {
            toast({ variant: "success", title: `${productName} restocked`, description: `${quantity} units added.` });
          },
        }}
      />
    </>
  );
}
