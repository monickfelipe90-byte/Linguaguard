import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from './ui';

/**
 * Renders Laravel's length-aware paginator (`links`, `from`, `to`, `total`).
 */
export default function Pagination({ paginator }) {
    if (!paginator || paginator.last_page <= 1) return null;

    const { links, from, to, total, prev_page_url, next_page_url } = paginator;
    const pageLinks = links.slice(1, -1);

    const base = 'inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition';

    return (
        <nav className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row" aria-label="Pagination">
            <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">{from}</span>–<span className="font-semibold text-slate-700">{to}</span> of{' '}
                <span className="font-semibold text-slate-700">{total}</span>
            </p>
            <div className="flex items-center gap-1">
                <PageLink href={prev_page_url} className={base} label="Previous page">
                    <ChevronLeft className="size-4" />
                </PageLink>
                <div className="hidden items-center gap-1 sm:flex">
                    {pageLinks.map((link, i) =>
                        link.url ? (
                            <Link
                                key={i}
                                href={link.url}
                                preserveScroll
                                className={cx(base, link.active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                                aria-current={link.active ? 'page' : undefined}
                            >
                                {link.label}
                            </Link>
                        ) : (
                            <span key={i} className={cx(base, 'text-slate-400')}>
                                {link.label}
                            </span>
                        ),
                    )}
                </div>
                <span className="px-2 text-sm font-semibold text-slate-600 sm:hidden">
                    {paginator.current_page} / {paginator.last_page}
                </span>
                <PageLink href={next_page_url} className={base} label="Next page">
                    <ChevronRight className="size-4" />
                </PageLink>
            </div>
        </nav>
    );
}

function PageLink({ href, className, label, children }) {
    if (!href) {
        return (
            <span className={cx(className, 'text-slate-300')} aria-hidden>
                {children}
            </span>
        );
    }
    return (
        <Link href={href} preserveScroll className={cx(className, 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')} aria-label={label}>
            {children}
        </Link>
    );
}
