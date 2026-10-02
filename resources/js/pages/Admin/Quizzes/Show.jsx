import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Check, ClipboardList, Copy, ListOrdered, Pencil, Power, RefreshCw, Shuffle, Timer, Trash2, Trophy, Users } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, Badge, Button, Card, CardHeader, EmptyState, LinkButton, PageHeader } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/Modal';
import PerformancePanel from '../../../components/PerformancePanel';
import { CategoryBadge, DifficultyBadge, HighlightedSentence, ResultBadge, StatusBadge } from '../../../components/quiz';
import { formatDate, formatPercent } from '../../../lib/format';

export default function Show({ quiz, questions, performance, recentAttempts, attemptsCount }) {
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    const run = (method, url) =>
        router[method](url, {}, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                setConfirm(null);
            },
        });

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(quiz.quiz_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <AppLayout title={quiz.title}>
            <PageHeader
                title={quiz.title}
                description={quiz.description}
                back={<BackLink href="/admin/quizzes">Quizzes</BackLink>}
                actions={
                    <>
                        <Button variant={quiz.is_active ? 'secondary' : 'success'} icon={Power} loading={busy && confirm === null} onClick={() => run('patch', `/admin/quizzes/${quiz.id}/toggle`)}>
                            {quiz.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <LinkButton href={`/admin/quizzes/${quiz.id}/edit`} variant="secondary" icon={Pencil}>
                            Edit
                        </LinkButton>
                        <Button variant="danger-soft" icon={Trash2} onClick={() => setConfirm('delete')}>
                            Delete
                        </Button>
                    </>
                }
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="overflow-hidden lg:col-span-1">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-center text-white">
                        <p className="text-sm font-semibold text-indigo-100">Quiz code</p>
                        <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.2em]">{quiz.quiz_code}</p>
                        <div className="mt-4 flex justify-center gap-2">
                            <Button variant="white" size="sm" icon={copied ? Check : Copy} onClick={copyCode}>
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button variant="white" size="sm" icon={RefreshCw} onClick={() => setConfirm('code')}>
                                New code
                            </Button>
                        </div>
                    </div>
                    <dl className="divide-y divide-slate-100 text-sm">
                        <Row label="Status">
                            <Badge tone={quiz.is_active ? 'green' : 'slate'}>{quiz.is_active ? 'Active' : 'Inactive'}</Badge>
                        </Row>
                        <Row label="Time limit" icon={Timer}>
                            {quiz.time_limit} minutes
                        </Row>
                        <Row label="Passing score" icon={Trophy}>
                            {formatPercent(quiz.passing_score)}
                        </Row>
                        <Row label="Questions" icon={ClipboardList}>
                            {questions.length}
                        </Row>
                        <Row label="Randomize questions" icon={Shuffle}>
                            {quiz.randomize_questions ? 'Yes' : 'No'}
                        </Row>
                        <Row label="Randomize choices" icon={Shuffle}>
                            {quiz.randomize_choices ? 'Yes' : 'No'}
                        </Row>
                        <Row label="Retries allowed" icon={RefreshCw}>
                            {quiz.allow_retry ? 'Yes' : 'No'}
                        </Row>
                        <Row label="Attempts" icon={Users}>
                            {attemptsCount}
                        </Row>
                        <Row label="Created">{formatDate(quiz.created_at)}</Row>
                        <Row label="Created by">{quiz.creator?.name ?? '—'}</Row>
                    </dl>
                    {quiz.instructions && (
                        <div className="border-t border-slate-100 p-5">
                            <p className="text-sm font-bold text-slate-700">Instructions</p>
                            <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{quiz.instructions}</p>
                        </div>
                    )}
                </Card>

                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader
                            title="Questions"
                            description={`${questions.length} question${questions.length === 1 ? '' : 's'} in this order`}
                            icon={ListOrdered}
                            action={
                                <LinkButton href={`/admin/quizzes/${quiz.id}/edit#questions`} variant="soft" size="sm" icon={Pencil}>
                                    Manage questions
                                </LinkButton>
                            }
                        />
                        {questions.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="This quiz has no questions."
                                description="Learners cannot start it until you add questions."
                                action={
                                    <LinkButton href={`/admin/quizzes/${quiz.id}/edit#questions`} size="sm">
                                        Add questions
                                    </LinkButton>
                                }
                            />
                        ) : (
                            <ol className="divide-y divide-slate-100">
                                {questions.map((q, i) => (
                                    <li key={q.id}>
                                        <Link href={`/admin/questions/${q.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">{i + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-slate-800">
                                                    <HighlightedSentence sentence={q.contextual_sentence} word={q.target_word} />
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    <CategoryBadge category={q.category} />
                                                    <DifficultyBadge difficulty={q.difficulty} />
                                                    <span className="text-xs text-slate-500">
                                                        Answer {q.correct_answer}: {q[`option_${q.correct_answer.toLowerCase()}`]}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    <PerformancePanel performance={performance} title="Quiz performance" />

                    <Card>
                        <CardHeader
                            title="Recent attempts"
                            icon={Users}
                            action={
                                <Link href={`/admin/results?quiz=${quiz.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                                    All results
                                </Link>
                            }
                        />
                        {recentAttempts.length === 0 ? (
                            <EmptyState icon={Users} title="No quiz attempts yet." />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {recentAttempts.map((a) => (
                                    <li key={a.id}>
                                        <Link href={`/admin/results/${a.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{a.learner.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    Attempt {a.attempt_number} · {formatDate(a.started_at)}
                                                </p>
                                            </div>
                                            {a.status === 'in_progress' ? (
                                                <StatusBadge status={a.status} />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold tabular-nums">
                                                        {a.score}/{a.total_questions} · {formatPercent(a.percentage)}
                                                    </span>
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
            </div>

            <ConfirmDialog
                open={confirm === 'delete'}
                onClose={() => setConfirm(null)}
                onConfirm={() => run('delete', `/admin/quizzes/${quiz.id}`)}
                processing={busy}
                title="Delete quiz?"
                message={
                    attemptsCount > 0 ? (
                        <p>
                            Are you sure you want to delete this quiz? It has {attemptsCount} learner attempt(s), so the server will keep it to protect their results — deactivate it instead.
                        </p>
                    ) : (
                        <p>Are you sure you want to delete this quiz? Its question assignments will be removed; the questions stay in the bank.</p>
                    )
                }
            />
            <ConfirmDialog
                open={confirm === 'code'}
                onClose={() => setConfirm(null)}
                onConfirm={() => run('patch', `/admin/quizzes/${quiz.id}/regenerate-code`)}
                processing={busy}
                tone="primary"
                confirmLabel="Generate new code"
                title="Generate a new quiz code?"
                message={<p>The current code {quiz.quiz_code} will stop working. Learners will need the new code to join.</p>}
            />
        </AppLayout>
    );
}

function Row({ label, icon: Icon, children }) {
    return (
        <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="flex items-center gap-2 text-slate-500">
                {Icon && <Icon className="size-4" />}
                {label}
            </dt>
            <dd className="text-right font-semibold text-slate-800">{children}</dd>
        </div>
    );
}
