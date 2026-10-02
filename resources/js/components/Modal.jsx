import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';

export function Modal({ open, onClose, children, labelledBy }) {
    const panel = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        document.addEventListener('keydown', onKey);
        const previous = document.activeElement;
        panel.current?.focus();
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            previous?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div ref={panel} tabIndex={-1} className="animate-pop relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl outline-none">
                {children}
            </div>
        </div>
    );
}

/**
 * Asks before a destructive or final action. `onConfirm` runs only after the user agrees.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', tone = 'danger', processing = false }) {
    return (
        <Modal open={open} onClose={processing ? undefined : onClose} labelledBy="confirm-title">
            <div className="flex gap-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <AlertTriangle className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                    <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
                        {title}
                    </h2>
                    <div className="mt-1 text-sm text-slate-600">{message}</div>
                </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onClose} disabled={processing}>
                    Cancel
                </Button>
                <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={processing}>
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
