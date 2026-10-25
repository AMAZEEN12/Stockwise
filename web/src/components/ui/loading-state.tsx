import type { ReactNode } from 'react';
import { Skeleton } from './skeleton';

/** Stockwise composition of the shared Skeleton, including the region's status. */
export function LoadingState({label, children}: {label: string; children?: ReactNode}) {
  return <section className="status-panel shared-loading" aria-busy="true">
    <p role="status">{label}</p>
    <Skeleton lines={2}/>
    {children}
  </section>;
}
