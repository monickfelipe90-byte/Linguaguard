import { useId } from 'react';
import { cx } from './ui';

export function LogoMark({ className }) {
    // Unique per instance: a gradient defined inside a hidden copy (e.g. the desktop sidebar) cannot be referenced.
    const id = `lg-mark-${useId().replace(/:/g, '')}`;
    return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4f46e5" />
                    <stop offset="1" stopColor="#9333ea" />
                </linearGradient>
            </defs>
            <path d="M16 2 4 6.5v8.2C4 22.3 9.1 28 16 30c6.9-2 12-7.7 12-15.3V6.5Z" fill={`url(#${id})`} />
            <path d="M10.5 11.5h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H16l-3.5 3v-3h-2A1.5 1.5 0 0 1 9 19v-6a1.5 1.5 0 0 1 1.5-1.5Z" fill="#fff" />
        </svg>
    );
}

export default function Logo({ className, light = false, compact = false }) {
    return (
        <span className={cx('inline-flex items-center gap-2', className)}>
            <LogoMark className="size-8 shrink-0" />
            {!compact && (
                <span className={cx('text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
                    LINGUA<span className={light ? 'text-indigo-200' : 'text-violet-600'}>GUARD</span>
                </span>
            )}
        </span>
    );
}
