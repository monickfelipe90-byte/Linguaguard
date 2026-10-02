import { CheckCircle2, ClipboardList, Hourglass, Mail, Timer, User, XCircle } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, Card, EmptyState, PageHeader, StatCard } from '../../../components/ui';
import AnswerReview from '../../../components/AnswerReview';
import { ResultBadge, StatusBadge } from '../../../components/quiz';
import { formatDate, formatDuration, formatPercent } from '../../../lib/format';

export default function Show({ attempt, review, answeredCount }) {
    const correct = review.filter((r) => r.is_correct).length;
    const finished = attempt.status !== 'in_progress';

    return (
        <AppLayout title="Result Details">
            <PageHeader title="Result details" back={<BackLink href="/admin/results">Results</BackLink>} />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-5">
                    <h2 className="mb-4 text-xs font-bold tracking-wide text-slate-500 uppercase">Learner</h2>
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                        <User className="size-4 text-slate-400" /> {attempt.learner.name}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm break-all text-slate-600">
                        <Mail className="size-4 shrink-0 text-slate-400" /> {attempt.learner.email}
                    </p>
                </Card>
                <Card className="p-5">
                    <h2 className="mb-4 text-xs font-bold tracking-wide text-slate-500 uppercase">Quiz</h2>
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                        <ClipboardList className="size-4 text-slate-400" /> {attempt.quiz.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Code <span className="font-mono font-bold text-violet-700">{attempt.quiz.quiz_code}</span> · Pass {formatPercent(attempt.quiz.passing_score)} ·{' '}
                        {attempt.quiz.time_limit} min
                    </p>
                </Card>
                <Card className="p-5">
                    <h2 className="mb-4 text-xs font-bold tracking-wide text-slate-500 uppercase">Attempt #{attempt.attempt_number}</h2>
                    <div className="flex flex-wrap gap-2">
                        <StatusBadge status={attempt.status} />
                        <ResultBadge attempt={attempt} />
                    </div>
                    <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Started</dt>
                            <dd className="font-semibold">{formatDate(attempt.started_at)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Completed</dt>
                            <dd className="font-semibold">{formatDate(attempt.completed_at)}</dd>
                        </div>
                    </dl>
                </Card>
            </div>

            {finished ? (
                <>
                    <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Score" value={`${attempt.score} / ${attempt.total_questions}`} icon={ClipboardList} tone="indigo" />
                        <StatCard label="Percentage" value={formatPercent(attempt.percentage)} icon={CheckCircle2} tone={attempt.passed ? 'green' : 'red'} />
                        <StatCard label="Correct / incorrect" value={`${correct} / ${attempt.total_questions - correct}`} icon={XCircle} tone="amber" hint={`${answeredCount} answered`} />
                        <StatCard label="Completion time" value={formatDuration(attempt.duration_seconds)} icon={Timer} tone="sky" />
                    </div>
                    <div className="mt-6">
                        <AnswerReview review={review} />
                    </div>
                </>
            ) : (
                <Card className="mt-6">
                    <EmptyState
                        icon={Hourglass}
                        title="This attempt is still in progress."
                        description={`The learner has answered ${answeredCount} of ${attempt.total_questions} questions. The full review appears once the attempt is finished.`}
                    />
                </Card>
            )}
        </AppLayout>
    );
}
