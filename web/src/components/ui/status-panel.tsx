import type { ReactNode } from 'react';
import { ErrorState } from './error-state';
export function StatusPanel({title, children, error = false}: {title: string; children?: ReactNode; error?: boolean}) {
  // Recovery notices may need multiple actions; errors compose the shared primitive.
  if (error) return <ErrorState layout="panel" className="status-panel status-error" title={title} description="" details={children}
    icon={<svg aria-hidden="true" className="error-symbol" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M8 3v6m0 2v2"/></svg>}/>;
  return <section className="status-panel" role="status"><strong>{title}</strong>{children}</section>;
}
