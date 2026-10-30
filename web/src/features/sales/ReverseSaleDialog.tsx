import { createUuid } from '../../shared/utils/uuid';
import { useRef, useState } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { FormField } from '../../components/ui/form-field';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { useToast } from '../../components/ui/toast';
import { formatMoney } from '../../lib/money';
import { useReverseSaleMutation } from '../../service/api/reversals.api';
import type { ReversalReason } from '../../models/requests/reversals.request';
import type { Role } from '../../models/responses/auth.response';
import type { HttpError } from '../../service/http-client';
import { readSession } from '../../auth/session';
import type { SaleReversalRequest } from '../../models/requests/reversals.request';
import type { SaleReversalResponse } from '../../models/responses/reversals.response';
import { isReversalSimulation } from './reversal-simulation';
import '../../styles/sales.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  saleReference: string;
  totalKobo: number;
  userRole: Role;
  onSuccess?: (result: SaleReversalResponse) => void;
  onRequestCodeClick?: () => void;
}

const REVERSAL_REASONS: { label: string; value: ReversalReason }[] = [
  { label: 'Customer return / refund', value: 'CUSTOMER_RETURN' },
  { label: 'Billing / entry error', value: 'BILLING_ERROR' },
  { label: 'Damaged / expired product', value: 'DAMAGED_PRODUCT' },
  { label: 'Other', value: 'OTHER' },
];

