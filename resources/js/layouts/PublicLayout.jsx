import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import Logo from '../components/Logo';
import Flash from '../components/Flash';
import { LinkButton, cx } from '../components/ui';

export default function PublicLayout({ children }) {
    const { auth } = usePage().props;
    const url = usePage().url;
    const [open, setOpen] = useState(false);
    const user = auth?.user;

    const links = [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
        ...(!user || user.role === 'learner' ? [{ href: '/join', label: 'Join Quiz' }] : []),
    ];

    const isActive = (href) => (href === '/' ? url === '/' : url.startsWith(href));

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <Flash />
            <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
                <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" aria-label="LINGUAGUARD home">
                        <Logo />
                    </Link>

                    <div className="hidden items-center gap-1 md:flex">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cx(
                                    'rounded-lg px-3 py-2 text-sm font-semibold transition',
                                    isActive(l.href) ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-900',
                                )}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    <div className="hidden items-center gap-2 md:flex">
                        {user ? (
                            <LinkButton href="/dashboard" size="sm">
                                Go to dashboard
                            </LinkButton>
                        ) : (
                            <>
                                <LinkButton href="/login" variant="ghost" size="sm">
                                    Login
                                </LinkButton>
                                <LinkButton href="/register" size="sm">
                                    Register
                                </LinkButton>
                            </>
                        )}
                    </div>

                    <button
                        className="-mr-2 grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                    >
                        {open ? <X className="size-6" /> : <Menu className="size-6" />}
                    </button>
                </nav>

                {open && (
                    <div className="animate-fade-up border-t border-slate-100 bg-white px-4 pt-2 pb-4 md:hidden">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cx('block rounded-xl px-3 py-3 font-semibold', isActive(l.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700')}
                            >
                                {l.label}
                            </Link>
                        ))}
                        <div className="mt-3 grid gap-2">
                            {user ? (
                                <LinkButton href="/dashboard">Go to dashboard</LinkButton>
                            ) : (
                                <>
                                    <LinkButton href="/login" variant="secondary">
                                        Login
                                    </LinkButton>
                                    <LinkButton href="/register">Register</LinkButton>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-slate-100 bg-slate-50">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
                    <Logo compact />
                    <p>LINGUAGUARD · Contextual parts-of-speech practice for Grade 8 learners.</p>
                </div>
            </footer>
        </div>
    );
}
