import { useRef, useState } from 'react';
import { useFormik } from 'formik';
import { useBlocker, useNavigate, useOutletContext, useBeforeUnload } from 'react-router';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import { StatusPanel } from '../../components/ui/status-panel';
import { useCreateProductMutation, useCatalogueQuery } from '../../service/api/products.api';
import { parseNaira } from '../../lib/money';
import { productSchema } from '../../schema/product.schema';
import type { User } from '../../models/responses/auth.response';
import type { HttpError } from '../../service/http-client';

export function AddProductPage() {
  const {user, onCreated} = useOutletContext<{user: User; onCreated: () => void}>();
  const navigate = useNavigate();
  const [createProduct] = useCreateProductMutation();
  const {data} = useCatalogueQuery();
  const [failure, setFailure] = useState('');
  const saved = useRef(false);
  const form = useFormik({initialValues: {name:'', reference:'', category:'', price:'', quantity:'', lowStockThreshold:''}, validationSchema: productSchema, validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setFailure('');
      try {
        await createProduct({name:values.name.trim(), reference:values.reference.trim(), category:values.category.trim(), priceKobo:parseNaira(values.price), quantity:Number(values.quantity), lowStockThreshold:Number(values.lowStockThreshold)}).unwrap();
        saved.current = true; onCreated(); await navigate('/app/products');
      } catch (caught) {
        const error = caught as HttpError;
        if (error.status === 409) {setFailure('A product with this reference already exists'); helpers.setFieldError('reference','A product with this reference already exists');}
        else if (error.status === 400) {helpers.setErrors(Object.fromEntries(Object.entries(error.fields).map(([key,value]) => [key === 'priceKobo' ? 'price' : key, value]))); setFailure('Check the highlighted fields before saving.');}
        else if (error.status === 403) setFailure('Only the owner can add products. Your role may have changed.');
        else setFailure('This product is not confirmed. Check the catalogue for this reference before trying again.');
      }
    }});
  const blocker = useBlocker(() => form.dirty && !saved.current && !form.isSubmitting);
  useBeforeUnload((event) => {if (form.dirty && !saved.current) event.preventDefault();});
  const close = () => {if (!form.isSubmitting) void navigate('/app/products');};
  const errors = Object.values(form.errors);
  const definitions = [['name','Name',''],['reference','Reference','Must be unique, for example IND-070'],['category','Category',''],['price','Selling price','Naira, up to 2 decimals'],['quantity','Quantity','Whole numbers only'],['lowStockThreshold','Low-stock threshold','Shows "Low" at or below this number']] as const;
  return <>
    <DialogPrimitive.Root open onOpenChange={(open) => {if (!open) close();}}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="shop-backdrop"/><DialogPrimitive.Content className="product-sheet" onEscapeKeyDown={(event) => {if (form.isSubmitting) event.preventDefault();}} onPointerDownOutside={(event) => {if (form.isSubmitting) event.preventDefault();}}>
      <header className="sheet-header"><DialogPrimitive.Title>Add product</DialogPrimitive.Title><button className="icon-button" aria-label="Close add product" disabled={form.isSubmitting} onClick={close}><span className="desktop-close">×</span><span className="mobile-back">←</span></button></header>
      <DialogPrimitive.Description className="sr-only">Add a product to your shop catalogue.</DialogPrimitive.Description>
      {user.role !== 'OWNER' ? <div className="sheet-body"><StatusPanel error title="Your role can’t do this"><p>Only the owner can add products. You can still view the list.</p><Button size="lg" variant="secondary" onClick={close}>Back to products</Button></StatusPanel></div> : <form className="product-form" onSubmit={form.handleSubmit} noValidate>
        <div className="sheet-body">{failure ? <StatusPanel error title="Could not save this product"><p>{failure}</p></StatusPanel> : form.submitCount > 0 && errors.length > 0 ? <StatusPanel error title="Fix"><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul><strong>before saving</strong></StatusPanel> : null}
        {definitions.map(([key,label,hint]) => <FormField key={key} label={label} hint={form.errors[key] && form.touched[key] ? undefined : hint || undefined} error={form.touched[key] ? form.errors[key] : undefined} className="product-field">
          {(field) => key === 'category' ? <><Input {...field} {...form.getFieldProps(key)} className="shop-input" list="product-categories" placeholder="Choose a category" disabled={form.isSubmitting}/><datalist id="product-categories">{[...new Set(data?.map((item) => item.category))].sort().map((category) => <option key={category} value={category}/>)}</datalist></> : <div className={key === 'price' ? 'price-input' : ''}>{key === 'price' && <span aria-hidden="true">₦</span>}<Input {...field} {...form.getFieldProps(key)} inputMode={key === 'price' ? 'decimal' : key === 'quantity' || key === 'lowStockThreshold' ? 'numeric' : 'text'} className="shop-input" disabled={form.isSubmitting}/></div>}
        </FormField>)}
        </div><footer className="sheet-footer"><Button size="lg" type="submit" loading={form.isSubmitting} loadingLabel="Saving…">Save product</Button><Button size="lg" variant="secondary" disabled={form.isSubmitting} onClick={close}>Cancel</Button></footer>
      </form>}
    </DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>
    <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => {if (!open && blocker.state === 'blocked') blocker.reset();}} title="Discard this product?" description="You have unsaved changes. If you leave now, they will be lost." className="shop-confirm" overlayClassName="shop-confirm-backdrop" closeClassName="hidden" footer={<><Button size="lg" onClick={() => blocker.state === 'blocked' && blocker.reset()}>Keep editing</Button><Button size="lg" variant="secondary" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>Discard</Button></>}/>
  </>;
}
