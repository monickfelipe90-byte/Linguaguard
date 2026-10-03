import { Link } from '@inertiajs/react';
import { Activity, Award, BookMarked, ClipboardCheck, ClipboardList, Plus, ShieldAlert, ShieldCheck, Target, Users } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard } from '../../components/ui';
import { CategoryBadge, DifficultyBadge, ResultBadge, ReviewBadge, StatusBadge } from '../../components/quiz';
import PerformancePanel from '../../components/PerformancePanel';
import { formatDate, formatPercent } from '../../lib/format';

export default function Dashboard({ stats, performance, monitoring, recentAttempts, recentQuestions, recentQuizzes }) {
    return (
        <AppLayout title="Admin Dashboard">
            <PageHeader
                title="Teacher dashboard"
                description="An overview of your question bank, quizzes and learner results."
                actions={
                    <>
                        <LinkButton href="/admin/questions/create" variant="secondary" icon={Plus}>
                            New question
                        </LinkButton>
                        <LinkButton href="/admin/quizzes/create" icon={Plus}>
                            New quiz
                        </LinkButton>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Total learners" value={stats.learners} icon={Users} tone="indigo" />
                <StatCard label="Total questions" value={stats.questions} icon={BookMarked} tone="violet" />
                <StatCard label="Total quizzes" value={stats.quizzes} icon={ClipboardList} tone="sky" />
                <StatCard label="Active quizzes" value={stats.active_quizzes} icon={ClipboardCheck} tone="green" />
                <StatCard label="Quiz attempts" value={stats.attempts} icon={Activity} tone="amber" />
                <StatCard label="Average score" value={formatPercent(stats.average_score)} icon={Target} tone="red" hint="Finished attempts" />
            </div>

            <div className="mt-6">
                <PerformancePanel performance={performance} />
            </div>

            <Card className="mt-6">
                <CardHeader
                    title="Anti-Cheating Monitoring"
                    description="Tab-switch activity and attempts flagged for review."
                    icon={ShieldAlert}
                    action={
                        <Link href="/admin/monitoring" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                            Open monitoring
                        </Link>
                    }
                />
                <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                    {[
                        { label: 'Flagged for review', value: monitoring.flagged, tone: 'text-amber-600', href: '/admin/monitoring?review=flagged' },
                        { label: 'Reviewed', value: monitoring.reviewed, tone: 'text-emerald-600', href: '/admin/monitoring?review=reviewed' },
                        { label: 'Tab switches', value: monitoring.tab_switches, tone: 'text-indigo-600', href: '/admin/monitoring' },
                        { label: 'Attempts with switches', value: monitoring.with_switches, tone: 'text-sky-600', href: '/admin/monitoring' },
                    ].map((s) => (
                        <Link key={s.label} href={s.href} className="bg-white p-4 hover:bg-slate-50">
                            <p className="truncate text-xs font-semibold text-slate-500">{s.label}</p>
                            <p className={`text-2xl font-extrabold tabular-nums ${s.tone}`}>{s.value}</p>
                        </Link>
                    ))}
                </div>
                {monitoring.recent.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="No tab-switch activity yet." className="py-8" />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {monitoring.recent.map((a) => (
                            <li key={a.id}>
                                <Link href={`/admin/results/${a.id}#activity`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 hover:bg-slate-50">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-slate-900">{a.learner.name}</p>
                                        <p className="truncate text-sm text-slate-500">
                                            {a.quiz.title} · <span className="font-mono text-violet-700">{a.quiz.quiz_code}</span> · {formatDate(a.completed_at ?? a.started_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold tabular-nums">
                                            {a.tab_switch_count} switch{a.tab_switch_count === 1 ? '' : 'es'}
                                        </span>
                                        <ReviewBadge status={a.review_status} />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <div className="mt-6 grid gap-6 xl:grid-cols-5">
                <Card className="xl:col-span-3">
                    <CardHeader
                        title="Recent quiz attempts"
                        icon={Award}
                        action={
                            <Link href="/admin/results" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                                View all
                            </Link>
                        }
                    />
                    {recentAttempts.length === 0 ? (
                        <EmptyState icon={Activity} title="No quiz attempts yet." description="Results will appear here as soon as learners take a quiz." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {recentAttempts.map((a) => (
                                <li key={a.id}>
                                    <Link href={`/admin/results/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 hover:bg-slate-50">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-900">{a.learner.name}</p>
                                            <p className="truncate text-sm text-slate-500">
                                                {a.quiz.title} · Attempt {a.attempt_number}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {a.status === 'in_progress' ? (
                                                <StatusBadge status={a.status} />
                                            ) : (
                                                <>
                                                    <span className="font-bold text-slate-900 tabular-nums">
                                                        {a.score}/{a.total_questions}
                                                    </span>
                                                    <ResultBadge attempt={a} />
                                                </>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader
                            title="Recent quizzes"
                            icon={ClipboardList}
                            action={
                                <Link href="/admin/quizzes" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                                    View all
                                </Link>
                            }
                        />
                        {recentQuizzes.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="No quizzes available."
                                action={
                                    <LinkButton href="/admin/quizzes/create" size="sm" icon={Plus}>
                                        Create a quiz
                                    </LinkButton>
                                }
                            />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {recentQuizzes.map((q) => (
                                    <li key={q.id}>
                                        <Link href={`/admin/quizzes/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{q.title}</p>
                                                <p className="text-sm text-slate-500">
                                                    <span className="font-mono font-bold text-violet-700">{q.quiz_code}</span> · {q.questions_count} questions
                                                </p>
                                            </div>
                                            <Badge tone={q.is_active ? 'green' : 'slate'}>{q.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    <Card>
                        <CardHeader
                            title="Recently added questions"
                            icon={BookMarked}
                            action={
                                <Link href="/admin/questions" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                                    View all
                                </Link>
                            }
                        />
                        {recentQuestions.length === 0 ? (
                            <EmptyState icon={BookMarked} title="No questions found." />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {recentQuestions.map((q) => (
                                    <li key={q.id}>
                                        <Link href={`/admin/questions/${q.id}`} className="block px-5 py-3 hover:bg-slate-50">
                                            <p className="truncate text-sm text-slate-700">{q.contextual_sentence}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">“{q.target_word}”</span>
                                                <CategoryBadge category={q.category} />
                                                <DifficultyBadge difficulty={q.difficulty} />
                                                <span className="text-xs text-slate-400">{formatDate(q.created_at, false)}</span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
