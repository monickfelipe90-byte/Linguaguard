import { Link } from '@inertiajs/react';
import { ChevronRight, History as HistoryIcon, KeyRound } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { Card, EmptyState, LinkButton, PageHeader } from '../../components/ui';
import Pagination from '../../components/Pagination';
import { ResultBadge, StatusBadge } from '../../components/quiz';
import { formatDate, formatPercent } from '../../lib/format';

export default function History({ attempts }) {
    const href = (a) => (a.status === 'in_progress' ? `/attempts/${a.id}` : `/attempts/${a.id}/result`);

    return (
        <AppLayout title="Quiz History">
            <PageHeader title="Quiz history" description="All of your quiz attempts and results." />

            <Card>
                {attempts.data.length === 0 ? (
                    <EmptyState
                        icon={HistoryIcon}
                        title="No quiz attempts yet."
                        description="Join a quiz to see your results here."
                        action={
                            <LinkButton href="/join" icon={KeyRound} size="sm">
                                Join a quiz
                            </LinkButton>
                        }
                    />
                ) : (
                    <>
                        <div className="relative hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Quiz</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3 text-center">Attempt</th>
                                        <th className="px-5 py-3 text-right">Score</th>
                                        <th className="px-5 py-3 text-right">Percentage</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">
                                            <span className="sr-only">Open</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attempts.data.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-semibold text-slate-900">{a.quiz.title}</td>
                                            <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDate(a.completed_at ?? a.started_at)}</td>
                                            <td className="px-5 py-3 text-center tabular-nums">#{a.attempt_number}</td>
                                            <td className="px-5 py-3 text-right font-bold tabular-nums">{a.status === 'in_progress' ? '—' : `${a.score}/${a.total_questions}`}</td>
                                            <td className="px-5 py-3 text-right font-bold tabular-nums">{a.status === 'in_progress' ? '—' : formatPercent(a.percentage)}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    <StatusBadge status={a.status} />
                                                    <ResultBadge attempt={a} />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Link href={href(a)} className="font-semibold whitespace-nowrap text-indigo-600 hover:text-indigo-500">
                                                    {a.status === 'in_progress' ? 'Resume' : 'View result'}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="divide-y divide-slate-100 md:hidden">
                            {attempts.data.map((a) => (
                                <li key={a.id}>
                                    <Link href={href(a)} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-900">{a.quiz.title}</p>
                                            <p className="text-xs text-slate-500">
                                                Attempt #{a.attempt_number} · {formatDate(a.completed_at ?? a.started_at)}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                {a.status !== 'in_progress' && (
                                                    <span className="text-sm font-bold tabular-nums">
                                                        {a.score}/{a.total_questions} · {formatPercent(a.percentage)}
                                                    </span>
                                                )}
                                                <StatusBadge status={a.status} />
                                                <ResultBadge attempt={a} />
                                            </div>
                                        </div>
                                        <ChevronRight className="size-5 shrink-0 text-slate-400" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <Pagination paginator={attempts} />
            </Card>
        </AppLayout>
    );
}
