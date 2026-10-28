import {useRef,useState} from 'react';
import {useOutletContext} from 'react-router';
import {Button} from '../../components/ui/button';
import {Dialog} from '../../components/ui/dialog';
import {FilterBar} from '../../components/ui/filter-bar';
import {EmptyState} from '../../components/ui/empty-state';
import {Card,CardBody} from '../../components/ui/card';
import {useToast} from '../../components/ui/toast';
import {useCustomersQuery} from '../../service/api/customers.api';
import type {User} from '../../models/responses/auth.response';
import type {HttpError} from '../../service/http-client';
import {CustomerForm} from './CustomerForm';
import type {CustomerFormHandle} from './CustomerForm';
import {CustomerIcon,CustomerLoading,CustomerLoadError} from './CustomerStates';
import {debtDisplay,storeCreditDisplay} from './customer-balance';
import '../../styles/customers.css';

export function CustomersPage() {
  const user=useOutletContext<User>();
  const customers=useCustomersQuery(undefined,{refetchOnMountOrArgChange:true});
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const {toast}=useToast();
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
    <FilterBar className="customer-filter-bar" searchLabel="Search customers by name" searchPlaceholder="Search by name"
      query={query} onQueryChange={setQuery} activeCount={0} onClearAll={()=>setQuery('')}
      searchIcon={<CustomerIcon kind="search"/>} searchInputClassName="customer-search"
      searchInputProps={{type:"text",className:"shop-input",maxLength:100}}
      resultMessage={customers.data && !customers.isFetching && !customers.isError ? `${list.length} customers found` : undefined}/>
    {customers.isLoading ? <CustomerLoading count={5}/> : <>
      {customers.isError && <CustomerLoadError error={customers.error as HttpError} stale={!!customers.data} retrying={customers.isFetching} onRetry={()=>void customers.refetch()}/>}
      {!customers.isError && !list.length ? <EmptyState layout="panel" headingLevel="h3" className="customer-state customers-directory-state" titleClassName="customer-state-title"
        icon={<CustomerIcon kind={query.trim() ? 'info' : 'empty'}/>}
        title={query.trim() ? 'No customers match' : 'No customers yet'}
        description={query.trim() ? 'Try a different name.' : canCreate ? 'Add your first customer to start selling on credit.' : 'Customers added by the shop will appear here.'}
        action={query.trim() ? {label:'Clear search',onClick:()=>setQuery('')} : canCreate ? {label:'Add your first customer',onClick:()=>setOpen(true)} : undefined}
        actionProps={{size:"lg",variant:query.trim() ? "secondary" : "primary"}}/> : customers.data && <>
        <table className="customers-table"><caption className="sr-only">Customer balances owed and store credit{customers.isError ? ' (previously loaded; may be out of date)' : ''}</caption><thead><tr><th scope="col">Name</th><th scope="col">Balance owed</th><th scope="col">Store credit</th></tr></thead><tbody>{list.map((person)=><tr key={person.id}><th scope="row">{person.displayName}{customers.data?.some((other)=>other.id!==person.id && other.displayName===person.displayName) && <small className="customer-micro">{person.contactPlaceholder || `ID ${person.id.slice(-8)}`}</small>}</th><td className={!person.hasDebtActivity?'customer-unused-balance':undefined}>{debtDisplay(person)}</td><td className={!person.hasStoreCreditActivity?'customer-unused-balance':undefined}>{storeCreditDisplay(person)}</td></tr>)}</tbody></table>
        <ul className="customers-cards" aria-label="Customer balances">{list.map((person)=><li key={person.id}><Card className="customer-balance-card" bodyClassName="customer-balance-card-body"><CardBody><strong>{person.displayName}</strong>{customers.data?.some((other)=>other.id!==person.id && other.displayName===person.displayName) && <small className="customer-micro">{person.contactPlaceholder || `ID ${person.id.slice(-8)}`}</small>}<dl className="customer-balance-summary"><div><dt>Balance owed</dt><dd className={!person.hasDebtActivity?'customer-unused-balance':undefined}>{debtDisplay(person)}</dd></div><div><dt>Store credit</dt><dd className={!person.hasStoreCreditActivity?'customer-unused-balance':undefined}>{storeCreditDisplay(person)}</dd></div></dl></CardBody></Card></li>)}</ul>
      </>}
    </>}
    <Dialog open={open && canCreate} dismissible={!busy} onOpenChange={(value)=>{if(!value)close();}} title="Add customer" description="Add a display name and an optional fictional contact for this demonstration shop." descriptionClassName="sr-only" titleClassName="customer-dialog-title" className="customers-create-dialog" overlayClassName="customer-backdrop" closeClassName={`customer-dialog-close${busy?' customer-close-busy':''}`} onCloseAutoFocus={(event)=>{event.preventDefault();trigger.current?.focus();}}>
      <CustomerForm ref={form} user={user} onBusy={setBusy} onCancel={()=>setOpen(false)} onCheck={()=>{setOpen(false);setQuery('');void customers.refetch();}} onSaved={(person)=>{toast({variant:'success',title:`Customer added. ${person.displayName} is in the list.`});setQuery('');setOpen(false);}}/>
    </Dialog>

  </section>;
}
