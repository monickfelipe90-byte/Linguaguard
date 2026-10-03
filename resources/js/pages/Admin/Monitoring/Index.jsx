import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { CheckCircle2, ChevronRight, Eye, Info, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { Button, Card, EmptyState, Input, PageHeader, Select, StatCard, cx } from '../../../components/ui';
import Pagination from '../../../components/Pagination';
import { ReviewBadge, StatusBadge } from '../../../components/quiz';
import { formatDate, formatPercent } from '../../../lib/format';

const reviewTabs = [
    { key: '', label: 'All' },
    { key: 'flagged', label: 'Flagged for review' },
    { key: 'reviewed', label: 'Reviewed' },
    { key: 'normal', label: 'Normal' },
];

export default function Index({ attempts, stats, filters, quizzes, learners }) {
    const [search, setSearch] = useState(filters.search);
    const [loading, setLoading] = useState(false);
    const first = useRef(true);

    const apply = (next) => {
        const params = { ...filters, search, ...next };
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        router.get('/admin/monitoring', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => apply({ search }), 350);
        return () => clearTimeout(t);
    }, [search]);

    const hasFilters = filters.search || filters.quiz || filters.learner || filters.review || filters.status || filters.from || filters.to;

    return (
        <AppLayout title="Anti-Cheating Monitoring">
            <PageHeader title="Anti-cheating monitoring" description="Tab-switch activity recorded during quizzes, and attempts flagged for your review." />

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Tab switches" value={stats.tab_switches} icon={Eye} tone="indigo" hint={`Avg ${stats.average_switches} per attempt`} />
                <StatCard label="With switches" value={stats.with_switches} icon={ShieldCheck} tone="sky" hint={`of ${stats.attempts} attempts`} />
                <StatCard label="Flagged for review" value={stats.flagged} icon={ShieldAlert} tone="amber" />
                <StatCard label="Reviewed" value={stats.reviewed} icon={CheckCircle2} tone="green" />
            </div>

            <p className="mt-4 flex gap-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 ring-1 ring-indigo-100">
                <Info className="size-4 shrink-0 translate-y-0.5" aria-hidden />
                Leaving the quiz page is not proof of cheating (it can be a notification, a locked phone, or a weak connection). Flags only mark attempts for a
                closer look; scores are never changed.
            </p>

            <Card className="mt-6">
                <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 py-2" role="tablist" aria-label="Review status">
                    {reviewTabs.map((t) => (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={filters.review === t.key}
                            onClick={() => apply({ review: t.key })}
                            className={cx(
                                'min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold transition',
                                filters.review === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="relative xl:col-span-2">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input type="search" placeholder="Search learner or quiz…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search" />
                    </div>
                    <Select value={filters.quiz} onChange={(e) => apply({ quiz: e.target.value })} aria-label="Filter by quiz">
                        <option value="">All quizzes</option>
                        {quizzes.map((q) => (
                            <option key={q.id} value={q.id}>
                                {q.title} ({q.quiz_code})
                            </option>
                        ))}
                    </Select>
                    <Select value={filters.learner} onChange={(e) => apply({ learner: e.target.value })} aria-label="Filter by learner">
                        <option value="">All learners</option>
                        {learners.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                    </Select>
                    <Select value={filters.status} onChange={(e) => apply({ status: e.target.value })} aria-label="Filter by attempt status">
                        <option value="">All statuses</option>
                        <option value="completed">Completed</option>
                        <option value="timed_out">Timed out</option>
                        <option value="in_progress">In progress</option>
                    </Select>
                    <Input type="date" value={filters.from} onChange={(e) => apply({ from: e.target.value })} aria-label="From date" title="From date" />
                    <Input type="date" value={filters.to} onChange={(e) => apply({ to: e.target.value })} aria-label="To date" title="To date" />
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            icon={X}
                            onClick={() => {
                                setSearch('');
                                router.get('/admin/monitoring', {}, { preserveState: true, replace: true });
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    {attempts.data.length === 0 ? (
                        <EmptyState
                            icon={ShieldCheck}
                            title={filters.review === 'flagged' ? 'No flagged attempts.' : 'No attempts found.'}
                            description={hasFilters ? 'Try different filters.' : 'Activity appears here once learners take quizzes.'}
                        />
                    ) : (
                        <>
                            <div className="relative hidden overflow-x-auto xl:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-3 py-3">Learner</th>
                                            <th className="px-3 py-3">Quiz</th>
                                            <th className="px-3 py-3 text-center">Tab switches</th>
                                            <th className="px-3 py-3 text-center">Warnings</th>
                                            <th className="px-3 py-3">Attempt</th>
                                            <th className="px-3 py-3 text-right">Score</th>
                                            <th className="px-3 py-3">Review</th>
                                            <th className="px-3 py-3">Date</th>
                                            <th className="px-3 py-3">
                                                <span className="sr-only">Inspect</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {attempts.data.map((a) => (
                                            <tr key={a.id} className={cx('hover:bg-slate-50', a.review_status === 'flagged' && 'bg-amber-50/40')}>
                                                <td className="px-3 py-3">
                                                    <p className="font-semibold text-slate-900">{a.learner.name}</p>
                                                    <p className="text-xs text-slate-500">{a.learner.email}</p>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <p className="font-medium text-slate-800">{a.quiz.title}</p>
                                                    <p className="font-mono text-xs text-violet-700">{a.quiz.quiz_code}</p>
                                                </td>
                                                <td className="px-3 py-3 text-center text-base font-extrabold tabular-nums">{a.tab_switch_count}</td>
                                                <td className="px-3 py-3 text-center font-bold tabular-nums">{a.warning_count}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="text-xs text-slate-500">#{a.attempt_number}</span>
                                                        <StatusBadge status={a.status} />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right font-bold whitespace-nowrap tabular-nums">
                                                    {a.status === 'in_progress' ? '—' : `${a.score}/${a.total_questions} · ${formatPercent(a.percentage)}`}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <ReviewBadge status={a.review_status} />
                                                </td>
                                                <td className="max-w-28 px-3 py-3 text-xs text-slate-600">{formatDate(a.completed_at ?? a.started_at)}</td>
                                                <td className="px-3 py-3 text-right">
                                                    <Link href={`/admin/results/${a.id}#activity`} className="font-semibold whitespace-nowrap text-indigo-600 hover:text-indigo-500">
                                                        Inspect
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <ul className="divide-y divide-slate-100 xl:hidden">
                                {attempts.data.map((a) => (
                                    <li key={a.id} className={a.review_status === 'flagged' ? 'bg-amber-50/40' : undefined}>
                                        <Link href={`/admin/results/${a.id}#activity`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{a.learner.name}</p>
                                                <p className="truncate text-sm text-slate-500">
                                                    {a.quiz.title} · <span className="font-mono text-violet-700">{a.quiz.quiz_code}</span> · #{a.attempt_number}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-bold tabular-nums">
                                                        {a.tab_switch_count} switch{a.tab_switch_count === 1 ? '' : 'es'} · {a.warning_count} warning{a.warning_count === 1 ? '' : 's'}
                                                    </span>
                                                    <ReviewBadge status={a.review_status} />
                                                    <StatusBadge status={a.status} />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {a.status !== 'in_progress' && `Score ${a.score}/${a.total_questions} (${formatPercent(a.percentage)}) · `}
                                                    {formatDate(a.completed_at ?? a.started_at)}
                                                </p>
                                            </div>
                                            <ChevronRight className="size-5 shrink-0 text-slate-400" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
                <Pagination paginator={attempts} />
            </Card>
        </AppLayout>
    );
}
