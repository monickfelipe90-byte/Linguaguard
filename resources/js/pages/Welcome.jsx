import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, BarChart3, BookMarked, ClipboardList, KeyRound, Lightbulb, MousePointerClick, ShieldCheck, Timer } from 'lucide-react';
import PublicLayout from '../layouts/PublicLayout';
import { LinkButton } from '../components/ui';

const choiceColors = ['bg-violet-500', 'bg-sky-500', 'bg-amber-400', 'bg-emerald-500'];

export default function Welcome() {
    const { auth } = usePage().props;
    const user = auth?.user;

    return (
        <PublicLayout>
            <Head title="Learn English. Think in Context." />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-white to-white" aria-hidden />
                <div className="absolute top-10 -right-40 -z-10 size-[28rem] rounded-full bg-violet-200/50 blur-3xl" aria-hidden />
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 md:pt-20 lg:grid-cols-2 lg:pb-24">
                    <div className="animate-fade-up">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                            <ShieldCheck className="size-4" /> Grade 8 English · Parts of Speech
                        </span>
                        <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            Learn English.{' '}
                            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Think in Context.</span> Master Language.
                        </h1>
                        <p className="mt-5 max-w-xl text-lg text-slate-600">
                            LINGUAGUARD helps Grade 8 learners practice identifying parts of speech the way words are really used — inside sentences. Join a
                            quiz with a code, answer timed multiple-choice questions, and learn from instant feedback.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            {user?.role === 'admin' ? (
                                <LinkButton href="/admin" size="lg">
                                    Open teacher dashboard <ArrowRight className="size-5" />
                                </LinkButton>
                            ) : (
                                <LinkButton href="/join" size="lg" icon={KeyRound}>
                                    Join a Quiz
                                </LinkButton>
                            )}
                            {!user && (
                                <LinkButton href="/register" size="lg" variant="secondary">
                                    Create a learner account
                                </LinkButton>
                            )}
                        </div>
                    </div>

                    {/* Sample question preview */}
                    <div className="animate-fade-up relative mx-auto w-full max-w-md [animation-delay:120ms]">
                        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 shadow-2xl shadow-indigo-600/30 sm:p-6">
                            <div className="flex items-center justify-between text-sm font-semibold text-indigo-100">
                                <span>Question 3 of 10</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                                    <Timer className="size-4" /> 08:42
                                </span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                                <div className="h-full w-3/10 rounded-full bg-white" />
                            </div>
                            <div className="mt-5 rounded-2xl bg-white p-5 text-center">
                                <p className="text-lg font-semibold text-slate-800">
                                    The students <mark className="rounded-md bg-amber-200 px-1 font-bold">quickly</mark> answered the question.
                                </p>
                                <p className="mt-3 text-sm text-slate-500">What part of speech is the highlighted word?</p>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {['Adjective', 'Adverb', 'Verb', 'Noun'].map((label, i) => (
                                    <div key={label} className={`${choiceColors[i]} rounded-xl px-3 py-4 text-center font-bold text-white shadow-sm ${i === 1 ? 'ring-4 ring-white' : ''}`}>
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute -bottom-5 -left-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-100 sm:-left-8">
                            <p className="text-sm font-bold text-emerald-600">Correct! +1</p>
                            <p className="text-xs text-slate-500">“Quickly” tells how they answered.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">How a quiz works</h2>
                    <p className="mt-3 text-slate-600">Every question shows a real sentence with one highlighted word. Decide how that word is used, then pick your answer.</p>
                </div>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { icon: KeyRound, title: 'Enter the code', text: 'Your teacher shares a short quiz code like LG8K42.' },
                        { icon: MousePointerClick, title: 'Read & choose', text: 'Look at the highlighted word in context and tap one of four choices.' },
                        { icon: Lightbulb, title: 'Learn instantly', text: 'See if you are correct right away, with an explanation.' },
                        { icon: Timer, title: 'Beat the clock', text: 'Finish before time runs out and review your results.' },
                    ].map((step, i) => (
                        <div key={step.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
                            <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                                <step.icon className="size-5" />
                            </span>
                            <p className="mt-4 text-xs font-bold tracking-wide text-violet-600 uppercase">Step {i + 1}</p>
                            <h3 className="mt-1 font-bold text-slate-900">{step.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{step.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Parts of speech covered */}
            <section className="bg-slate-50">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">All eight parts of speech</h2>
                    <p className="mt-3 max-w-2xl text-slate-600">Questions cover every part of speech, at Easy, Medium and Hard levels.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        {['Noun', 'Pronoun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Interjection'].map((c) => (
                            <span key={c} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* For teachers */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white sm:p-12 lg:grid-cols-2">
                    <div>
                        <p className="text-sm font-bold tracking-wide text-indigo-300 uppercase">For Teachers</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Manage quizzes and monitor learner results.</h2>
                        <p className="mt-3 text-slate-300">Build a question bank, assemble quizzes, share a code, and see every learner’s score as soon as they finish.</p>
                        <div className="mt-6">
                            <LinkButton href={user?.role === 'admin' ? '/admin' : '/login'} variant="white" size="lg">
                                {user?.role === 'admin' ? 'Open dashboard' : 'Teacher login'} <ArrowRight className="size-5" />
                            </LinkButton>
                        </div>
                    </div>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {[
                            { icon: BookMarked, text: 'Question bank with search and filters' },
                            { icon: ClipboardList, text: 'Quizzes with time limits and passing scores' },
                            { icon: ShieldCheck, text: 'Answers checked on the server' },
                            { icon: BarChart3, text: 'Scores, pass rates and answer reviews' },
                        ].map((f) => (
                            <li key={f.text} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                                <f.icon className="size-5 shrink-0 text-indigo-300" />
                                <span className="text-sm font-medium text-slate-200">{f.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </PublicLayout>
    );
}
