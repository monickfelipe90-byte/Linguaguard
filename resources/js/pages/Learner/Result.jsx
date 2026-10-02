import { CheckCircle2, Clock3, Home, RotateCcw, Trophy, TrendingUp, XCircle } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { Card, LinkButton, cx } from '../../components/ui';
import AnswerReview from '../../components/AnswerReview';
import { formatDate, formatDuration, formatPercent } from '../../lib/format';

export default function Result({ attempt, review, canRetry }) {
    const correct = review.filter((r) => r.is_correct).length;
    const incorrect = attempt.total_questions - correct;
    const passed = attempt.passed;
    const pct = Math.max(0, Math.min(100, attempt.percentage));

    return (
        <AppLayout title="Quiz Result">
            <div className="mx-auto max-w-4xl space-y-6">
                <Card className="overflow-hidden">
                    <div
                        className={cx(
                            'animate-pop relative p-6 text-center text-white sm:p-10',
                            passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-600 to-violet-700',
                        )}
                    >
                        <p className="text-sm font-bold tracking-[0.25em] text-white/80">QUIZ COMPLETED</p>
                        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{attempt.quiz.title}</h1>

                        <div className="relative mx-auto mt-6 size-40 sm:size-48">
                            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="52"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(pct / 100) * 326.7} 326.7`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-extrabold tabular-nums sm:text-5xl">{formatPercent(attempt.percentage)}</span>
                                <span className="text-sm font-semibold text-white/80">Percentage</span>
                            </div>
                        </div>

                        <p className="mt-6 text-lg font-semibold">
                            Score: <span className="text-2xl font-extrabold tabular-nums">{attempt.score} / {attempt.total_questions}</span>
                        </p>
                        <p
                            className={cx(
                                'mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-extrabold',
                                passed ? 'bg-white text-emerald-700' : 'bg-white text-indigo-700',
                            )}
                        >
                            {passed ? <Trophy className="size-5" /> : <TrendingUp className="size-5" />}
                            {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                        </p>
                        {attempt.status === 'timed_out' && (
                            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-white/90">
                                <Clock3 className="size-4" /> Time ran out — your quiz was submitted automatically.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 divide-slate-100 border-t border-slate-100 sm:grid-cols-4 sm:divide-x">
                        <Metric icon={CheckCircle2} tone="text-emerald-600" label="Correct" value={correct} />
                        <Metric icon={XCircle} tone="text-rose-600" label="Incorrect" value={incorrect} />
                        <Metric icon={Trophy} tone="text-amber-600" label="Passing score" value={formatPercent(attempt.quiz.passing_score)} />
                        <Metric icon={Clock3} tone="text-sky-600" label="Time taken" value={formatDuration(attempt.duration_seconds)} />
                    </div>
                    <p className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500">
                        Attempt {attempt.attempt_number} · Finished {formatDate(attempt.completed_at)}
                    </p>
                </Card>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <LinkButton href="/learner" variant="secondary" size="lg" icon={Home}>
                        Back to dashboard
                    </LinkButton>
                    {canRetry && (
                        <LinkButton href={`/quiz/${attempt.quiz.quiz_code}`} size="lg" icon={RotateCcw}>
                            Try again
                        </LinkButton>
                    )}
                </div>

                <AnswerReview review={review} />
            </div>
        </AppLayout>
    );
}

function Metric({ icon: Icon, tone, label, value }) {
    return (
        <div className="flex flex-col items-center gap-1 p-4 text-center">
            <Icon className={cx('size-5', tone)} />
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{value}</p>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
        </div>
    );
}
