import {useRef,useState} from 'react';
import {useOutletContext} from 'react-router';
import {Button} from '../../components/ui/button';
import {Dialog} from '../../components/ui/dialog';
import {useCustomersQuery} from '../../service/api/customers.api';
import type {User} from '../../models/responses/auth.response';
import type {Customer} from '../../models/responses/customers.response';
import type {HttpError} from '../../service/http-client';
import {formatMoney} from '../../lib/money';
import {CustomerForm} from './CustomerForm';
import type {CustomerFormHandle} from './CustomerForm';
import {CustomerIcon,CustomerLoading,CustomerLoadError} from './CustomerStates';
import '../../styles/customers.css';

export function CustomersPage() {
  const user=useOutletContext<User>();
  const customers=useCustomersQuery(undefined,{refetchOnMountOrArgChange:true});
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [added,setAdded]=useState<Customer | null>(null);
  const form=useRef<CustomerFormHandle>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const canCreate=['OWNER','ASSISTANT'].includes(user.role);
  const list=customers.data?.filter((person)=>person.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) || [];
  const retrievedAt=customers.fulfilledTimeStamp;
  const asOf=retrievedAt ? new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Africa/Lagos'}).format(retrievedAt) : null;
  const close=()=>{if(!busy)form.current?.requestClose();};
  return <section className="customers-page" aria-label="Customer directory">
    <header className="page-heading"><div><h1>Customers</h1><p className="customer-micro" title="Time of the last successful retrieval in Africa/Lagos; balances may change afterwards.">{asOf ? `as of ${asOf} WAT` : 'Waiting for customer data'}{customers.isFetching && customers.data ? ' · refreshing…' : ''}</p></div>{canCreate && <Button ref={trigger} className="add-customer" size="lg" onClick={()=>setOpen(true)}>+ Add customer</Button>}</header>
    {!canCreate && <p className="customer-readonly customer-micro"><CustomerIcon/>Read-only access. Admins cannot add customers.</p>}
    <div className="customer-search"><CustomerIcon kind="search"/><input className="shop-input" aria-label="Search customers by name" placeholder="Search by name" maxLength={100} value={query} onChange={(event)=>setQuery(event.target.value)}/></div>
    {customers.isLoading ? <CustomerLoading count={5}/> : <>
      {customers.isError && <CustomerLoadError error={customers.error as HttpError} stale={!!customers.data} onRetry={()=>void customers.refetch()}/>}
      {!customers.isError && !list.length ? <div className="customer-state customers-directory-state"><h3><CustomerIcon kind={query.trim() ? 'info' : 'empty'}/>{query.trim() ? 'No customers match' : 'No customers yet'}</h3><p>{query.trim() ? 'Try a different name.' : canCreate ? 'Add your first customer to start selling on credit.' : 'Customers added by the shop will appear here.'}</p>{query.trim() ? <Button size="lg" variant="secondary" onClick={()=>setQuery('')}>Clear search</Button> : canCreate && <Button size="lg" onClick={()=>setOpen(true)}>Add your first customer</Button>}</div> : customers.data && <>
        <table className="customers-table"><caption className="sr-only">Customer balances owed and store credit{customers.isError ? ' (previously loaded; may be out of date)' : ''}</caption><thead><tr><th scope="col">Name</th><th scope="col">Balance owed</th><th scope="col">Store credit</th></tr></thead><tbody>{list.map((person)=><tr key={person.id}><th scope="row">{person.displayName}{customers.data?.some((other)=>other.id!==person.id && other.displayName===person.displayName) && <small className="customer-micro">{person.contactPlaceholder || `ID ${person.id.slice(-8)}`}</small>}</th><td className={!person.balanceKobo?'customer-settled':undefined}>{person.balanceKobo ? formatMoney(person.balanceKobo) : 'Settled'}</td><td>{person.storeCreditKobo ? formatMoney(person.storeCreditKobo) : <span aria-label="No store credit">—</span>}</td></tr>)}</tbody></table>
        <ul className="customers-cards" aria-label="Customer balances">{list.map((person)=><li key={person.id}><div><strong>{person.displayName}</strong><span className={!person.balanceKobo?'customer-settled':undefined}>{person.balanceKobo ? formatMoney(person.balanceKobo) : 'Settled'}</span></div>{customers.data?.some((other)=>other.id!==person.id && other.displayName===person.displayName) && <small className="customer-micro">{person.contactPlaceholder || `ID ${person.id.slice(-8)}`}</small>}{person.storeCreditKobo>0 && <span className="customer-credit customer-micro">Store credit {formatMoney(person.storeCreditKobo)}</span>}</li>)}</ul>
      </>}
    </>}
    <Dialog open={open && canCreate} onOpenChange={(value)=>{if(!value)close();}} title="Add customer" description="Add a display name and an optional fictional contact for this demonstration shop." descriptionClassName="sr-only" titleClassName="customer-dialog-title" className="customers-create-dialog" overlayClassName="customer-backdrop" closeClassName={`customer-dialog-close${busy?' customer-close-busy':''}`} onCloseAutoFocus={(event)=>{event.preventDefault();trigger.current?.focus();}}>
      <CustomerForm ref={form} user={user} onBusy={setBusy} onCancel={()=>setOpen(false)} onCheck={()=>{setOpen(false);setQuery('');void customers.refetch();}} onSaved={(person)=>{setAdded(person);setQuery('');setOpen(false);}}/>
    </Dialog>
    {added && <div className="customer-success-toast" role="status"><CustomerIcon kind="check"/><p>Customer added. {added.displayName} is in the list.</p><button className="customer-toast-close" aria-label="Dismiss notification" onClick={()=>setAdded(null)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5"><path d="m3 3 10 10M13 3 3 13"/></svg></button></div>}
  </section>;
}
