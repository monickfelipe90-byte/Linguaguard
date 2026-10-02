import { Link } from '@inertiajs/react';
import { BookOpenCheck, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import Flash from '../components/Flash';

export default function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <Flash />
            <aside className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-2xl" aria-hidden />
                <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-400/20 blur-3xl" aria-hidden />
                <Link href="/" className="relative">
                    <Logo light />
                </Link>
                <div className="relative space-y-6">
                    <h2 className="text-4xl leading-tight font-extrabold">
                        Learn English.
                        <br />
                        Think in Context.
                        <br />
                        Master Language.
                    </h2>
                    <ul className="space-y-3 text-indigo-100">
                        <li className="flex items-center gap-3">
                            <BookOpenCheck className="size-5" /> Identify parts of speech from real sentences
                        </li>
                        <li className="flex items-center gap-3">
                            <Sparkles className="size-5" /> Instant feedback with explanations
                        </li>
                        <li className="flex items-center gap-3">
                            <ShieldCheck className="size-5" /> Fair, server-checked scoring
                        </li>
                    </ul>
                </div>
                <p className="relative text-sm text-indigo-200">For Grade 8 learners and their teachers.</p>
            </aside>

            <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
                <div className="w-full max-w-md">
                    <Link href="/" className="mb-8 inline-block lg:hidden">
                        <Logo />
                    </Link>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
                    {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
                    <div className="mt-8">{children}</div>
                </div>
            </main>
        </div>
    );
}