export function ReverseSaleDialog({
  open,
  onOpenChange,
  saleId,
  saleReference,
  totalKobo,
  userRole,
  onSuccess,
  onRequestCodeClick,
}: Props) {
  const [reverseSale, { isLoading }] = useReverseSaleMutation();
  const { toast } = useToast();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sending = useRef(false);
  const simulation = isReversalSimulation();
  const storageKey = `stockwise.simulated-reversal.${readSession()?.user.id}.${saleId}`;
  const [pending, setPending] = useState<{key:string;body:SaleReversalRequest} | null>(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      return saved && typeof saved.key === 'string' && typeof saved.body?.reason === 'string' ? saved : null;
    } catch { return null; }
  });
  const [code, setCode] = useState(pending?.body.authorizationCode || '');
  const [reason, setReason] = useState<ReversalReason>(pending?.body.reason || 'CUSTOMER_RETURN');
  const [note, setNote] = useState(pending?.body.note || '');

  const isAssistant = userRole === 'ASSISTANT';
  const cleanCode = code.replace(/\D/g, '').slice(0, 6);
  const canSubmit = simulation && (!!pending || !isAssistant || cleanCode.length === 6);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isLoading || sending.current) return;
    sending.current = true;

    setErrorMsg(null);
    try {
      const attempt = pending || {key:createUuid(),body:{reason,note:note.trim() || undefined,authorizationCode:isAssistant ? cleanCode : undefined}};
      if (!pending) {
        const snapshot = JSON.stringify(attempt);
        sessionStorage.setItem(storageKey, snapshot);
        if (sessionStorage.getItem(storageKey) !== snapshot) throw new Error('Recovery unavailable');
        setPending(attempt);
      }
      const result = await reverseSale({
        saleId,
        body: attempt.body,
        key: attempt.key,
      }).unwrap();
      sessionStorage.removeItem(storageKey);
      setPending(null);

      toast({
        variant: 'success',
        title: `Simulated sale ${saleReference} reversed. Stock restored.`,
      });
      onOpenChange(false);
      onSuccess?.(result);
    } catch (err) {
      const httpError = err as HttpError;
      const code = httpError.code;
      if (!httpError.status) {
        setErrorMsg('Unable to save recovery data. Nothing was sent.');
      } else if (typeof httpError.status !== 'number' || httpError.status >= 500) {
        setErrorMsg('This simulated reversal is not confirmed. Retry the same request to check its result.');
      } else if (pending) {
        setErrorMsg('This simulated reversal remains unconfirmed. Check the sale before taking further action.');
      } else if (code === 'INVALID_AUTHORIZATION_CODE') {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg('The authorization code is invalid or has expired.');
      } else if (code === 'AUTHORIZATION_SALE_MISMATCH') {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg('This authorization code was not issued for this sale.');
      } else if (code === 'AUTHORIZATION_ALREADY_USED') {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg('This authorization code has already been redeemed.');
      } else if (code === 'SALE_ALREADY_REVERSED') {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg('This sale has already been reversed.');
      } else if (code === 'SUPERVISOR_CODE_REQUIRED') {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg('Supervisor authorization code is required for assistants.');
      } else {
        sessionStorage.removeItem(storageKey); setPending(null);
        setErrorMsg('Could not reverse the simulated sale. Check the sale and try again.');
      }
    } finally {
      sending.current = false;
    }
  };

  const handleCodeChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setCode(digitsOnly);
    if (errorMsg) setErrorMsg(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reverse sale"
      description={`Reverse sale ${saleReference} of ${formatMoney(totalKobo)}. Items will return to inventory.`}
      dismissible={!isLoading}
      className="reverse-sale-dialog rounded-md max-w-lg w-full font-sans"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 py-2">
        <p className="text-sm" role="status">{simulation ? 'Simulation only: inventory and customer balances shown here are demonstration data.' : 'Sale reversal is unavailable until the service contract is approved.'}</p>
        {pending && <p className="text-sm" role="status">A previous simulated reversal is unconfirmed. Retry the same request.</p>}
        <div className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md text-sm">
          <div className="flex justify-between items-center">
            <span>Sale reference</span>
            <strong className="text-[var(--color-text)]">{saleReference}</strong>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span>Original total</span>
            <strong>{formatMoney(totalKobo)}</strong>
          </div>
        </div>

        {isAssistant ? (
          <div className="flex flex-col gap-2 p-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md">
            <span className="text-xs uppercase tracking-wide font-medium text-[var(--color-text-muted)]">
              Supervisor Authorization Required
            </span>
            <p className="text-xs text-[var(--color-text-muted)]">
              Admin and Owner are in charge of code generation. Ask your store Owner or Admin for a 6-digit reversal code to authorize reversing this sale.
            </p>
            <FormField
              label="6-Digit Authorization Code"
              required
              className="mt-1"
            >
              {(field) => (
                <Input
                  {...field}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={cleanCode}
                  disabled={!!pending || isLoading}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="000 000"
                  className="font-mono text-center tracking-widest text-lg h-11"
                  autoFocus
                />
              )}
            </FormField>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1">
              <span>Admin / Owner in charge of code generation</span>
              {simulation && <button
                type="button"
                disabled={!!pending || isLoading}
                className="text-[var(--color-primary)] hover:underline cursor-pointer"
                onClick={() => setCode('839201')}
              >
                Demo: Fill supervisor code (839 201)
              </button>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md text-xs text-[var(--color-text-muted)]">
            <span>Admin / Owner: Direct reversal authorized for {userRole}.</span>
            {onRequestCodeClick && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRequestCodeClick}
              >
                Generate code for cashier
              </Button>
            )}
          </div>
        )}

        <FormField label="Reason for reversal" required>
          {(field) => (
            <Select
              {...field}
              value={reason}
              disabled={!!pending || isLoading}
              onValueChange={(val) => {
                if (val) setReason(val as ReversalReason);
              }}
              options={REVERSAL_REASONS}
            />
          )}
        </FormField>

        <FormField label="Notes (optional)">
          {(field) => (
            <Input
              {...field}
              type="text"
              value={note}
              disabled={!!pending || isLoading}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer brought back unopened item"
              maxLength={250}
            />
          )}
        </FormField>

        {errorMsg && (
          <div role="alert" className="p-3 bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] rounded-md text-sm text-[var(--color-danger)]">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="md"
            disabled={!canSubmit || isLoading}
            loading={isLoading}
            loadingLabel="Reversing sale…"
          >
            {pending ? 'Retry same reversal' : 'Confirm reversal'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

