import { useState } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import { StatusPanel } from '../../components/ui/status-panel';
import { useIssueStoreCreditMutation } from '../../service/api/customers.api';
import { parseNaira } from '../../lib/money';
import { debtDisplay, storeCreditDisplay } from './customer-balance';
import type { Customer } from '../../models/responses/customers.response';
import type { HttpError } from '../../service/http-client';
import { useToast } from '../../components/ui/toast';

interface Props {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const REASONS = [
  { value: 'RETURN_REFUND', label: 'Product return / refund' },
  { value: 'ADVANCE_DEPOSIT', label: 'Advance cash deposit' },
  { value: 'CHANGE_SHORTAGE', label: 'Change shortage (unpaid change)' },
  { value: 'LOYALTY_REWARD', label: 'Loyalty / promotion reward' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manual balance adjustment' },
] as const;

export function IssueStoreCreditDialog({ customer, open, onOpenChange, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<string>('RETURN_REFUND');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [issueCredit, { isLoading }] = useIssueStoreCreditMutation();
  const { toast } = useToast();

  const reset = () => {
    setAmount('');
    setReason('RETURN_REFUND');
    setNote('');
    setError('');
    setFieldError('');
  };

  const close = () => {
    if (isLoading) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    setError('');
    setFieldError('');

    let amountKobo: number;
    try {
      amountKobo = parseNaira(amount);
      if (amountKobo <= 0) {
        setFieldError('Enter an amount greater than zero.');
        return;
      }
      if (amountKobo > 9007199254740991) {
        setFieldError('Amount exceeds maximum safe limit.');
        return;
      }
    } catch {
      setFieldError('Enter a valid Naira amount (e.g. 1500 or 1500.50).');
      return;
    }

    try {
      await issueCredit({
        customerId: customer.id,
        body: {
          amountKobo,
          reason,
          note: note.trim() || undefined,
        },
      }).unwrap();

      toast({ variant: 'success', title: 'Store credit issued successfully' });
      close();
      onSuccess?.();
    } catch (caught) {
      const err = caught as HttpError;
      if (err.status === 403) {
        setError('Only an Owner or Admin can issue store credit.');
      } else if (err.status === 400 && err.fields?.amountKobo) {
        setFieldError(err.fields.amountKobo);
      } else {
        setError('Could not issue store credit. Please check your connection and try again.');
      }
    }
  };

  return (
    <Dialog
      open={open && !!customer}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title="Issue store credit"
      description={`Add store credit for ${customer?.displayName ?? 'customer'}`}
      placement="right"
      dismissible={!isLoading}
      className="product-sheet customer-credit-sheet"
      overlayClassName="shop-backdrop"
      headerClassName="sheet-header"
      bodyClassName="product-dialog-body"
      descriptionClassName="sr-only"
      closeClassName="icon-button"
      closeLabel="Close store credit dialog"
      closeContent={
        <>
          <span className="desktop-close">×</span>
          <span className="mobile-back">←</span>
        </>
      }
    >
      {customer && (
        <form className="product-form" onSubmit={handleSubmit} noValidate>
          <div className="sheet-body">
            <div className="customer-credit-summary" style={{ padding: '16px', background: 'var(--color-surface-subtle, #18191b)', borderRadius: 'var(--radius-md, 10px)', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '18px' }}>{customer.displayName}</p>
              {customer.contactPlaceholder && (
                <p className="customer-micro" style={{ margin: '4px 0 12px', color: 'var(--color-text-muted)' }}>
                  {customer.contactPlaceholder}
                </p>
              )}
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <div>
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '12px' }}>Current Debt</small>
                  <strong>{debtDisplay(customer)}</strong>
                </div>
                <div>
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '12px' }}>Current Store Credit</small>
                  <strong style={{ color: 'var(--color-primary, #a3e635)' }}>{storeCreditDisplay(customer)}</strong>
                </div>
              </div>
            </div>

            {error && (
              <StatusPanel error title="Could not issue credit">
                <p>{error}</p>
              </StatusPanel>
            )}

            <FormField
              label="Credit amount to add"
              required
              requiredIndicator={false}
              hint="Naira, up to 2 decimals"
              error={fieldError}
              className="product-field"
            >
              {(field) => (
                <div className="price-input">
                  <span aria-hidden="true">₦</span>
                  <Input
                    {...field}
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                    className="shop-input"
                  />
                </div>
              )}
            </FormField>

            <FormField
              label="Reason for credit"
              required
              requiredIndicator={false}
              className="product-field"
            >
              {(field) => (
                <select
                  {...field}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isLoading}
                  className="shop-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--color-border)' }}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField
              label="Notes (optional)"
              hint="e.g. Returned 1x Dettol 500ml unopened with receipt"
              className="product-field"
            >
              {(field) => (
                <Input
                  {...field}
                  placeholder="Optional reference or details"
                  value={note}
                  maxLength={200}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isLoading}
                  className="shop-input"
                />
              )}
            </FormField>
          </div>

          <footer className="sheet-footer">
            <Button size="lg" type="submit" loading={isLoading} loadingLabel="Issuing…">
              Issue credit
            </Button>
            <Button size="lg" variant="secondary" disabled={isLoading} onClick={close}>
              Cancel
            </Button>
          </footer>
        </form>
      )}
    </Dialog>
  );
}
