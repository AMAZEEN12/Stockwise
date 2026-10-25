import {forwardRef,useImperativeHandle,useRef,useState} from 'react';
import {useFormik} from 'formik';
import {Button} from '../../components/ui/button';
import {Input} from '../../components/ui/input';
import {FormField} from '../../components/ui/form-field';
import {customerSchema} from '../../schema/customer.schema';
import {customersApi,useCreateCustomerMutation,validCustomer} from '../../service/api/customers.api';
import {store} from '../../app/store/store';
import {httpClient,normalizeHttpError} from '../../service/http-client';
import type {HttpError} from '../../service/http-client';
import {authEndpoints} from '../../service/endpoints/auth.endpoints';
import {readSession} from '../../auth/session';
import type {User} from '../../models/responses/auth.response';
import type {Customer} from '../../models/responses/customers.response';
import {clearCustomerAttempt,markCustomerListChecked,persistCustomerAttempt,readCustomerAttempt} from './customer-create-recovery';
import {CustomerIcon} from './CustomerStates';

export interface CustomerFormHandle {requestClose:()=>void}
interface Props {user:User;select?:boolean;onSaved:(customer:Customer)=>void;onCancel:()=>void;onBusy:(busy:boolean)=>void;onCheck:()=>void}
export const CustomerForm = forwardRef<CustomerFormHandle,Props>(function CustomerForm({user,select,onSaved,onCancel,onBusy,onCheck},ref) {
  const [attempt,setAttempt] = useState(() => readCustomerAttempt(user.id));
  const ownAttempt = attempt && typeof attempt === 'object' ? attempt : null;
  const [failure,setFailure] = useState('');
  const [requestId,setRequestId] = useState('');
  const [discard,setDiscard] = useState(false);
  const [acknowledged,setAcknowledged] = useState(false);
  const submitting = useRef(false);
  const [createCustomer] = useCreateCustomerMutation();
  const form = useFormik({initialValues:{displayName:ownAttempt?.body.displayName || '',contactPlaceholder:ownAttempt?.body.contactPlaceholder || ''},validationSchema:customerSchema,
    onSubmit:async (values,helpers) => {
      if (submitting.current || attempt) return;
      submitting.current = true; onBusy(true); setFailure(''); setRequestId('');
      let sent = false;
      try {
        if (readSession()?.user.id !== user.id) {setFailure('Your session ended. Sign in again before saving.'); return;}
        const current = (await httpClient.get<User>(authEndpoints.me)).data;
        if (current.id !== user.id || !['OWNER','ASSISTANT'].includes(current.role)) {setFailure('Read-only access. Your current role cannot add customers.'); return;}
        const body = {displayName:values.displayName.trim(),...(values.contactPlaceholder.trim() ? {contactPlaceholder:values.contactPlaceholder.trim()} : {})};
        persistCustomerAttempt(user.id,body);
        sent = true;
        const customer = await createCustomer(body).unwrap();
        if (!validCustomer(customer)) throw {status:'NETWORK',fields:{},code:'INVALID_CUSTOMER_RESPONSE'};
        store.dispatch(customersApi.util.updateQueryData('customers',undefined,(items)=>{if(!items.some((item)=>item.id===customer.id))items.push(customer);}));
        clearCustomerAttempt(); helpers.resetForm(); onSaved(customer);
      } catch (caught) {
        const error = caught && typeof caught === 'object' && 'status' in caught ? caught as HttpError : normalizeHttpError(caught);
        setRequestId(error.requestId || '');
        if (sent && (error.status === 400 || error.status === 401 || error.status === 403)) {
          clearCustomerAttempt(); helpers.setErrors(error.fields);
          setFailure(error.status === 400 ? "Couldn't save the customer. Nothing was added." : error.status === 401 ? 'Your session ended. Sign in again before saving.' : 'Read-only access. Your current role cannot add customers.');
        } else if (sent) {setAttempt(readCustomerAttempt(user.id)); setFailure('This customer is not confirmed. Check the customer list before creating again.');}
        else setFailure('Could not prepare a safe save. Check your session, connection and browser storage. Nothing was sent.');
      } finally {submitting.current=false; onBusy(false);}
    }});
  const requestClose = () => {if (submitting.current) return; if (form.dirty && !attempt) setDiscard(true); else onCancel();};
  useImperativeHandle(ref,() => ({requestClose}));
  const check = () => {try {markCustomerListChecked(user.id); onCheck();} catch {setFailure('Could not preserve recovery details. Restore browser storage before continuing.');}};
  return <form className="customer-form" noValidate onSubmit={form.handleSubmit}>
    {(failure || attempt) && <div role="alert" className="customer-save-error"><CustomerIcon kind="error"/><strong>{failure || (attempt === 'other' ? 'An unfinished customer save belongs to another account or service. Restore that connection to check it.' : attempt === 'invalid' ? 'The unfinished customer save cannot be read. Check its outcome before creating again.' : 'This customer is not confirmed. Check the customer list before creating again.')}</strong>{requestId && <p className="customer-micro">Request ID {requestId}</p>}</div>}
    <FormField label="Display name (required)" error={form.touched.displayName ? form.errors.displayName : undefined} className="customer-field">
      {(field) => <Input {...field} {...form.getFieldProps('displayName')} className="shop-input" aria-required="true" autoComplete="off" disabled={form.isSubmitting || !!attempt}/>}
    </FormField>
    <FormField label="Contact (optional)" error={form.touched.contactPlaceholder ? form.errors.contactPlaceholder : undefined} className="customer-field">
      {(field) => <Input {...field} {...form.getFieldProps('contactPlaceholder')} className="shop-input" placeholder="Phone or note" autoComplete="off" disabled={form.isSubmitting || !!attempt}/>}
    </FormField>
    {attempt ? <><Button size="lg" variant="secondary" onClick={check}>Check customer list</Button>{ownAttempt?.checked && <div className="customer-recovery-ack"><label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)}/> I checked the list and understand creating again may add a duplicate.</label><Button size="lg" variant="secondary" disabled={!acknowledged} onClick={() => {clearCustomerAttempt();setAttempt(null);setFailure('');setAcknowledged(false);}}>Start a new attempt</Button></div>}</> : discard ? <div className="customer-discard" role="group" aria-label="Discard unsaved customer"><p>You have unsaved changes.</p><Button size="lg" onClick={() => setDiscard(false)}>Keep editing</Button><Button size="lg" variant="secondary" onClick={onCancel}>Discard changes</Button></div> : <div className="customer-form-actions"><Button size="lg" type="submit" loading={form.isSubmitting} loadingLabel="Saving…" className={form.isSubmitting ? 'customer-saving' : ''}>{failure ? 'Try again' : select ? 'Save and select' : 'Save customer'}</Button><Button size="lg" variant="secondary" disabled={form.isSubmitting} onClick={requestClose}>Cancel</Button></div>}
  </form>;
});
