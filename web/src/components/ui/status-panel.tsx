import type { ReactNode } from 'react';
export function StatusPanel({title, children, error = false}: {title: string; children?: ReactNode; error?: boolean}) {
  return <section className={`status-panel${error ? ' status-error' : ''}`} role={error ? 'alert' : 'status'}>
    <strong>{error && <span aria-hidden="true" className="error-symbol">!</span>}{title}</strong>{children}
  </section>;
}
