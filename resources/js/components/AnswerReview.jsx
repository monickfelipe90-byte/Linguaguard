import { useState } from 'react';
import { CheckCircle2, Lightbulb, MinusCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, cx } from './ui';
import { HighlightedSentence } from './quiz';

/**
 * Question-by-question review of a finished attempt.
 */
export default function AnswerReview({ review }) {
    const [filter, setFilter] = useState('all');
    const correct = review.filter((r) => r.is_correct).length;

    const shown = review.filter((r) => (filter === 'all' ? true : filter === 'correct' ? r.is_correct : !r.is_correct));

    const tabs = [
        { key: 'all', label: `All (${review.length})` },
        { key: 'correct', label: `Correct (${correct})` },
        { key: 'incorrect', label: `Incorrect (${review.length - correct})` },
    ];

    return (
        <Card>
            <CardHeader title="Question review" description="Every question with the correct answer and explanation." />
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 py-2" role="tablist">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={filter === t.key}
                        onClick={() => setFilter(t.key)}
                        className={cx(
                            'min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold transition',
                            filter === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {shown.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">No questions in this view.</p>
            ) : (
                <ol className="divide-y divide-slate-100">
                    {shown.map((r) => (
                        <li key={r.question_id} className="p-5">
                            <div className="flex items-start gap-3">
                                {r.is_correct ? (
                                    <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-500" aria-label="Correct" />
                                ) : r.selected_answer ? (
                                    <XCircle className="mt-0.5 size-6 shrink-0 text-rose-500" aria-label="Incorrect" />
                                ) : (
                                    <MinusCircle className="mt-0.5 size-6 shrink-0 text-slate-400" aria-label="Not answered" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Question {r.number}</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">
                                        <HighlightedSentence sentence={r.contextual_sentence} word={r.target_word} />
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">{r.question_text}</p>

                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <div
                                            className={cx(
                                                'rounded-xl px-3 py-2 text-sm ring-1',
                                                r.is_correct ? 'bg-emerald-50 ring-emerald-200' : r.selected_answer ? 'bg-rose-50 ring-rose-200' : 'bg-slate-50 ring-slate-200',
                                            )}
                                        >
                                            <span className="text-slate-500">Your answer: </span>
                                            <strong className="text-slate-900">{r.selected_text ?? 'Not answered'}</strong>
                                        </div>
                                        {!r.is_correct && (
                                            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm ring-1 ring-emerald-200">
                                                <span className="text-slate-500">Correct answer: </span>
                                                <strong className="text-emerald-800">{r.correct_text}</strong>
                                            </div>
                                        )}
                                    </div>

                                    {r.explanation && (
                                        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                                            <Lightbulb className="size-4 shrink-0 translate-y-0.5 text-amber-600" />
                                            <span>{r.explanation}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
