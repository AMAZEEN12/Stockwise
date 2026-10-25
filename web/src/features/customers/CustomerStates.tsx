import {Button} from '../../components/ui/button';
import type {HttpError} from '../../service/http-client';

export function CustomerIcon({kind='info'}:{kind?:'info'|'error'|'empty'|'check'|'search'}) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`customer-icon customer-icon-${kind}`}>
    {kind === 'search' ? <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></> : kind === 'check' ? <path d="m5 12 4 5 10-13"/> : kind === 'empty' ? <path d="M3 6h18v13H3z"/> : <><circle cx="12" cy="12" r="10"/><path d={kind === 'error' ? 'M12 6v8m0 3v1' : 'M12 10v8m0-12v1'}/></>}
  </svg>;
}
export function CustomerLoading({count=4}:{count?:number}) {
  return <div aria-busy="true" aria-label="Loading customers"><div aria-hidden="true" className="customer-skeletons">{Array.from({length:count},(_,index) => <div className="customer-skeleton" key={index}><span/><span/></div>)}</div><p role="status" className="customer-micro">Loading customers…</p></div>;
}
export function CustomerLoadError({error,onRetry,stale=false}:{error?:HttpError;onRetry:()=>void;stale?:boolean}) {
  return <div className="customer-state customer-load-error" role="alert"><h3><CustomerIcon kind="error"/>{stale ? 'Couldn’t refresh customers' : "Couldn't load customers"}</h3><p>{error?.status === 401 ? 'Your session ended. Sign in again to load customers.' : stale ? 'Previously loaded balances may be out of date. Check your connection and try again.' : 'Check your connection and try again.'}</p>{error?.requestId && <p className="customer-micro">Request ID {error.requestId}</p>}<Button size="lg" variant="secondary" onClick={onRetry}>Retry</Button></div>;
}
