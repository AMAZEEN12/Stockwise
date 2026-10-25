import {useEffect,useState} from 'react';
import {Link, useNavigate, useOutletContext} from 'react-router';
import {Button} from '../../components/ui/button';
import {Dialog} from '../../components/ui/dialog';
import {StatusPanel} from '../../components/ui/status-panel';
import {useProductsQuery} from '../../service/api/products.api';
import {useCustomersQuery} from '../../service/api/customers.api';
import {CustomerPicker} from '../customers/CustomerPicker';
import type {Customer} from '../../models/responses/customers.response';
import {useCreateSaleMutation} from '../../service/api/sales.api';
import {httpClient,normalizeHttpError} from '../../service/http-client';
import type {HttpError} from '../../service/http-client';
import {productsEndpoints} from '../../service/endpoints/products.endpoints';
import {authEndpoints} from '../../service/endpoints/auth.endpoints';
import type {Product} from '../../models/responses/products.response';
import type {User} from '../../models/responses/auth.response';
import {clearSession, readSession} from '../../auth/session';
import {formatMoney, displayMoney, sumKobo, checkedKobo} from '../../lib/money';
import {clearPending, persistPending, persistReceipt, readPending, readCartDraft, saveCartDraft, validSale} from './sale-draft';
import type {CartLine, PendingSale} from './sale-draft';
import '../../styles/sales.css';

