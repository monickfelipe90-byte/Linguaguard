import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { BarChart3, ChevronRight, Search, TrendingUp, X } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { Button, Card, CardHeader, EmptyState, Input, PageHeader, Select } from '../../../components/ui';
import Pagination from '../../../components/Pagination';
import PerformancePanel from '../../../components/PerformancePanel';
import { ResultBadge, ReviewBadge, StatusBadge } from '../../../components/quiz';
import { formatDate, formatPercent } from '../../../lib/format';

export default function Index({ attempts, performance, recentPerformance, filters, quizzes, learners }) {
    const [search, setSearch] = useState(filters.search);
    const [loading, setLoading] = useState(false);
    const first = useRef(true);

    const apply = (next) => {
        const params = { ...filters, search, ...next };
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        router.get('/admin/results', params, {
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

    const hasFilters = filters.search || filters.quiz || filters.learner || filters.status;

    return (
        <AppLayout title="Results">
            <PageHeader title="Learner results" description="Every recorded quiz attempt with its score and status." />

            <PerformancePanel
                performance={performance}
                title={hasFilters ? 'Performance (filtered)' : 'Performance overview'}
                description={hasFilters ? 'Finished attempts that match your filters.' : 'Based on all finished quiz attempts.'}
            />

            <Card className="mt-6">
                <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-[1fr_200px_200px_170px_auto]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input type="search" placeholder="Search learner or quiz…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search results" />
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
                        {learners.length === 0 && <option disabled>No learners found.</option>}
                        {learners.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                    </Select>
                    <Select value={filters.status} onChange={(e) => apply({ status: e.target.value })} aria-label="Filter by status">
                        <option value="">All statuses</option>
                        <option value="completed">Completed</option>
                        <option value="timed_out">Timed out</option>
                        <option value="in_progress">In progress</option>
                    </Select>
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            icon={X}
                            onClick={() => {
                                setSearch('');
                                router.get('/admin/results', {}, { preserveState: true, replace: true });
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    {attempts.data.length === 0 ? (
                        <EmptyState icon={BarChart3} title="No results available." description={hasFilters ? 'Try different filters.' : 'Results appear when learners take quizzes.'} />
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="relative hidden overflow-x-auto lg:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-5 py-3">Learner</th>
                                            <th className="px-5 py-3">Quiz</th>
                                            <th className="px-5 py-3 text-center">Attempt</th>
                                            <th className="px-5 py-3 text-right">Score</th>
                                            <th className="px-5 py-3 text-right">Percentage</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3">Date</th>
                                            <th className="px-5 py-3">
                                                <span className="sr-only">View</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {attempts.data.map((a) => (
                                            <tr key={a.id} className="hover:bg-slate-50">
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-slate-900">{a.learner.name}</p>
                                                    <p className="text-xs text-slate-500">{a.learner.email}</p>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <p className="font-medium text-slate-800">{a.quiz.title}</p>
                                                    <p className="font-mono text-xs text-violet-700">{a.quiz.quiz_code}</p>
                                                </td>
                                                <td className="px-5 py-3 text-center tabular-nums">#{a.attempt_number}</td>
                                                <td className="px-5 py-3 text-right font-bold tabular-nums">
                                                    {a.status === 'in_progress' ? '—' : `${a.score}/${a.total_questions}`}
                                                </td>
                                                <td className="px-5 py-3 text-right font-bold tabular-nums">{a.status === 'in_progress' ? '—' : formatPercent(a.percentage)}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        <StatusBadge status={a.status} />
                                                        <ResultBadge attempt={a} />
{a.review_status !== 'normal' && <ReviewBadge status={a.review_status} />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDate(a.completed_at ?? a.started_at)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <Link href={`/admin/results/${a.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile / tablet cards */}
                            <ul className="divide-y divide-slate-100 lg:hidden">
                                {attempts.data.map((a) => (
                                    <li key={a.id}>
                                        <Link href={`/admin/results/${a.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{a.learner.name}</p>
                                                <p className="truncate text-sm text-slate-500">
                                                    {a.quiz.title} · #{a.attempt_number}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    {a.status !== 'in_progress' && (
                                                        <span className="text-sm font-bold tabular-nums">
                                                            {a.score}/{a.total_questions} · {formatPercent(a.percentage)}
                                                        </span>
                                                    )}
                                                    <StatusBadge status={a.status} />
                                                    <ResultBadge attempt={a} />
{a.review_status !== 'normal' && <ReviewBadge status={a.review_status} />}
                                                </div>
                                                <p className="mt-1 text-xs text-slate-400">{formatDate(a.completed_at ?? a.started_at)}</p>
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

            <Card className="mt-6">
                <CardHeader title="Recent performance" description="The latest finished attempts." icon={TrendingUp} />
                {recentPerformance.length === 0 ? (
                    <EmptyState icon={TrendingUp} title="No quiz attempts yet." />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {recentPerformance.map((a) => (
                            <li key={a.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">
                                        {a.learner.name} <span className="font-normal text-slate-500">· {a.quiz.title}</span>
                                    </p>
                                    <p className="text-xs text-slate-400">{formatDate(a.completed_at)}</p>
                                </div>
                                <div className="flex w-full items-center gap-3 sm:w-72">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full ${a.passed ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${a.percentage}%` }} />
                                    </div>
                                    <span className="w-14 text-right text-sm font-bold tabular-nums">{formatPercent(a.percentage)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AppLayout>
    );
}
