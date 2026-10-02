import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { CheckCircle2, ClipboardList, Lightbulb, Pencil, Trash2 } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, Badge, Button, Card, CardHeader, EmptyState, LinkButton, PageHeader, cx } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/Modal';
import { CategoryBadge, DifficultyBadge, HighlightedSentence } from '../../../components/quiz';
import { formatDate, formatPercent } from '../../../lib/format';

export default function Show({ question, quizzes }) {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const destroy = () =>
        router.delete(`/admin/questions/${question.id}`, {
            onStart: () => setDeleting(true),
            onFinish: () => {
                setDeleting(false);
                setConfirming(false);
            },
        });

    const options = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d };
    const accuracy = question.quiz_answers_count ? (question.correct_answers_count / question.quiz_answers_count) * 100 : null;

    return (
        <AppLayout title="Question Details">
            <PageHeader
                title="Question details"
                back={<BackLink href="/admin/questions">Question bank</BackLink>}
                actions={
                    <>
                        <LinkButton href={`/admin/questions/${question.id}/edit`} variant="secondary" icon={Pencil}>
                            Edit
                        </LinkButton>
                        <Button variant="danger-soft" icon={Trash2} onClick={() => setConfirming(true)}>
                            Delete
                        </Button>
                    </>
                }
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-5 sm:p-6">
                        <div className="flex flex-wrap gap-2">
                            <CategoryBadge category={question.category} />
                            <DifficultyBadge difficulty={question.difficulty} />
                        </div>
                        <p className="mt-4 text-xl leading-relaxed font-semibold text-slate-900">
                            <HighlightedSentence sentence={question.contextual_sentence} word={question.target_word} />
                        </p>
                        <p className="mt-3 text-slate-600">{question.question_text}</p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {Object.entries(options).map(([key, text]) => {
                                const correct = key === question.correct_answer;
                                return (
                                    <div
                                        key={key}
                                        className={cx(
                                            'flex items-center gap-3 rounded-xl p-3 ring-1',
                                            correct ? 'bg-emerald-50 ring-emerald-300' : 'bg-white ring-slate-200',
                                        )}
                                    >
                                        <span
                                            className={cx(
                                                'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold',
                                                correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600',
                                            )}
                                        >
                                            {key}
                                        </span>
                                        <span className="flex-1 font-semibold text-slate-800">{text}</span>
                                        {correct && <CheckCircle2 className="size-5 text-emerald-600" aria-label="Correct answer" />}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                            <Lightbulb className="size-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-bold text-amber-900">Explanation</p>
                                <p className="mt-1 text-sm text-amber-900/90">{question.explanation || 'No explanation provided.'}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Created by</dt>
                                <dd className="text-right font-semibold text-slate-800">{question.creator?.name ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Created</dt>
                                <dd className="text-right font-semibold text-slate-800">{formatDate(question.created_at)}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Last updated</dt>
                                <dd className="text-right font-semibold text-slate-800">{formatDate(question.updated_at)}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Times answered</dt>
                                <dd className="text-right font-semibold text-slate-800">{question.quiz_answers_count}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Answered correctly</dt>
                                <dd className="text-right font-semibold text-slate-800">{formatPercent(accuracy)}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card>
                        <CardHeader title="Used in quizzes" icon={ClipboardList} />
                        {quizzes.length === 0 ? (
                            <EmptyState title="Not in any quiz yet." className="py-8" />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {quizzes.map((q) => (
                                    <li key={q.id}>
                                        <Link href={`/admin/quizzes/${q.id}`} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                                            <span className="min-w-0 truncate font-semibold text-slate-800">{q.title}</span>
                                            <Badge tone={q.is_active ? 'green' : 'slate'}>{q.quiz_code}</Badge>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>

            <ConfirmDialog
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={destroy}
                processing={deleting}
                title="Delete question?"
                message={
                    <>
                        <p>Are you sure you want to delete this question?</p>
                        {quizzes.length > 0 && <p className="mt-2 text-amber-700">It will also be removed from {quizzes.length} quiz(zes).</p>}
                        {question.quiz_answers_count > 0 && (
                            <p className="mt-2 text-rose-700">Learners have already answered it, so the server will keep it to protect their results.</p>
                        )}
                    </>
                }
            />
        </AppLayout>
    );
}
