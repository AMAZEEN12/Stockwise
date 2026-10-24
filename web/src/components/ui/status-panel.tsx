import type { ReactNode } from 'react';
export function StatusPanel({title, children, error = false}: {title: string; children?: ReactNode; error?: boolean}) {
  return <section className={`status-panel${error ? ' status-error' : ''}`} role={error ? 'alert' : 'status'}>
    <strong>{error && <svg aria-hidden="true" className="error-symbol" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M8 3v6m0 2v2"/></svg>}{title}</strong>{children}
  </section>;
}
