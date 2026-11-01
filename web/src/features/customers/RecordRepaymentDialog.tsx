import { useState } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import { StatusPanel } from '../../components/ui/status-panel';
import { useRecordRepaymentMutation } from '../../service/api/customers.api';
import { formatMoney, parseNaira } from '../../lib/money';
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

export function RecordRepaymentDialog({ customer, open, onOpenChange, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [recordRepayment, { isLoading }] = useRecordRepaymentMutation();
  const { toast } = useToast();

  const reset = () => {
    setAmount('');
    setNote('');
    setError('');
    setFieldError('');
  };

  const close = () => {
    if (isLoading) return;
    reset();
    onOpenChange(false);
  };

  const handleRepayFull = () => {
    if (!customer || customer.balanceKobo <= 0) return;
    setAmount((customer.balanceKobo / 100).toFixed(2));
    setFieldError('');
    setError('');
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
      if (amountKobo > customer.balanceKobo) {
        setFieldError(`Repayment cannot exceed current debt of ${formatMoney(customer.balanceKobo)}.`);
        return;
      }
    } catch {
      setFieldError('Enter a valid Naira amount (e.g. 1500 or 1500.50).');
      return;
    }

    try {
      await recordRepayment({
        customerId: customer.id,
        amountKobo,
        note: note.trim() || undefined,
      }).unwrap();

      toast({
        variant: 'success',
        title: `Repayment of ${formatMoney(amountKobo)} recorded successfully`,
      });
      close();
      onSuccess?.();
    } catch (caught) {
      const err = caught as HttpError;
      if (err.status === 409) {
        setError("This repayment exceeds the customer's current balance. The balance may have changed.");
      } else if (err.status === 403) {
        setError('Admins cannot record debt repayments.');
      } else if (err.status === 400 && err.fields?.amountKobo) {
        setFieldError(err.fields.amountKobo);
      } else {
        setError('Could not record repayment. Please check your connection and try again.');
      }
    }
  };

  return (
    <Dialog
      open={open && !!customer}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title="Record debt repayment"
      description={`Record debt repayment for ${customer?.displayName ?? 'customer'}`}
      placement="right"
      dismissible={!isLoading}
      className="product-sheet customer-repayment-sheet"
      overlayClassName="shop-backdrop"
      headerClassName="sheet-header"
      bodyClassName="product-dialog-body"
      descriptionClassName="sr-only"
      closeClassName="icon-button"
      closeLabel="Close repayment dialog"
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
            <div
              className="customer-credit-summary"
              style={{
                padding: '16px',
                background: 'var(--color-surface-subtle, #18191b)',
                borderRadius: 'var(--radius-md, 10px)',
                marginBottom: '16px',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: '18px' }}>{customer.displayName}</p>
              {customer.contactPlaceholder && (
                <p className="customer-micro" style={{ margin: '4px 0 12px', color: 'var(--color-text-muted)' }}>
                  {customer.contactPlaceholder}
                </p>
              )}
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <div>
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '12px' }}>
                    Current Debt
                  </small>
                  <strong style={{ color: customer.balanceKobo > 0 ? 'var(--color-danger, #ef4444)' : undefined }}>
                    {debtDisplay(customer)}
                  </strong>
                </div>
                <div>
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '12px' }}>
                    Available Store Credit
                  </small>
                  <strong style={{ color: 'var(--color-primary, #a3e635)' }}>{storeCreditDisplay(customer)}</strong>
                </div>
              </div>
            </div>

            {error && (
              <StatusPanel error title="Could not record repayment">
                <p>{error}</p>
              </StatusPanel>
            )}

            <FormField
              label="Repayment amount"
              required
              requiredIndicator={false}
              hint={`Up to current debt (${formatMoney(customer.balanceKobo)})`}
              error={fieldError}
              className="product-field"
            >
              {(field) => (
                <>
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
                  {customer.balanceKobo > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={handleRepayFull}
                        disabled={isLoading}
                        className="customer-micro repay-full-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary, #a3e635)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: '2px 4px',
                        }}
                      >
                        Repay full balance ({formatMoney(customer.balanceKobo)})
                      </button>
                    </div>
                  )}
                </>
              )}
            </FormField>

            <FormField
              label="Notes (optional)"
              hint="e.g. Cash payment at counter, Bank transfer ref"
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
            <Button size="lg" type="submit" loading={isLoading} loadingLabel="Recording…">
              Record repayment
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

