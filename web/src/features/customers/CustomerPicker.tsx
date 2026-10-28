import {useRef,useState} from 'react';
import {Dialog} from '../../components/ui/dialog';
import {Button} from '../../components/ui/button';
import {FilterBar} from '../../components/ui/filter-bar';
import {EmptyState} from '../../components/ui/empty-state';
import {useCustomersQuery} from '../../service/api/customers.api';
import type {Customer} from '../../models/responses/customers.response';
import type {User} from '../../models/responses/auth.response';
import type {HttpError} from '../../service/http-client';
import {CustomerForm} from './CustomerForm';
import type {CustomerFormHandle} from './CustomerForm';
import {CustomerIcon,CustomerLoading,CustomerLoadError} from './CustomerStates';
import {customerBalanceSummary,debtDisplay,storeCreditDisplay} from './customer-balance';
import '../../styles/customers.css';

interface Props {user:User;customer?:Customer;disabled:boolean;required:boolean;onSelect:(customer:Customer|undefined)=>void}
export function CustomerPicker({user,customer,disabled,required,onSelect}:Props) {
  const [open,setOpen] = useState(false);
  const [mode,setMode] = useState<'list'|'create'|'selected'>('list');
  const [query,setQuery] = useState('');
  const [busy,setBusy] = useState(false);
  const form = useRef<CustomerFormHandle>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const customers = useCustomersQuery(undefined,{refetchOnFocus:true,refetchOnMountOrArgChange:true});
  const list = customers.data?.filter((item) => item.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) || [];
  const close = () => {if (busy) return; if (mode === 'create') form.current?.requestClose(); else setOpen(false);};
  const choose = (person:Customer) => {onSelect(person);setMode('selected');};
  const canCreate = ['OWNER','ASSISTANT'].includes(user.role);
  return <>
    <Button variant="ghost" ref={trigger} type="button" contentClassName="customer-picker-trigger-content" className="shop-input customer-picker-trigger" aria-label={customer ? `${customer.displayName}. ${customerBalanceSummary(customer)}` : required ? 'Choose customer (required)' : 'Customer (optional)'} aria-haspopup="dialog" aria-expanded={open} aria-invalid={required && !customer ? true : undefined} disabled={disabled} onClick={() => {setMode(customer ? 'selected' : 'list');setQuery('');setOpen(true);}}><span>{customer ? `${customer.displayName} Â· ${customerBalanceSummary(customer)}` : required ? 'Choose customer (required)' : 'Customer (optional)'}</span><svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="m3 4 3 4 3-4z"/></svg></Button>
    {customer && !disabled && <Button variant="ghost" className="customer-remove" onClick={() => onSelect(undefined)}>Remove customer</Button>}
    <Dialog placement="right" open={open && !disabled} dismissible={!busy} onOpenChange={(value) => {if (!value) close();}} title={mode === 'selected' ? 'Customer' : 'Choose customer'} description="Choose an existing customer or add a fictional customer for this sale." descriptionClassName="sr-only" className="customer-picker-dialog" bodyClassName="customer-picker-dialog-body" titleClassName="customer-dialog-title" closeClassName={`customer-dialog-close${busy ? ' customer-close-busy' : ''}`} overlayClassName="customer-backdrop" onCloseAutoFocus={(event) => {event.preventDefault();trigger.current?.focus();}}>
      <div className="customer-picker-body">
        {mode === 'selected' && customer ? <div className="customer-selected"><p>Customer on this sale</p><div className="customer-selected-row"><span><strong>{customer.displayName}</strong><small>Balance owed {debtDisplay(customer)}</small><small>Store credit {storeCreditDisplay(customer)}</small></span><Button variant="ghost" onClick={() => setMode('list')}>Change</Button></div><p className="customer-micro customer-selection-note"><CustomerIcon kind="check"/>Customer selected. Confirm stays disabled until one is chosen.</p><Button size="lg" onClick={() => setOpen(false)}>Back to sale</Button></div> : <>
          <FilterBar className="customer-filter-bar" searchLabel="Search customers by name" searchPlaceholder="Search by name"
            query={query} onQueryChange={setQuery} activeCount={0} onClearAll={()=>setQuery('')}
            searchIcon={<CustomerIcon kind="search"/>} searchInputClassName="customer-search"
            searchInputProps={{type:"text",className:"shop-input",maxLength:100,disabled:busy}}
            resultMessage={!customers.isFetching && !customers.isError ? `${list.length} customers found` : undefined}/>
          {mode === 'create' ? <div className="customer-inline-form"><CustomerForm ref={form} user={user} select onBusy={setBusy} onCancel={() => setMode('list')} onCheck={() => {setMode('list');setQuery('');void customers.refetch();}} onSaved={(person) => {setQuery('');choose(person);void customers.refetch();}}/></div> : !customers.isLoading && !customers.isError && canCreate && <Button variant="ghost" className="customer-add-inline" onClick={() => setMode('create')}>ï¼‹ Add new customer</Button>}
          {customers.isLoading || (customers.isFetching && !customers.data) ? <CustomerLoading/> : customers.isError ? <CustomerLoadError error={customers.error as HttpError} stale={!!customers.data} retrying={customers.isFetching} onRetry={() => void customers.refetch()}/> : list.length ? <div className="customer-picker-list" aria-label="Customers">{list.map((person) => <Button variant="ghost" contentClassName="customer-option-content" className="customer-option" key={person.id} disabled={busy} onClick={() => choose(person)}><span><strong>{person.displayName}</strong><span className="customer-option-balances"><small>Balance owed {debtDisplay(person)}</small><small>Store credit {storeCreditDisplay(person)}</small></span>{customers.data?.some((other) => other.id !== person.id && other.displayName === person.displayName) && <small className="customer-micro">{person.contactPlaceholder || `ID ${person.id.slice(-8)}`}</small>}</span></Button>)}</div> : <EmptyState layout="panel" headingLevel="h3" className="customer-state" titleClassName="customer-state-title" title={query.trim() ? 'No customers match' : 'No customers yet'}
              description={query.trim() ? 'Try a different name.' : 'Add one to sell on credit.'}
              action={query.trim() ? {label:'Clear search',onClick:()=>setQuery('')} : undefined} actionProps={{variant:'secondary',size:'lg'}}/>}
        </>}
      </div>
    </Dialog>
  </>;
}

