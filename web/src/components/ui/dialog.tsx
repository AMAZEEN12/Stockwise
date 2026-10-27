// Dialog and ConfirmDialog
// Owner: Victor
//
// Built on Radix Dialog: focus moves in on open and is trapped, Escape closes,
// focus returns to the opener. Title and description are required props.
//
// Needs from teammates (same-named exports expected):
// - ../../lib/cn.ts          -> cn(...classes)           (Muizz)
// - ./button.tsx             -> Button with `variant` ("primary" | "secondary" | "danger" | "ghost"),
//                               `size` ("sm" | "md" | "lg"), `loading` (boolean), forwarded ref (Muizz)
// - tokens.css variables used: --color-surface, --color-text, --color-text-muted, --color-border,
//                               --color-focus, --radius, plus --color-text on a dimmed backdrop (see overlay)
//
// Usage (plain dialog with a trigger):
//   <Dialog
//     trigger={<Button>View details</Button>}
//     title="Stock count details"
//     description="Last counted on 22 October."
//   >
//     ...body content...
//   </Dialog>
//
// Usage (confirm, destructive):
//   <ConfirmDialog
//     trigger={<Button variant="danger">Delete item</Button>}
//     title="Delete this item?"
//     description="This removes it from your stock list. You cannot undo this."
//     confirmLabel="Delete item"
//     tone="danger"
//     onConfirm={async () => { await deleteItem(id); }}
//   />

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/cn";
import { Button } from "./button";

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export interface DialogProps {
  /** Short name of the dialog. Required so screen readers always announce it. */
  title: React.ReactNode;
  /** One or two sentences on what the dialog is for. Required for the same reason. */
  description: React.ReactNode;
  /** Element that opens the dialog (usually a Button). Focus returns to it on close. */
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons shown at the bottom. */
  footer?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Override where focus lands on open. Call event.preventDefault() then focus your own element. */
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  /** Stockwise copy-in extensions: styling slots preserve the shared Radix behavior. */
  overlayClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  closeClassName?: string;
  className?: string;
  /** Stockwise-approved additive proposals; defaults preserve the shared dialog. */
  placement?: "center" | "right" | "left";
  dismissible?: boolean;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  closeLabel?: string;
  closeContent?: React.ReactNode;
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  {
    title,
    description,
    trigger,
    children,
    footer,
    open,
    defaultOpen,
    onOpenChange,
    onOpenAutoFocus,
    onCloseAutoFocus,
    overlayClassName,
    titleClassName,
    descriptionClassName,
    closeClassName,
    className,
    placement = "center", dismissible = true, headerClassName, bodyClassName, footerClassName,
    closeLabel = "Close", closeContent,
  },
  ref,
) {
  return (
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={(next) => { if (next || dismissible) onOpenChange?.(next); }}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-[var(--color-text)]/50", overlayClassName)} />
        <DialogPrimitive.Content
          ref={ref}
          data-placement={placement}
          onEscapeKeyDown={(event) => { if (!dismissible) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (!dismissible) event.preventDefault(); }}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "shared-dialog fixed z-50 flex flex-col overflow-y-auto overscroll-contain border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-lg",
            placement === "center" && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg gap-4 rounded-md p-6",
            placement === "right" && "inset-y-0 right-0 h-full max-h-screen w-full max-w-lg border-l rounded-none p-0 gap-0",
            placement === "left" && "inset-y-0 left-0 h-full max-h-screen w-full max-w-lg border-r rounded-none p-0 gap-0",
            className,
          )}
        >
          <div className={cn("flex items-start justify-between gap-4", headerClassName)}>
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className={cn("text-lg font-semibold", titleClassName)}>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={cn("text-sm text-[var(--color-text-muted)]", descriptionClassName)}>
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              disabled={!dismissible}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--color-text)] hover:bg-[var(--color-border)]",
                focusRing,
                closeClassName,
              )}
            >
              {closeContent ?? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>}
            </DialogPrimitive.Close>
          </div>
          {children ? <div className={cn("text-sm", bodyClassName)}>{children}</div> : null}
          {footer ? <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", footerClassName)}>{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

export interface ConfirmDialogProps
  extends Omit<DialogProps, "footer" | "children" | "onOpenAutoFocus"> {
  /** Names the action: "Approve request", not "OK". Required. */
  confirmLabel: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  confirmDisabled?: boolean;
  closeOnConfirm?: boolean;
  actionOrder?: "cancel-first" | "confirm-first";
  confirmButtonProps?: Pick<import("./button").ButtonProps, "variant" | "size" | "className">;
  cancelButtonProps?: Pick<import("./button").ButtonProps, "variant" | "size" | "className">;
  /** "danger" for delete, reverse and similar. Focus starts on Cancel in this tone. */
  tone?: "default" | "danger";
  /**
   * Runs when the user confirms. If it returns a promise, the confirm button shows its
   * loading state until it settles. The dialog closes when it resolves and stays open
   * if it throws, so handle the error yourself (for example with an error Toast).
   */
  onConfirm: () => void | Promise<void>;
  /** Force the loading state from outside, for example while a mutation is in flight. */
  loading?: boolean;
  /** Optional extra content between the description and the buttons. */
  children?: React.ReactNode;
}

export const ConfirmDialog = React.forwardRef<HTMLDivElement, ConfirmDialogProps>(function ConfirmDialog(
  {
    confirmLabel,
    cancelLabel = "Cancel",
    tone = "default",
    confirmDisabled = false, closeOnConfirm = true, actionOrder = "cancel-first",
    confirmButtonProps, cancelButtonProps,
    onConfirm,
    loading = false,
    open,
    defaultOpen,
    onOpenChange,
    children,
    ...rest
  },
  ref,
) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const [pending, setPending] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const submitting = React.useRef(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const busy = pending || loading;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Do not let the dialog close (Escape, overlay click, X) while a confirm is running.
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    setOpen(next);
  };

  const handleConfirm = async () => {
    if (busy || confirmDisabled || submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      await onConfirm();
      if (closeOnConfirm) setOpen(false);
    } catch {
      // Stay open so the user can retry. The caller reports the error.
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <Dialog
      {...rest}
      ref={ref}
      open={isOpen}
      onOpenChange={handleOpenChange}
      dismissible={!busy && rest.dismissible !== false}
      onOpenAutoFocus={(event) => {
        if (tone === "danger") {
          event.preventDefault();
          cancelRef.current?.focus();
        }
      }}
      footer={[
        <Button key="cancel" ref={cancelRef} variant="secondary" {...cancelButtonProps} disabled={busy} onClick={() => handleOpenChange(false)}>
          {cancelLabel}
        </Button>,
        <Button key="confirm" variant={tone === "danger" ? "danger" : "primary"} {...confirmButtonProps} disabled={confirmDisabled} loading={busy} onClick={handleConfirm}>
          {confirmLabel}
        </Button>,
      ].slice().sort((a, b) => actionOrder === "confirm-first" ? (a.key === "confirm" ? -1 : b.key === "confirm" ? 1 : 0) : 0)}
    >
      {children}
    </Dialog>
  );
});
