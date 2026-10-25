import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ConfirmDialog} from './dialog';

describe('shared confirmation guards', () => {
  it('blocks confirmation until the caller accepts changed values', async () => {
    const submit = vi.fn();
    const {rerender} = render(<ConfirmDialog open title="Review changes" description="Accept the new values first." confirmLabel="Record sale" confirmDisabled onConfirm={submit}/>);
    fireEvent.click(screen.getByRole('button', {name:'Record sale'}));
    expect(submit).not.toHaveBeenCalled();
    rerender(<ConfirmDialog open title="Review changes" description="Accept the new values first." confirmLabel="Record sale" onConfirm={submit}/>);
    fireEvent.click(screen.getByRole('button', {name:'Record sale'}));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  });

  it('sends one asynchronous action, prevents closing while pending and closes on success', async () => {
    let finish!: () => void;
    const submit = vi.fn(() => new Promise<void>((resolve) => {finish=resolve;}));
    const changed = vi.fn();
    render(<ConfirmDialog defaultOpen title="Record sale" description="Keep the original submission." confirmLabel="Record" onConfirm={submit} onOpenChange={changed}/>);
    act(() => {
      fireEvent.click(screen.getByRole('button', {name:'Record'}));
      fireEvent.click(screen.getByRole('button', {name:'Record'}));
    });
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', {name:'Cancel'})).toBeDisabled();
    expect(screen.getByRole('button', {name:'Close'})).toBeDisabled();
    fireEvent.keyDown(document, {key:'Escape'});
    expect(changed).not.toHaveBeenCalled();
    await act(async () => {finish();});
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(changed).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog available after a rejected action', async () => {
    render(<ConfirmDialog defaultOpen title="Save change" description="The caller reports a failed save." confirmLabel="Save" onConfirm={async () => {throw new Error('offline');}}/>);
    fireEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(screen.getByRole('button', {name:'Save'})).not.toHaveAttribute('aria-busy'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('offline')).not.toBeInTheDocument();
  });

  it('allows a caller to own the post-confirm transition', async () => {
    const changed = vi.fn();
    render(<ConfirmDialog open title="Confirm sale" description="The sale state owns dismissal." confirmLabel="Confirm" closeOnConfirm={false} onConfirm={vi.fn()} onOpenChange={changed}/>);
    fireEvent.click(screen.getByRole('button', {name:'Confirm'}));
    await waitFor(() => expect(screen.getByRole('button', {name:'Confirm'})).not.toHaveAttribute('aria-busy'));
    expect(changed).not.toHaveBeenCalled();
  });
});
