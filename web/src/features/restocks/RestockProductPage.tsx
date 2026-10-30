import { useRef, useState } from 'react';
import { useFormik } from 'formik';
import { useBeforeUnload, useBlocker, useNavigate, useOutletContext, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { ConfirmDialog, Dialog } from '../../components/ui/dialog';
import { FormField } from '../../components/ui/form-field';
import { Input } from '../../components/ui/input';
import { LoadingState } from '../../components/ui/loading-state';
import { StatusPanel } from '../../components/ui/status-panel';
import type { User } from '../../models/responses/auth.response';
import type { RestockCreate } from '../../models/requests/restocks.request';
import { restockSchema } from '../../schema/restock.schema';
import { useProductQuery } from '../../service/api/products.api';
import { useCreateRestockMutation } from '../../service/api/restocks.api';
import type { HttpError } from '../../service/http-client';
import { lagosToday } from '../../shared/lagos-date';
import { clearRestockAttempt, persistRestockAttempt, readRestockAttempt, type RestockAttempt } from './restock-attempt';

interface ProductsOutletContext { user: User; onRestocked: (quantity: number, productName: string) => void }

export function RestockProductPage() {
  const { productId = '' } = useParams();
  const { user, onRestocked } = useOutletContext<ProductsOutletContext>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProductQuery(productId);
  const [createRestock] = useCreateRestockMutation();
  const [stored] = useState(() => readRestockAttempt(user.id));
  const matching = typeof stored === 'object' && stored?.body.productId === productId ? stored : null;
  const [attempt, setAttempt] = useState<RestockAttempt | null>(matching);
  const [failure, setFailure] = useState(() => {
    if (stored === 'invalid') return 'Saved recovery data is invalid. Clear this site’s session data before recording another restock.';
    if (stored === 'other') return 'A restock from another account or service still needs checking.';
    if (typeof stored === 'object' && stored && stored.body.productId !== productId) return 'Another product has a restock that is not yet confirmed.';
    return matching ? 'This restock was not confirmed. Submit again to safely check the same request.' : '';
  });
  const saved = useRef(false);
  const form = useFormik({
    initialValues: {
      quantity: matching ? String(matching.body.quantity) : '',
      receivedOn: matching?.body.receivedOn ?? lagosToday(),
      note: matching?.body.note ?? '',
    },
    validationSchema: restockSchema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      if (!product) return;
      const quantity = Number(values.quantity);
      if (!attempt && quantity > 2147483647 - product.quantity) {
        helpers.setFieldError('quantity', 'This quantity would exceed the supported stock limit.');
        setFailure('Choose a smaller quantity. Nothing was recorded.');
        return;
      }
      const body: RestockCreate = {
        productId: product.id,
        quantity,
        receivedOn: values.receivedOn,
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      };
      setFailure('');
      let current = attempt;
      const wasPending = !!attempt;
      try {
        current ??= persistRestockAttempt(user.id, body);
        setAttempt(current);
        await createRestock({ body: current.body, key: current.key }).unwrap();
        clearRestockAttempt();
        setAttempt(null);
        saved.current = true;
        onRestocked(current.body.quantity, product.name);
        await navigate('/app/products');
      } catch (caught) {
        const error = caught as HttpError;
        const definitive = !wasPending && typeof error.status === 'number' && error.status >= 400 && error.status < 500 && error.status !== 422;
        if (definitive) { clearRestockAttempt(); setAttempt(null); }
        if (!current) setFailure('Recovery storage is unavailable. Nothing was sent; enable session storage and try again.');
        else if (wasPending || error.status === 422) setFailure('This restock is still not confirmed. Keep this tab and contact the owner or check the restock history before taking further action.');
        else if (error.status === 400) {
          helpers.setErrors(error.fields);
          setFailure('Check the highlighted fields before recording this restock.');
        } else if (error.status === 403) setFailure('Only the owner can record restocks. Your role may have changed.');
        else if (error.status === 404) setFailure('This product no longer exists. Nothing was recorded.');
        else if (error.status === 409 && error.code === 'STOCK_LIMIT_EXCEEDED') {
          helpers.setFieldError('quantity', 'This quantity would exceed the supported stock limit.');
          setFailure('Choose a smaller quantity. Nothing was recorded.');
        } else setFailure('This restock is not confirmed. Submit again to safely check the same request.');
      }
    },
  });
  const blockedByOther = stored === 'invalid' || stored === 'other'
    || (typeof stored === 'object' && stored !== null && stored.body.productId !== productId);
  const blocker = useBlocker(() => form.dirty && !saved.current && !attempt && !form.isSubmitting);
  useBeforeUnload((event) => { if (form.dirty && !saved.current && !attempt) event.preventDefault(); });
  const close = () => { if (!form.isSubmitting) void navigate('/app/products'); };
  const resultQuantity = product && /^\d+$/.test(form.values.quantity)
    ? BigInt(product.quantity) + BigInt(form.values.quantity) : null;

  return <>
    <Dialog open onOpenChange={(open) => { if (!open) close(); }} title="Restock product"
      description="Record stock received for this product." placement="right" dismissible={!form.isSubmitting}
      className="product-sheet" overlayClassName="shop-backdrop" headerClassName="sheet-header"
      bodyClassName="product-dialog-body" descriptionClassName="sr-only" closeClassName="icon-button"
      closeLabel="Close restock product" closeContent={<><span className="desktop-close">×</span><span className="mobile-back">←</span></>}>
      {user.role !== 'OWNER' ? <div className="sheet-body"><StatusPanel error title="Your role can’t do this"><p>Only the owner can record restocks.</p><Button size="lg" variant="secondary" onClick={close}>Back to products</Button></StatusPanel></div>
        : isLoading ? <div className="sheet-body"><LoadingState label="Loading product…" /></div>
        : isError || !product ? <div className="sheet-body"><StatusPanel error title="Product unavailable"><p>This product could not be loaded.</p><Button size="lg" variant="secondary" onClick={close}>Back to products</Button></StatusPanel></div>
        : <form className="product-form" onSubmit={form.handleSubmit} noValidate>
          <div className="sheet-body">
            <div className="restock-product-summary"><strong>{product.name}</strong><span className="micro">{product.reference} · Current stock {product.quantity}</span></div>
            {failure && <StatusPanel error title={attempt ? 'Restock not confirmed' : 'Could not record this restock'}><p>{failure}</p></StatusPanel>}
            <FormField label="Quantity received" required requiredIndicator={false} error={form.touched.quantity ? form.errors.quantity : undefined} className="product-field">
              {(field) => <Input {...field} {...form.getFieldProps('quantity')} inputMode="numeric" className="shop-input" disabled={form.isSubmitting || !!attempt || blockedByOther} />}
            </FormField>
            <FormField label="Date received" required requiredIndicator={false} error={form.touched.receivedOn ? form.errors.receivedOn : undefined} className="product-field">
              {(field) => <Input {...field} {...form.getFieldProps('receivedOn')} type="date" className="shop-input" disabled={form.isSubmitting || !!attempt || blockedByOther} />}
            </FormField>
            <FormField label="Note" hint="Optional, up to 500 characters" error={form.touched.note ? form.errors.note : undefined} className="product-field">
              {(field) => <Input {...field} {...form.getFieldProps('note')} className="shop-input" disabled={form.isSubmitting || !!attempt || blockedByOther} />}
            </FormField>
            {resultQuantity !== null && resultQuantity <= 2147483647n && <p className="restock-result micro">Stock after restock: <strong>{resultQuantity.toString()}</strong></p>}
          </div>
          <footer className="sheet-footer"><Button size="lg" type="submit" loading={form.isSubmitting} loadingLabel="Recording…" disabled={blockedByOther}>{attempt ? 'Check same restock' : 'Record restock'}</Button><Button size="lg" variant="secondary" disabled={form.isSubmitting} onClick={close}>Cancel</Button></footer>
        </form>}
    </Dialog>
    <ConfirmDialog open={blocker.state === 'blocked'} onOpenChange={(open) => { if (!open && blocker.state === 'blocked') blocker.reset(); }} title="Discard this restock?" description="You have unsaved changes. If you leave now, they will be lost."
      className="shop-confirm" overlayClassName="shop-confirm-backdrop" closeClassName="hidden" tone="danger" confirmLabel="Discard" cancelLabel="Keep editing" closeOnConfirm={false}
      confirmButtonProps={{ variant: 'secondary', size: 'lg' }} cancelButtonProps={{ variant: 'primary', size: 'lg' }} onConfirm={() => { if (blocker.state === 'blocked') blocker.proceed(); }} />
  </>;
}
