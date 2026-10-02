import { Link } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

export function cx(...classes) {
    return classes.filter(Boolean).join(' ');
}

const variants = {
    primary:
        'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 focus-visible:outline-indigo-600',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-indigo-600',
    soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:outline-indigo-600',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-600',
    'danger-soft': 'bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:outline-rose-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:outline-emerald-600',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-indigo-600',
    white: 'bg-white text-indigo-700 shadow-sm hover:bg-indigo-50 focus-visible:outline-white',
};

const sizes = {
    sm: 'min-h-9 px-3 text-sm gap-1.5',
    md: 'min-h-11 px-4 text-sm gap-2',
    lg: 'min-h-12 px-6 text-base gap-2',
    xl: 'min-h-14 px-8 text-lg gap-2.5',
};

function buttonClasses(variant, size, className) {
    return cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
    );
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, icon: Icon, type = 'button', ...props }) {
    return (
        <button type={type} disabled={disabled || loading} className={buttonClasses(variant, size, className)} aria-busy={loading || undefined} {...props}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            {children}
        </button>
    );
}

export function LinkButton({ variant = 'primary', size = 'md', className, children, icon: Icon, ...props }) {
    return (
        <Link className={buttonClasses(variant, size, className)} {...props}>
            {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
            {children}
        </Link>
    );
}

export function Card({ className, children, ...props }) {
    return (
        <div className={cx('min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70', className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ title, description, action, icon: Icon }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
                {Icon && (
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="size-5" aria-hidden />
                    </span>
                )}
                <div className="min-w-0">
                    <h2 className="font-bold text-slate-900">{title}</h2>
                    {description && <p className="text-sm text-slate-500">{description}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

const badgeTones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function Badge({ tone = 'slate', className, children, icon: Icon }) {
    return (
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', badgeTones[tone], className)}>
            {Icon && <Icon className="size-3" aria-hidden />}
            {children}
        </span>
    );
}

export function Field({ label, htmlFor, error, hint, required, children, className }) {
    return (
        <div className={cx('space-y-1.5', className)}>
            {label && (
                <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
                    {label}
                    {required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
            {error && (
                <p className="text-sm font-medium text-rose-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

const inputBase =
    'block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm disabled:bg-slate-50 disabled:text-slate-500';

function ringFor(error) {
    return error ? 'ring-rose-300 focus:ring-rose-500' : 'ring-slate-300 focus:ring-indigo-600';
}

export function Input({ error, className, ...props }) {
    return <input className={cx(inputBase, 'min-h-11', ringFor(error), className)} aria-invalid={error ? true : undefined} {...props} />;
}

export function TextArea({ error, className, rows = 3, ...props }) {
    return <textarea rows={rows} className={cx(inputBase, ringFor(error), className)} aria-invalid={error ? true : undefined} {...props} />;
}

export function Select({ error, className, children, ...props }) {
    return (
        <select className={cx(inputBase, 'min-h-11 pr-9', ringFor(error), className)} aria-invalid={error ? true : undefined} {...props}>
            {children}
        </select>
    );
}

export function Toggle({ checked, onChange, label, description, id }) {
    return (
        <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl p-3 ring-1 ring-slate-200 transition hover:bg-slate-50">
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{label}</span>
                {description && <span className="block text-xs text-slate-500">{description}</span>}
            </span>
            <span className="relative mt-0.5 inline-flex shrink-0">
                <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2" />
                <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
        </label>
    );
}

export function Spinner({ className }) {
    return <Loader2 className={cx('size-5 animate-spin text-indigo-600', className)} aria-label="Loading" />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)}>
            {Icon && (
                <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
                    <Icon className="size-7" aria-hidden />
                </span>
            )}
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

const statTones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-600',
};

export function StatCard({ label, value, icon: Icon, tone = 'indigo', hint }) {
    return (
        <Card className="flex items-center gap-4 p-4 sm:p-5">
            {Icon && (
                <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl sm:size-12', statTones[tone])}>
                    <Icon className="size-5 sm:size-6" aria-hidden />
                </span>
            )}
            <div className="min-w-0">
                <p className="truncate text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
                {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
            </div>
        </Card>
    );
}

export function PageHeader({ title, description, actions, back }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {back}
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
                {description && <p className="mt-1 text-slate-500">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function BackLink({ href, children }) {
    return (
        <Link href={href} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            <span aria-hidden>←</span> {children}
        </Link>
    );
}
