import { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    BookMarked,
    ClipboardList,
    History,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    UserCircle2,
    X,
} from 'lucide-react';
import Logo from '../components/Logo';
import Flash from '../components/Flash';
import { cx } from '../components/ui';

const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/questions', label: 'Question Bank', icon: BookMarked },
    { href: '/admin/quizzes', label: 'Quizzes', icon: ClipboardList },
    { href: '/admin/results', label: 'Results', icon: BarChart3 },
    { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

const learnerNav = [
    { href: '/learner', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/join', label: 'Join Quiz', icon: KeyRound },
    { href: '/history', label: 'Quiz History', icon: History },
    { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

export default function AppLayout({ title, children }) {
    const { auth } = usePage().props;
    const url = usePage().url;
    const user = auth.user;
    const nav = user.role === 'admin' ? adminNav : learnerNav;
    const [drawer, setDrawer] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => setDrawer(false), [url]);

    const path = url.split('?')[0];
    const isActive = (item) => (item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`));

    const logout = () => {
        setLoggingOut(true);
        router.post('/logout', {}, { onFinish: () => setLoggingOut(false) });
    };

    const navList = (
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
            {nav.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                        'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
                        isActive(item) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                    aria-current={isActive(item) ? 'page' : undefined}
                >
                    <item.icon className="size-5 shrink-0" aria-hidden />
                    {item.label}
                </Link>
            ))}
        </nav>
    );

    const userBox = (
        <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                    {initials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500 capitalize">{user.role === 'admin' ? 'Teacher / Admin' : 'Learner'}</p>
                </div>
            </div>
            <button
                onClick={logout}
                disabled={loggingOut}
                className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
            >
                <LogOut className="size-5" aria-hidden />
                {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {title && <Head title={title} />}
            <Flash />

            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
                <Link href={nav[0].href} className="flex h-16 items-center border-b border-slate-100 px-5">
                    <Logo />
                </Link>
                {navList}
                {userBox}
            </aside>

            {/* Mobile top bar */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
                <Link href={nav[0].href}>
                    <Logo />
                </Link>
                <button
                    onClick={() => setDrawer(true)}
                    className="-mr-2 grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
                    aria-label="Open menu"
                    aria-expanded={drawer}
                >
                    <Menu className="size-6" />
                </button>
            </header>

            {/* Mobile drawer */}
            {drawer && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawer(false)} aria-hidden />
                    <div className="animate-slide-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
                        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
                            <Logo />
                            <button onClick={() => setDrawer(false)} className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close menu">
                                <X className="size-6" />
                            </button>
                        </div>
                        {navList}
                        {userBox}
                    </div>
                </div>
            )}

            <main className="lg:pl-64">
                <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
            </main>
        </div>
    );
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}