type State = 'idle'|'checking'|'confirm'|'sending'|'retrying'|'error'|'session'|'recovery'|'conflict'|'forbidden';
export function NewSalePage() {
  const user = useOutletContext<User>();
  const [initial] = useState(() => readPending(user.id));
  const [draft] = useState(() => readCartDraft(user.id));
  const owned = initial && typeof initial === 'object' ? initial : null;
  const [cart,setCart] = useState<CartLine[]>(owned?.cart || draft?.cart || []);
  const [pending,setPending] = useState<PendingSale | null>(owned);
  const [query,setQuery] = useState('');
  const [paymentType,setPaymentType] = useState<'PAID'|'CREDIT'>(owned?.body.paymentType || draft?.paymentType || 'PAID');
  const [customerId,setCustomerId] = useState(owned?.body.customerId || draft?.customerId || '');
  const [selectedCustomer,setSelectedCustomer] = useState<Customer | undefined>(owned?.customer);
  const [dueDate,setDueDate] = useState(owned?.body.dueDate || draft?.dueDate || '');
  const [state,setState] = useState<State>(owned ? 'recovery' : 'idle');
  const [message,setMessage] = useState('');
  const [requestId,setRequestId] = useState('');
  const [changes,setChanges] = useState<string[]>([]);
  const [accepted,setAccepted] = useState(false);
  const navigate = useNavigate();
  const customers = useCustomersQuery();
  const search = useProductsQuery({q:query,size:20},{skip:!query.trim()});
  const [createSale] = useCreateSaleMutation();
  useEffect(() => {if (!pending) saveCartDraft(user.id,{cart,paymentType,customerId,dueDate});},[cart,paymentType,customerId,dueDate,pending,user.id]);
  const customer = pending?.customer || customers.data?.find((item) => item.id === customerId) || (selectedCustomer?.id === customerId ? selectedCustomer : undefined);
  const simulation = import.meta.env.DEV && readSession()?.accessToken === 'stockwise-contract-mock-token';
  const busy = ['checking','sending','retrying'].includes(state);
  const frozen = busy || pending !== null;
  const invalidRecovery = typeof initial === 'string';
  let total:number | null = null;
  let credit:number;
  try {total = sumKobo(cart.map((line) => ({priceKobo:line.product.priceKobo,quantity:line.quantity}))); if (customer) checkedKobo(customer.balanceKobo); credit = customer ? Math.min(total, checkedKobo(customer.storeCreditKobo)) : 0;} catch {total=null; credit=0;}
  const quantity = cart.reduce((sum,line) => sum+line.quantity,0);
  const hasZero = cart.some((line) => line.quantity < 1);
  const invalidQuantity = cart.some((line) => !Number.isInteger(line.quantity) || line.quantity > 10000 || line.quantity < 1);
  const unavailableCredit = credit > 0 && !simulation;
  const canConfirm = !!cart.length && !invalidQuantity && total !== null && (paymentType === 'PAID' || !!customerId) && !frozen && !invalidRecovery && !unavailableCredit && !['session','forbidden'].includes(state);
  const add = (product:Product) => {
    if (frozen || !product.active || product.quantity <= 0) return;
    setCart((current) => {const found = current.find((line) => line.product.id === product.id); if (found) return current.map((line) => line === found ? {...line,quantity:Math.min(line.quantity+1,product.quantity,10000),issue:undefined} : line); if (current.length >= 50) {setMessage('A sale can contain at most 50 products.'); return current;} return [...current,{product,quantity:1}];});
    setQuery(''); setState('idle');
  };
  const editQuantity = (id:string,value:number) => {if (!frozen) setCart((current) => current.map((line) => line.product.id === id ? {...line,quantity:value,issue:undefined} : line));};
  const signIn = () => {clearSession(); void navigate('/sign-in?returnTo=%2Fapp%2Fsell');};
  async function checkCart() {
    if (!canConfirm) return;
    setState('checking'); setMessage(''); setChanges([]); setAccepted(false);
    try {
      const freshUser = (await httpClient.get<User>(authEndpoints.me)).data;
      if (freshUser.id !== user.id || freshUser.role === 'ADMIN') {setState('forbidden'); setMessage('Your role can’t record this sale.'); return;}
      const fresh = await Promise.all(cart.map(async (line) => ({...line,product:(await httpClient.get<Product>(productsEndpoints.detail(line.product.id))).data})));
      const differences:string[] = [];
      const updated = fresh.map((line,index) => {
        checkedKobo(line.product.priceKobo);
        if (line.product.priceKobo !== cart[index].product.priceKobo) differences.push(`${line.product.name}: Price changed ${formatMoney(cart[index].product.priceKobo)} → ${formatMoney(line.product.priceKobo)}`);
        if (line.product.quantity !== cart[index].product.quantity) differences.push(`${line.product.name}: Stock now ${line.product.quantity}`);
        const quantity = Math.min(line.quantity,line.product.active ? line.product.quantity : 0);
        return {...line,quantity,issue:quantity !== line.quantity ? `Only ${quantity} left of ${line.product.name}. Quantity corrected.` : undefined};
      });
      setCart(updated); setChanges(differences);
      if (updated.some((line) => line.quantity === 0)) {setState('conflict'); setMessage('An item is no longer available. Nothing was recorded. Remove it before confirming.'); return;}
      if (customerId) {const refreshed = await customers.refetch().unwrap(); const next = refreshed.find((item) => item.id === customerId); if (!next) {setCustomerId(''); setState('error'); setMessage('Choose a customer again.'); return;} if (next.storeCreditKobo !== customer?.storeCreditKobo) differences.push('The customer’s store credit changed. Review the updated total.');}
      setState('confirm');
    } catch (error) {if (normalizeHttpError(error).status === 401) setState('session'); else {setState('error'); setMessage('Could not check current prices and stock. Nothing was submitted. Try again.');}}
  }
  async function send(snapshot:PendingSale, automaticRetry = false) {
    setState(automaticRetry ? 'retrying' : 'sending'); setMessage('');
    try {
      if (snapshot.apiBase !== httpClient.defaults.baseURL) {setState('error'); setMessage('This unfinished sale belongs to a different service connection. Restore the original connection before retrying.'); return;}
      const liveSession = readSession();
      if (!liveSession || liveSession.user.id !== snapshot.userId) {setState('session'); return;}
      const currentUser = (await httpClient.get<User>(authEndpoints.me)).data;
      if (currentUser.id !== snapshot.userId || !['OWNER','ASSISTANT'].includes(currentUser.role)) {setState('forbidden'); setMessage('Your role can’t record this sale. The unconfirmed submission is preserved.'); return;}
      const sale = await createSale({key:snapshot.key,body:snapshot.body}).unwrap();
      if (!validSale(sale)) {setState('error'); setMessage('The receipt could not be verified. This sale remains unconfirmed here. Retry the same submission.'); return;}
      const simulatedCredit = snapshot.simulated && snapshot.customer ? Math.min(sale.totalKobo,snapshot.customer.storeCreditKobo) : 0;
      persistReceipt({sale,customerName:snapshot.customer?.displayName,creditApplied:simulatedCredit,simulated:snapshot.simulated},user.id);
      clearPending(); setPending(null); setCart([]); await navigate(`/app/receipts/${sale.id}`,{state:{sale}});
    } catch (caught) {
      // The Axios preflight may throw before RTK's normalized error; handle both.
      const error = caught && typeof caught === 'object' && 'status' in caught ? caught as HttpError : normalizeHttpError(caught);
      setRequestId(error.requestId || '');
      if (error.status === 401) {setState('session'); return;}
      if (error.status === 403) {setState('forbidden'); setMessage('Your role can’t record this sale. The unconfirmed submission is preserved.'); return;}
      if (error.status === 409) {
        clearPending(); setPending(null);
        try {
          const corrected = await Promise.all(snapshot.cart.map(async (line) => {const product = (await httpClient.get<Product>(productsEndpoints.detail(line.product.id))).data; const available = product.active ? product.quantity : 0; const quantity = Math.min(line.quantity,available); return {product,quantity,issue:quantity < line.quantity ? `Only ${available} left of ${product.name}. Quantity corrected.` : undefined};}));
          setCart(corrected); const issue = corrected.find((line) => line.issue)?.issue;
          setMessage(issue ? `${issue.replace(' Quantity corrected.','')} Nothing was recorded. Check the cart and confirm again.` : 'Stock changed. Nothing was recorded. Check the cart and confirm again.');
        } catch {setCart(snapshot.cart.map((line) => ({...line,quantity:0,issue:'Check availability before adding this product again.'}))); setMessage('Stock changed. Remove the affected items and search again.');}
        setState('conflict'); return;
      }
      if (error.status === 400 || error.status === 404) {clearPending(); setPending(null); setState('error'); setMessage(Object.values(error.fields || {}).join(' ') || 'Nothing was recorded. Check the selected products and customer before confirming again.'); return;}
      if (error.status === 422) {setState('error'); setMessage('This submission key was refused. The original sale may already exist. Keep this request ID and contact the shop owner; do not create a replacement sale.'); return;}
      if (!automaticRetry && ['NETWORK','TIMEOUT'].includes(String(error.status))) {await new Promise((resolve) => setTimeout(resolve,700)); await send(snapshot,true); return;}
      setState('error'); setMessage('This sale is not confirmed. Retry sends the same submission safely.');
    }
  }
  function confirm() {
    if (state !== 'confirm' || (changes.length > 0 && !accepted) || !canConfirm) return;
    const snapshot:PendingSale = {key:crypto.randomUUID(),userId:user.id,body:{paymentType,...(customerId ? {customerId} : {}),...(paymentType === 'CREDIT' && dueDate ? {dueDate} : {}),lines:cart.map((line) => ({productId:line.product.id,quantity:line.quantity}))},cart:structuredClone(cart),customer,createdAt:new Date().toISOString(),simulated:!!simulation,apiBase:httpClient.defaults.baseURL};
    try {persistPending(snapshot); setPending(snapshot); void send(snapshot);} catch {setState('error'); setMessage('Recovery storage is unavailable. Nothing was sent. Enable browser storage before recording a sale.');}
  }
  if (user.role === 'ADMIN') return <><h1>New sale</h1><div className="sale-readonly"><StatusPanel error title="Read-only access"><p>Admins can view products and sales but can’t record a sale.</p></StatusPanel></div></>;
  return <div className="sale-page">
    <h1>New sale</h1>
    <div className="sale-grid"><section className="sale-items" aria-label="Sale items">
      {invalidRecovery && <StatusPanel error title="An unfinished sale needs attention"><p>{initial === 'other-user' ? 'Sign in with the original account to recover its sale.' : 'The saved submission could not be read. Do not submit a replacement until its outcome is checked.'}</p></StatusPanel>}
      {state === 'session' && <StatusPanel error title="Your session ended. This sale is NOT confirmed."><p>Your cart is still here. Sign in again, then retry this sale with the same submission.</p><Button size="lg" onClick={signIn}>Sign in again</Button></StatusPanel>}
      {state === 'recovery' && <StatusPanel title="You have a sale that may not have been recorded"><p>Check and retry sends the original submission safely. Discard doesn’t undo anything already recorded.</p><Button size="lg" onClick={() => pending && void send(pending)}>Check and retry</Button><Button variant="secondary" size="lg" onClick={() => setMessage('Resolve this unconfirmed sale before starting another. Discard cannot undo a recorded sale.')}>Discard</Button></StatusPanel>}
      {['sending','retrying'].includes(state) && <StatusPanel title={state === 'retrying' ? 'Not confirmed, retrying…' : 'Recording, not confirmed yet…'}><p>Don’t tap again. It’s safe to wait.</p></StatusPanel>}
      {message && state !== 'session' && <StatusPanel error={['error','conflict','forbidden'].includes(state)} title={state === 'conflict' ? 'Someone else just sold this.' : state === 'forbidden' ? 'Read-only access' : pending ? 'This sale is not confirmed' : 'Check this sale'}><p>{message}</p>{requestId && state === 'error' && <p className="micro">Request ID {requestId}</p>}{pending && state === 'error' && <Button variant="secondary" size="lg" onClick={() => void send(pending)}>Retry</Button>}</StatusPanel>}
      <div className="sale-search"><span aria-hidden="true">⌕</span><input className="shop-input" aria-label="Search products to add" placeholder="Search products to add" value={query} disabled={frozen || invalidRecovery} onChange={(event) => setQuery(event.target.value)}/></div>
      {query && <div className="sale-search-results">{search.isFetching ? <StatusPanel title="Searching products…"/> : search.isError ? <StatusPanel error title="Could not search products"><Button variant="secondary" size="lg" onClick={() => void search.refetch()}>Retry search</Button></StatusPanel> : !search.data?.items.filter((p) => p.active).length ? <StatusPanel title="No matching products"/> : search.data.items.filter((p) => p.active).map((product) => <button className="search-result" disabled={frozen || product.quantity === 0} key={product.id} onClick={() => add(product)}><span><strong>{product.name}</strong><small className="micro">{product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}</small></span><span>{Number.isSafeInteger(product.priceKobo) && product.priceKobo >= 0 ? formatMoney(product.priceKobo) : 'Amount unavailable'}</span></button>)}</div>}
      {!cart.length && <div className="empty-cart">Add a product to start a sale</div>}
      {cart.map((line) => <article className={`cart-line${line.issue || line.quantity === 0 || line.quantity > 10000 ? ' cart-line-error' : ''}`} key={line.product.id}>
        <div className="cart-line-heading"><strong>{line.product.name}</strong><span>{total === null ? '—' : formatMoney(sumKobo([{priceKobo:line.product.priceKobo,quantity:line.quantity}]))}</span></div><p className="micro">{Number.isSafeInteger(line.product.priceKobo) && line.product.priceKobo >= 0 ? formatMoney(line.product.priceKobo) : '—'} each</p>
        <div className="quantity-controls"><button className="icon-button" aria-label={`Decrease ${line.product.name}`} disabled={frozen || line.quantity <= 0} onClick={() => editQuantity(line.product.id,Math.max(0,line.quantity-1))}>−</button><input aria-label={`Quantity for ${line.product.name}`} inputMode="numeric" value={line.quantity} disabled={frozen} onChange={(event) => {if (/^\d{0,7}$/.test(event.target.value)) editQuantity(line.product.id,Number(event.target.value));}}/><button className="icon-button" aria-label={`Increase ${line.product.name}`} disabled={frozen || line.quantity >= Math.min(line.product.quantity,10000)} onClick={() => editQuantity(line.product.id,line.quantity+1)}>＋</button><button className="remove-line" aria-label={`Remove ${line.product.name}`} disabled={frozen} onClick={() => {setCart((current) => current.filter((item) => item.product.id !== line.product.id));}}>×</button></div>
        {(line.issue || line.quantity > 10000) && <p className="line-error"><span className="error-symbol" aria-hidden="true">!</span>{line.quantity > 10000 ? 'Quantity cannot exceed 10,000.' : line.issue}</p>}
      </article>)}
    </section><aside className="sale-checkout" aria-label="Payment and total"><div className="payment-card"><div className="payment-toggle" role="group" aria-label="Payment type"><button aria-pressed={paymentType === 'PAID'} disabled={frozen} onClick={() => setPaymentType('PAID')}>Paid</button><button aria-pressed={paymentType === 'CREDIT'} disabled={frozen} onClick={() => setPaymentType('CREDIT')}>On credit</button></div>
      {(paymentType === 'CREDIT' || customerId) && <><CustomerPicker user={user} customer={customer} required={paymentType === 'CREDIT'} disabled={frozen || invalidRecovery} onSelect={(person) => {setCustomerId(person?.id || '');setSelectedCustomer(person);}}/>
      {customers.isError && <p role="alert">Could not load customers. <button onClick={() => void customers.refetch()}>Retry</button></p>}
      {customer && customer.storeCreditKobo > 0 && <span className="credit-badge micro">Store credit {displayMoney(customer.storeCreditKobo)}</span>}
      {paymentType === 'CREDIT' && <input className="shop-input due-date" aria-label="Due date (optional)" type={dueDate ? 'date' : 'text'} placeholder="Due date (optional)" value={dueDate} disabled={frozen} onFocus={(event) => {event.currentTarget.type = 'date';}} onBlur={(event) => {if (!event.target.value) event.currentTarget.type = 'text';}} onChange={(event) => setDueDate(event.target.value)}/>}</>}
    </div><div className="sale-total" aria-live="polite">
      {credit > 0 && total !== null && <div className="credit-breakdown"><p><span>Subtotal</span><span>{formatMoney(total)}</span></p><p><span>Store credit applied</span><span>−{formatMoney(credit)}</span></p></div>}
      <div className="sale-total-heading"><span className="micro">{quantity} items</span><strong>{total === null ? '—' : formatMoney(total-credit)}</strong></div>
      <Button size="lg" disabled={!canConfirm} loading={busy} loadingLabel={state === 'checking' ? 'Checking…' : 'Recording…'} onClick={() => void checkCart()}>Confirm sale</Button>
      {hasZero ? <p className="micro">Remove the out-of-stock item to continue.</p> : invalidQuantity ? <p className="micro">Use whole quantities from 1 to 10,000.</p> : !cart.length ? <p className="micro">Add at least one item to continue.</p> : paymentType === 'CREDIT' && !customerId ? <p className="micro">Choose a customer to continue on credit.</p> : total === null ? <p className="micro">Fix the amount to continue.</p> : unavailableCredit ? <p className="micro">Store-credit recording is awaiting service support. No sale has been sent.</p> : state === 'session' ? <p className="micro">Sign in again to continue.</p> : null}
      {credit > 0 && simulation && <small className="settlement-note">Simulated demonstration · credit allocation</small>}
    </div></aside></div>
    <Dialog open={state === 'confirm'} onOpenChange={(open) => {if (!open) setState('idle');}} title="Confirm this sale" description="Review the items, total and payment type before recording." descriptionClassName="sr-only" closeClassName="hidden" overlayClassName="shop-confirm-backdrop" className="sale-confirm shop-confirm" footer={<><Button size="lg" disabled={changes.length > 0 && !accepted} onClick={confirm}>Confirm</Button><Button size="lg" variant="secondary" onClick={() => setState('idle')}>Back to cart</Button></>}>
      <div className="receipt-lines">{cart.map((line) => <div key={line.product.id}><span>{line.product.name} <small className="micro">× {line.quantity}</small></span><span>{total === null ? '—' : formatMoney(sumKobo([{priceKobo:line.product.priceKobo,quantity:line.quantity}]))}</span></div>)}</div><div className="receipt-total"><strong>Total</strong><strong>{total === null ? '—' : formatMoney(total-credit)}</strong></div>
      {changes.length > 0 && <div className="changes-notice"><p className="micro">▲ Changed since you added these</p>{changes.map((change) => <p key={change}>{change}</p>)}<label><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/> I accept these changes</label></div>}
      <p className="micro">{paymentType === 'CREDIT' ? 'On credit' : 'Paid'}{customer ? ` · ${customer.displayName}` : ''}</p>
    </Dialog>
    <p className="sale-demo-note">Demonstration data · {simulation ? 'Simulated shop' : 'Prices confirmed on receipt'}. <Link to="/app/products">View products</Link></p>
  </div>;
}
