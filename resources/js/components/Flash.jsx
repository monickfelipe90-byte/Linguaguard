import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

/**
 * Shows the session flash message (success / error) as a dismissible toast.
 */
export default function Flash() {
    const { flash } = usePage().props;
    const [visible, setVisible] = useState(null);

    useEffect(() => {
        if (flash?.success) setVisible({ type: 'success', text: flash.success, key: Date.now() });
        else if (flash?.error) setVisible({ type: 'error', text: flash.error, key: Date.now() });
    }, [flash]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => setVisible(null), visible.type === 'error' ? 7000 : 4500);
        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible) return null;

    const isError = visible.type === 'error';

    return (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4 sm:top-5 sm:right-5 sm:left-auto sm:justify-end">
            <div
                key={visible.key}
                role={isError ? 'alert' : 'status'}
                className={`animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-4 shadow-lg ring-1 ${
                    isError ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-white text-slate-800 ring-emerald-200'
                }`}
            >
                {isError ? <XCircle className="size-5 shrink-0 text-rose-500" /> : <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />}
                <p className="flex-1 text-sm font-medium">{visible.text}</p>
                <button onClick={() => setVisible(null)} className="-m-1 rounded-lg p-1 text-slate-400 hover:text-slate-600" aria-label="Dismiss">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
