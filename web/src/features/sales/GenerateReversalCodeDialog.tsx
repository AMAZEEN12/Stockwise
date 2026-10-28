import { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { useGenerateReversalCodeMutation } from '../../service/api/reversals.api';
import type { ReversalAuthorization } from '../../models/responses/reversals.response';
import '../../styles/sales.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  saleReference: string;
}

export function GenerateReversalCodeDialog({
  open,
  onOpenChange,
  saleId,
  saleReference,
}: Props) {
  const [generateCode, { isLoading }] = useGenerateReversalCodeMutation();
  const [authData, setAuthData] = useState<ReversalAuthorization | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  const handleGenerate = async () => {
    setErrorMsg(null);
    setCopied(false);
    try {
      const res = await generateCode({ saleId, validMinutes: 15 }).unwrap();
      setAuthData(res);
    } catch {
      setErrorMsg('Could not generate authorization code.');
    }
  };

  // Countdown timer when code is generated
  useEffect(() => {
    if (!authData?.expiresAt) return;
    const calculate = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(authData.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsRemaining(remaining);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [authData?.expiresAt]);

  const copyCode = async () => {
    if (!authData?.code) return;
    try {
      await navigator.clipboard.writeText(authData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  const formatCode = (code: string) => {
    if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
    return code;
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const isExpired = authData !== null && secondsRemaining === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setAuthData(null);
          setErrorMsg(null);
          setCopied(false);
        }
        onOpenChange(nextOpen);
      }}
      title="Supervisor Reversal Code"
      description={`Generate a single-use authorization code for sale ${saleReference}.`}
      className="reversal-code-dialog rounded-md max-w-md w-full font-sans"
    >
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          Give this 6-digit authorization code to the cashier to authorize reversing sale{' '}
          <strong className="text-[var(--color-text)]">{saleReference}</strong>. The code is single-use and expires in 15 minutes.
        </p>

        {errorMsg && (
          <div className="flex flex-col gap-2 p-3 bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] rounded-md">
            <p className="text-sm text-[var(--color-danger)]">{errorMsg}</p>
          </div>
        )}

        {!authData ? (
          <div className="flex flex-col items-center justify-center p-6 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md gap-3 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Click below to generate an authorization code for sale <strong>{saleReference}</strong>.
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isLoading}
              loadingLabel="Generating code…"
              onClick={() => void handleGenerate()}
            >
              Generate 6-digit code
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md gap-3">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
              6-Digit Authorization Code
            </span>
            <span
              className={`font-mono text-4xl font-bold tracking-widest ${
                isExpired ? 'line-through text-[var(--color-danger)]' : 'text-[var(--color-primary)]'
              }`}
              aria-label={`Code: ${authData.code}`}
            >
              {formatCode(authData.code)}
            </span>

            {isExpired ? (
              <div className="flex flex-col items-center gap-2 mt-1">
                <span className="text-xs text-[var(--color-danger)] font-medium">
                  This code has expired.
                </span>
                <Button size="sm" variant="secondary" onClick={() => void handleGenerate()}>
                  Generate new code
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span>⏱ Expires in <strong>{timeFormatted}</strong></span>
                <span>• Single-use</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {authData && !isExpired && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => void copyCode()}
            >
              {copied ? '✓ Copied!' : 'Copy code'}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
