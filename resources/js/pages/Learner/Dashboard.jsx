import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, ClipboardList, Gauge, History, KeyRound, PlayCircle, Timer, Trophy } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { Badge, Card, CardHeader, EmptyState, LinkButton, StatCard } from '../../components/ui';
import { ResultBadge, StatusBadge } from '../../components/quiz';
import { formatDate, formatPercent } from '../../lib/format';

export default function Dashboard({ stats, availableQuizzes, recentAttempts }) {
    const { auth } = usePage().props;
    const firstName = auth.user.name.split(' ')[0];

    return (
        <AppLayout title="Dashboard">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-600/20 sm:p-8">
                <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-indigo-200">Welcome back,</p>
                        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{firstName}! 👋</h1>
                        <p className="mt-2 max-w-md text-indigo-100">Ready to think in context? Enter the code from your teacher to start a quiz.</p>
                    </div>
                    <LinkButton href="/join" variant="white" size="xl" icon={KeyRound} className="shrink-0">
                        JOIN QUIZ
                    </LinkButton>
                </div>
            </section>

            <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Average score" value={formatPercent(stats.average_score)} icon={Gauge} tone="indigo" />
                <StatCard label="Completed quizzes" value={stats.completed_quizzes} icon={CheckCircle2} tone="sky" />
                <StatCard label="Passed quizzes" value={stats.passed_quizzes} icon={Trophy} tone="green" />
                <StatCard label="Total attempts" value={stats.total_attempts} icon={History} tone="violet" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-5">
                <Card className="xl:col-span-3">
                    <CardHeader title="Available quizzes" description="Active quizzes you can open right now." icon={ClipboardList} />
                    {availableQuizzes.length === 0 ? (
                        <EmptyState icon={ClipboardList} title="No quizzes available." description="Your teacher hasn't opened a quiz yet. If you have a code, use Join Quiz." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {availableQuizzes.map((q) => {
                                const locked = q.completed && !q.can_retry && !q.in_progress_attempt;
                                return (
                                    <li key={q.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-bold text-slate-900">{q.title}</p>
                                                {q.in_progress_attempt && <Badge tone="amber">In progress</Badge>}
                                                {q.completed && !q.in_progress_attempt && <Badge tone="indigo">Completed</Badge>}
                                            </div>
                                            {q.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{q.description}</p>}
                                            <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-medium text-slate-500">
                                                <span>{q.questions_count} questions</span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Timer className="size-3.5" /> {q.time_limit} min
                                                </span>
                                                <span>Pass {formatPercent(q.passing_score)}</span>
                                            </p>
                                        </div>
                                        {q.in_progress_attempt ? (
                                            <LinkButton href={`/attempts/${q.in_progress_attempt}`} variant="primary" size="sm" icon={PlayCircle}>
                                                Resume
                                            </LinkButton>
                                        ) : locked ? (
                                            <span className="text-sm font-semibold text-slate-400">Already completed</span>
                                        ) : (
                                            <LinkButton href={`/quiz/${q.quiz_code}`} variant={q.completed ? 'secondary' : 'soft'} size="sm">
                                                {q.completed ? 'Try again' : 'Open quiz'} <ArrowRight className="size-4" />
                                            </LinkButton>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                <Card className="xl:col-span-2">
                    <CardHeader
                        title="Recent attempts"
                        icon={History}
                        action={
                            <Link href="/history" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                                View history
                            </Link>
                        }
                    />
                    {recentAttempts.length === 0 ? (
                        <EmptyState icon={History} title="No quiz attempts yet." description="Your results will show up here after your first quiz." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {recentAttempts.map((a) => (
                                <li key={a.id}>
                                    <Link
                                        href={a.status === 'in_progress' ? `/attempts/${a.id}` : `/attempts/${a.id}/result`}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-900">{a.quiz.title}</p>
                                            <p className="text-xs text-slate-500">
                                                Attempt {a.attempt_number} · {formatDate(a.completed_at ?? a.started_at)}
                                            </p>
                                        </div>
                                        {a.status === 'in_progress' ? (
                                            <StatusBadge status={a.status} />
                                        ) : (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-bold tabular-nums">{formatPercent(a.percentage)}</span>
                                                <ResultBadge attempt={a} />
                                            </div>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
