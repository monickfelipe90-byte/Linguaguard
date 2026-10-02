import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ClipboardList, Eye, Pencil, Plus, Power, Search, Timer, Trash2, Users } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { Badge, Button, Card, EmptyState, Input, LinkButton, PageHeader, Select } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/Modal';
import Pagination from '../../../components/Pagination';
import { formatPercent } from '../../../lib/format';

export default function Index({ quizzes, filters }) {
    const [search, setSearch] = useState(filters.search);
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [busy, setBusy] = useState(null);
    const first = useRef(true);

    const apply = (next) => {
        const params = { ...filters, search, ...next };
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        router.get('/admin/quizzes', params, {
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

    const toggle = (quiz) =>
        router.patch(`/admin/quizzes/${quiz.id}/toggle`, {}, { preserveScroll: true, onStart: () => setBusy(quiz.id), onFinish: () => setBusy(null) });

    const destroy = () =>
        router.delete(`/admin/quizzes/${toDelete.id}`, {
            preserveScroll: true,
            onStart: () => setBusy(toDelete.id),
            onFinish: () => {
                setBusy(null);
                setToDelete(null);
            },
        });

    return (
        <AppLayout title="Quizzes">
            <PageHeader
                title="Quiz management"
                description="Create quizzes, share their codes, and control when learners can join."
                actions={
                    <LinkButton href="/admin/quizzes/create" icon={Plus}>
                        Create quiz
                    </LinkButton>
                }
            />

            <Card>
                <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_200px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input type="search" placeholder="Search title or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search quizzes" />
                    </div>
                    <Select value={filters.status} onChange={(e) => apply({ status: e.target.value })} aria-label="Filter by status">
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </Select>
                </div>

                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    {quizzes.data.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="No quizzes available."
                            description={filters.search || filters.status ? 'Try a different search or filter.' : 'Create your first quiz from the question bank.'}
                            action={
                                <LinkButton href="/admin/quizzes/create" icon={Plus} size="sm">
                                    Create quiz
                                </LinkButton>
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {quizzes.data.map((quiz) => (
                                <li key={quiz.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                                    <Link href={`/admin/quizzes/${quiz.id}`} className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-bold text-slate-900">{quiz.title}</p>
                                            <Badge tone={quiz.is_active ? 'green' : 'slate'}>{quiz.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                            <span className="rounded-md bg-violet-50 px-2 py-0.5 font-mono font-bold tracking-wider text-violet-700">{quiz.quiz_code}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <ClipboardList className="size-4" /> {quiz.questions_count} questions
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Timer className="size-4" /> {quiz.time_limit} min
                                            </span>
                                            <span>Pass {formatPercent(quiz.passing_score)}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="size-4" /> {quiz.attempts_count} attempts
                                            </span>
                                        </div>
                                    </Link>
                                    <div className="flex flex-wrap gap-1">
                                        <Button
                                            variant={quiz.is_active ? 'secondary' : 'soft'}
                                            size="sm"
                                            icon={Power}
                                            loading={busy === quiz.id}
                                            onClick={() => toggle(quiz)}
                                        >
                                            {quiz.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <LinkButton href={`/admin/quizzes/${quiz.id}`} variant="ghost" size="sm" icon={Eye} aria-label="View quiz">
                                            <span className="md:sr-only">View</span>
                                        </LinkButton>
                                        <LinkButton href={`/admin/quizzes/${quiz.id}/edit`} variant="ghost" size="sm" icon={Pencil} aria-label="Edit quiz">
                                            <span className="md:sr-only">Edit</span>
                                        </LinkButton>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            icon={Trash2}
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            onClick={() => setToDelete(quiz)}
                                            aria-label="Delete quiz"
                                        >
                                            <span className="md:sr-only">Delete</span>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <Pagination paginator={quizzes} />
            </Card>

            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={destroy}
                processing={busy === toDelete?.id}
                title="Delete quiz?"
                message={
                    toDelete && (
                        <>
                            <p>
                                Are you sure you want to delete <strong>{toDelete.title}</strong>?
                            </p>
                            {toDelete.attempts_count > 0 ? (
                                <p className="mt-2 text-rose-700">This quiz has learner attempts, so it will be kept to protect their results. Deactivate it instead.</p>
                            ) : (
                                <p className="mt-2">Its question assignments will be removed. The questions stay in the bank.</p>
                            )}
                        </>
                    )
                }
            />
        </AppLayout>
    );
}
