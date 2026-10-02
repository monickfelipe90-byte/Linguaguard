import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { BookMarked, Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { Button, Card, EmptyState, Input, LinkButton, PageHeader, Select } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/Modal';
import Pagination from '../../../components/Pagination';
import { CategoryBadge, DifficultyBadge, HighlightedSentence } from '../../../components/quiz';

export default function Index({ questions, filters, categories, difficulties }) {
    const [search, setSearch] = useState(filters.search);
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const first = useRef(true);

    const apply = (next) => {
        const params = { ...filters, search, ...next };
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        router.get('/admin/questions', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    // Debounced search as the admin types.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => apply({ search }), 350);
        return () => clearTimeout(t);
    }, [search]);

    const destroy = () => {
        router.delete(`/admin/questions/${toDelete.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => {
                setDeleting(false);
                setToDelete(null);
            },
        });
    };

    const hasFilters = filters.search || filters.category || filters.difficulty;

    return (
        <AppLayout title="Question Bank">
            <PageHeader
                title="Question bank"
                description="All contextual parts-of-speech questions available for quizzes."
                actions={
                    <LinkButton href="/admin/questions/create" icon={Plus}>
                        Add question
                    </LinkButton>
                }
            />

            <Card>
                <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_200px_180px_auto]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="search"
                            placeholder="Search sentence, word or question…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            aria-label="Search questions"
                        />
                    </div>
                    <Select value={filters.category} onChange={(e) => apply({ category: e.target.value })} aria-label="Filter by category">
                        <option value="">All categories</option>
                        {categories.map((c) => (
                            <option key={c}>{c}</option>
                        ))}
                    </Select>
                    <Select value={filters.difficulty} onChange={(e) => apply({ difficulty: e.target.value })} aria-label="Filter by difficulty">
                        <option value="">All difficulties</option>
                        {difficulties.map((d) => (
                            <option key={d}>{d}</option>
                        ))}
                    </Select>
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            icon={X}
                            onClick={() => {
                                setSearch('');
                                router.get('/admin/questions', {}, { preserveState: true, replace: true });
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    {questions.data.length === 0 ? (
                        <EmptyState
                            icon={BookMarked}
                            title="No questions found."
                            description={hasFilters ? 'Try a different search or filter.' : 'Start building your question bank.'}
                            action={
                                !hasFilters && (
                                    <LinkButton href="/admin/questions/create" icon={Plus} size="sm">
                                        Add question
                                    </LinkButton>
                                )
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {questions.data.map((q) => (
                                <li key={q.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                    <Link href={`/admin/questions/${q.id}`} className="min-w-0 flex-1">
                                        <p className="text-slate-800">
                                            <HighlightedSentence sentence={q.contextual_sentence} word={q.target_word} />
                                        </p>
                                        <p className="mt-1 truncate text-sm text-slate-500">{q.question_text}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <CategoryBadge category={q.category} />
                                            <DifficultyBadge difficulty={q.difficulty} />
                                            <span className="text-xs text-slate-500">
                                                Answer: <strong className="text-slate-700">{q.correct_answer}</strong> · In {q.quizzes_count} quiz
                                                {q.quizzes_count === 1 ? '' : 'zes'}
                                            </span>
                                        </div>
                                    </Link>
                                    <div className="flex shrink-0 gap-1">
                                        <LinkButton href={`/admin/questions/${q.id}`} variant="ghost" size="sm" icon={Eye} aria-label="View question">
                                            <span className="sm:sr-only">View</span>
                                        </LinkButton>
                                        <LinkButton href={`/admin/questions/${q.id}/edit`} variant="ghost" size="sm" icon={Pencil} aria-label="Edit question">
                                            <span className="sm:sr-only">Edit</span>
                                        </LinkButton>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            icon={Trash2}
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            onClick={() => setToDelete(q)}
                                            aria-label="Delete question"
                                        >
                                            <span className="sm:sr-only">Delete</span>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <Pagination paginator={questions} />
            </Card>

            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={destroy}
                processing={deleting}
                title="Delete question?"
                message={
                    toDelete && (
                        <>
                            <p>Are you sure you want to delete this question?</p>
                            <p className="mt-2 font-semibold text-slate-800">“{toDelete.contextual_sentence}”</p>
                            {toDelete.quizzes_count > 0 && (
                                <p className="mt-2 text-amber-700">
                                    It will also be removed from {toDelete.quizzes_count} quiz{toDelete.quizzes_count === 1 ? '' : 'zes'}.
                                </p>
                            )}
                            {toDelete.quiz_answers_count > 0 && (
                                <p className="mt-2 text-rose-700">Learners have already answered it, so the server will keep it to protect their results.</p>
                            )}
                        </>
                    )
                }
            />
        </AppLayout>
    );
}
