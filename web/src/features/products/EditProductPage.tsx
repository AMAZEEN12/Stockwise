import { useRef, useState } from 'react';
import { useFormik } from 'formik';
import { useBlocker, useNavigate, useOutletContext, useBeforeUnload, useParams, useLocation } from 'react-router';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import { StatusPanel } from '../../components/ui/status-panel';
import { LoadingState } from '../../components/ui/loading-state';
import { usePatchProductMutation, useProductQuery, useCatalogueQuery } from '../../service/api/products.api';
import { parseNaira } from '../../lib/money';
import { productEditSchema } from '../../schema/product.schema';
import type { User } from '../../models/responses/auth.response';
import type { HttpError } from '../../service/http-client';

export function EditProductPage() {
  const { productId = '' } = useParams<{ productId: string }>();
  const { user, onUpdated } = useOutletContext<{ user: User; onUpdated?: (productName: string) => void }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: product, isLoading, isError, refetch } = useProductQuery(productId, { skip: !productId });
  const [patchProduct] = usePatchProductMutation();
  const { data: catalogue } = useCatalogueQuery();
  const [failure, setFailure] = useState('');
  const [isConflict, setIsConflict] = useState(false);
  const saved = useRef(false);

  const initialPrice = product ? (product.priceKobo / 100).toFixed(2) : '';

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: product?.name ?? '',
      reference: product?.reference ?? '',
      category: product?.category ?? '',
      price: initialPrice,
      lowStockThreshold: product ? String(product.lowStockThreshold) : '',
    },
    validationSchema: productEditSchema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      if (!product) return;
      setFailure('');
      setIsConflict(false);
      try {
        await patchProduct({
          id: product.id,
          version: product.version,
          data: {
            name: values.name.trim(),
            reference: values.reference.trim(),
            category: values.category.trim(),
            priceKobo: parseNaira(values.price),
            lowStockThreshold: Number(values.lowStockThreshold),
          },
        }).unwrap();
        saved.current = true;
        if (onUpdated) onUpdated(values.name.trim());
        const search = location.search;
        await navigate(location.pathname.startsWith('/app/products/') && !location.pathname.includes('/movements') ? `/app/products${search}` : -1 as unknown as string);
      } catch (caught) {
        const error = caught as HttpError;
        if (error.status === 412) {
          setIsConflict(true);
          setFailure('This product was modified in another session. Please refresh to load the latest values.');
        } else if (error.status === 409) {
          setFailure('A product with this reference already exists');
          helpers.setFieldError('reference', 'A product with this reference already exists');
        } else if (error.status === 400 && error.fields) {
          helpers.setErrors(
            Object.fromEntries(
              Object.entries(error.fields).map(([key, value]) => [key === 'priceKobo' ? 'price' : key, value])
            )
          );
          setFailure('Check the highlighted fields before saving.');
        } else if (error.status === 403) {
          setFailure('Only the owner can edit products. Your role may have changed.');
        } else {
          setFailure('Could not save product changes. Please check your connection and try again.');
        }
      }
    },
  });

  const blocker = useBlocker(() => form.dirty && !saved.current && !form.isSubmitting);
  useBeforeUnload((event) => {
    if (form.dirty && !saved.current) event.preventDefault();
  });

  const close = () => {
    if (!form.isSubmitting) {
      if (location.pathname.includes('/movements')) {
        void navigate(`/app/products/${productId}/movements${location.search}`);
      } else {
        void navigate(`/app/products${location.search}`);
      }
    }
  };

  const handleRefreshLatest = async () => {
    setFailure('');
    setIsConflict(false);
    await refetch();
  };

  const errors = Object.values(form.errors);
  const definitions = [
    ['name', 'Name', ''],
    ['reference', 'Reference', 'Must be unique, for example IND-070'],
    ['category', 'Category', ''],
    ['price', 'Selling price', 'Naira, up to 2 decimals'],
    ['lowStockThreshold', 'Low-stock threshold', 'Shows "Low" at or below this number'],
  ] as const;

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title="Edit product"
        description="Update product details in your shop catalogue."
        placement="right"
        dismissible={!form.isSubmitting}
        className="product-sheet"
        overlayClassName="shop-backdrop"
        headerClassName="sheet-header"
        bodyClassName="product-dialog-body"
        descriptionClassName="sr-only"
        closeClassName="icon-button"
        closeLabel="Close edit product"
        closeContent={
          <>
            <span className="desktop-close">×</span>
            <span className="mobile-back">←</span>
          </>
        }
      >
        {user.role !== 'OWNER' ? (
          <div className="sheet-body">
            <StatusPanel error title="Your role can’t do this">
              <p>Only the owner can edit products. You can still view the list.</p>
              <Button size="lg" variant="secondary" onClick={close}>
                Back to products
              </Button>
            </StatusPanel>
          </div>
        ) : isLoading ? (
          <div className="sheet-body">
            <LoadingState label="Loading product details…" />
          </div>
        ) : isError || !product ? (
          <div className="sheet-body">
            <StatusPanel error title="Product unavailable">
              <p>This product could not be loaded or may have been removed.</p>
              <Button size="lg" variant="secondary" onClick={close}>
                Back to products
              </Button>
            </StatusPanel>
          </div>
        ) : (
          <form className="product-form" onSubmit={form.handleSubmit} noValidate>
            <div className="sheet-body">
              {failure ? (
                <StatusPanel error title={isConflict ? 'Version conflict' : 'Could not save product'}>
                  <p>{failure}</p>
                  {isConflict && (
                    <div className="mt-3">
                      <Button size="md" variant="secondary" type="button" onClick={() => void handleRefreshLatest()}>
                        Load latest product details
                      </Button>
                    </div>
                  )}
                </StatusPanel>
              ) : form.submitCount > 0 && errors.length > 0 ? (
                <StatusPanel error title="Fix">
                  <ul>
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                  <strong>before saving</strong>
                </StatusPanel>
              ) : null}

              <div className="edit-product-meta" aria-label="Product stock status">
                <div className="edit-product-stock-info">
                  <span className="micro">Current stock:</span>
                  <strong>{product.quantity} units</strong>
                  <span className="micro stock-note">(Adjusted via sales & restocks)</span>
                </div>
                <div className="edit-product-status-tag">
                  <span className="micro">Status:</span>
                  <strong>{product.active ? 'Active' : 'Archived'}</strong>
                </div>
              </div>

              {definitions.map(([key, label, hint]) => (
                <FormField
                  key={key}
                  label={label}
                  required
                  requiredIndicator={false}
                  hint={form.errors[key] && form.touched[key] ? undefined : hint || undefined}
                  error={form.touched[key] ? form.errors[key] : undefined}
                  className="product-field"
                >
                  {(field) =>
                    key === 'category' ? (
                      <>
                        <Input
                          {...field}
                          {...form.getFieldProps(key)}
                          required
                          className="shop-input"
                          list="edit-product-categories"
                          placeholder="Choose a category"
                          disabled={form.isSubmitting}
                        />
                        <datalist id="edit-product-categories">
                          {[...new Set(catalogue?.map((item) => item.category))].sort().map((category) => (
                            <option key={category} value={category} />
                          ))}
                        </datalist>
                      </>
                    ) : (
                      <div className={key === 'price' ? 'price-input' : ''}>
                        {key === 'price' && <span aria-hidden="true">₦</span>}
                        <Input
                          {...field}
                          {...form.getFieldProps(key)}
                          required
                          inputMode={key === 'price' ? 'decimal' : key === 'lowStockThreshold' ? 'numeric' : 'text'}
                          className="shop-input"
                          disabled={form.isSubmitting}
                        />
                      </div>
                    )
                  }
                </FormField>
              ))}
            </div>
            <footer className="sheet-footer">
              <Button size="lg" type="submit" loading={form.isSubmitting} loadingLabel="Saving…">
                Save changes
              </Button>
              <Button size="lg" variant="secondary" disabled={form.isSubmitting} onClick={close}>
                Cancel
              </Button>
            </footer>
          </form>
        )}
      </Dialog>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset();
        }}
        title="Discard changes?"
        description="You have unsaved changes. If you leave now, they will be lost."
        className="shop-confirm"
        overlayClassName="shop-confirm-backdrop"
        closeClassName="hidden"
        tone="danger"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        closeOnConfirm={false}
        confirmButtonProps={{ variant: 'secondary', size: 'lg' }}
        cancelButtonProps={{ variant: 'primary', size: 'lg' }}
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed();
        }}
      />
    </>
  );
}
