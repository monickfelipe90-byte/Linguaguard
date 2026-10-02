import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Flag, Hexagon, Lightbulb, Send, Square, Timer, Triangle, XCircle } from 'lucide-react';
import Flash from '../../components/Flash';
import { LogoMark } from '../../components/Logo';
import { ConfirmDialog } from '../../components/Modal';
import { Button, cx } from '../../components/ui';
import { HighlightedSentence } from '../../components/quiz';
import { formatClock } from '../../lib/format';

// Tile styles by screen position (the answer keys themselves may be shuffled by the server).
const tiles = [
    { bg: 'bg-violet-600', hover: 'hover:bg-violet-500', ring: 'ring-violet-300', icon: Triangle },
    { bg: 'bg-sky-600', hover: 'hover:bg-sky-500', ring: 'ring-sky-300', icon: Hexagon },
    { bg: 'bg-amber-500', hover: 'hover:bg-amber-400', ring: 'ring-amber-200', icon: Circle },
    { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-500', ring: 'ring-emerald-300', icon: Square },
];

export default function Play({ attempt, quiz, questions }) {
    const total = questions.length;
    const answeredCount = questions.filter((q) => q.answer).length;

    const [index, setIndex] = useState(() => {
        const firstOpen = questions.findIndex((q) => !q.answer);
        return firstOpen === -1 ? total - 1 : firstOpen;
    });
    const [selected, setSelected] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [confirmFinish, setConfirmFinish] = useState(false);

    const question = questions[Math.min(index, total - 1)];
    const answer = question.answer;
    const choice = selected[question.id];

    // ---- Timer: the server sends the remaining seconds; the browser only counts down for display. ----
    const deadline = useRef(Date.now() + attempt.remaining_seconds * 1000);
    const [remaining, setRemaining] = useState(attempt.remaining_seconds);
    const timedOut = useRef(false);

    useEffect(() => {
        deadline.current = Date.now() + attempt.remaining_seconds * 1000;
        setRemaining(attempt.remaining_seconds);
        // If the server said time was not up yet, re-arm the auto-submit.
        if (attempt.remaining_seconds > 0) timedOut.current = false;
    }, [attempt]);

    const finish = useCallback(
        (reason) => {
            router.post(`/attempts/${attempt.id}/finish`, reason ? { reason } : {}, {
                onStart: () => setFinishing(true),
                onFinish: () => setFinishing(false),
            });
        },
        [attempt.id],
    );

    useEffect(() => {
        const tick = () => {
            const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
            setRemaining(left);
            if (left <= 0 && !timedOut.current) {
                timedOut.current = true;
                finish('timeout');
            }
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [finish]);

    // ---- Answering ----
    const submitAnswer = () => {
        if (!choice || answer || submitting) return;
        router.post(
            `/attempts/${attempt.id}/answers`,
            { question_id: question.id, selected_answer: choice },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const go = (next) => setIndex(Math.max(0, Math.min(total - 1, next)));
    const isLast = index === total - 1;
    const allAnswered = answeredCount === total;

    // Keyboard: 1–4 choose, Enter submits / moves on, arrows navigate.
    useEffect(() => {
        const onKey = (e) => {
            if (confirmFinish || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const n = Number(e.key);
            if (!answer && n >= 1 && n <= question.choices.length) {
                setSelected((s) => ({ ...s, [question.id]: question.choices[n - 1].key }));
            } else if (e.key === 'Enter') {
                if (!answer) submitAnswer();
                else if (!isLast) go(index + 1);
            } else if (e.key === 'ArrowRight') go(index + 1);
            else if (e.key === 'ArrowLeft') go(index - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const correctChoice = useMemo(() => answer && question.choices.find((c) => c.key === answer.correct_answer), [answer, question]);
    const lowTime = remaining <= 60;
    const progress = (answeredCount / total) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 pb-28 text-white sm:pb-10">
            <Head title={`Q${index + 1} · ${quiz.title}`} />
            <Flash />

            {/* Top bar */}
            <header className="mx-auto flex max-w-4xl items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
                <LogoMark className="size-9 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold sm:text-base">{quiz.title}</p>
                    <p className="text-xs font-semibold text-indigo-200">
                        Question {index + 1} of {total} · {answeredCount} answered
                    </p>
                </div>
                <div
                    className={cx(
                        'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 font-mono text-lg font-extrabold tabular-nums shadow-sm transition-colors',
                        lowTime ? 'animate-pulse bg-rose-500 text-white' : 'bg-white text-indigo-700',
                    )}
                    role="timer"
                    aria-live={lowTime ? 'polite' : 'off'}
                    aria-label={`Time remaining ${formatClock(remaining)}`}
                >
                    <Timer className="size-5" aria-hidden />
                    {formatClock(remaining)}
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                {/* Progress */}
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={total} aria-label="Quiz progress">
                    <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                {/* Question navigator */}
                <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Questions">
                    {questions.map((q, i) => (
                        <button
                            key={q.id}
                            onClick={() => go(i)}
                            aria-label={`Question ${i + 1}${q.answer ? (q.answer.is_correct ? ', correct' : ', incorrect') : ''}`}
                            aria-current={i === index ? 'step' : undefined}
                            className={cx(
                                'grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold transition',
                                i === index && 'ring-2 ring-white ring-offset-2 ring-offset-indigo-600',
                                q.answer ? (q.answer.is_correct ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950') : 'bg-white/15 text-white hover:bg-white/25',
                            )}
                        >
                            {i + 1}
                        </button>
                    ))}
                </nav>

                {/* Question card */}
                <section key={question.id} className="animate-fade-up mt-4 rounded-3xl bg-white p-5 text-center text-slate-900 shadow-2xl shadow-indigo-950/30 sm:p-8">
                    <p className="text-xs font-bold tracking-widest text-violet-600 uppercase">Read the sentence</p>
                    <p className="mt-3 text-xl leading-relaxed font-semibold sm:text-2xl">
                        <HighlightedSentence sentence={question.contextual_sentence} word={question.target_word} markClassName="px-1.5" />
                    </p>
                    <p className="mt-4 text-base font-medium text-slate-600 sm:text-lg">{question.question_text}</p>
                </section>

                {/* Choices */}
                <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2" role="radiogroup" aria-label="Answer choices">
                    {question.choices.map((c, i) => {
                        const t = tiles[i];
                        const isChosen = answer ? answer.selected === c.key : choice === c.key;
                        const isCorrect = answer && answer.correct_answer === c.key;
                        const dim = answer && !isCorrect && !isChosen;
                        return (
                            <button
                                key={c.key}
                                role="radio"
                                aria-checked={isChosen}
                                disabled={!!answer || submitting}
                                onClick={() => setSelected((s) => ({ ...s, [question.id]: c.key }))}
                                className={cx(
                                    'relative flex min-h-16 items-center gap-3 rounded-2xl px-4 py-4 text-left text-lg font-bold text-white shadow-lg transition-all duration-200 sm:min-h-20',
                                    t.bg,
                                    !answer && t.hover,
                                    !answer && 'active:scale-[0.97]',
                                    isChosen && !answer && `scale-[1.02] ring-4 ${t.ring} ring-offset-2 ring-offset-indigo-600`,
                                    isChosen && answer && 'ring-4 ring-white ring-offset-2 ring-offset-indigo-600',
                                    dim && 'opacity-40',
                                    answer && 'cursor-default',
                                )}
                            >
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/15" aria-hidden>
                                    <t.icon className="size-5 fill-white/90" />
                                </span>
                                <span className="flex-1 break-words">{c.text}</span>
                                {answer && isCorrect && <CheckCircle2 className="size-7 shrink-0" aria-label="Correct answer" />}
                                {answer && isChosen && !isCorrect && <XCircle className="size-7 shrink-0" aria-label="Your answer" />}
                                <span className="absolute top-1.5 right-2 hidden text-xs font-semibold text-white/60 sm:block" aria-hidden>
                                    {i + 1}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Feedback */}
                {answer && (
                    <div
                        key={`fb-${question.id}`}
                        className={cx(
                            'mt-4 rounded-2xl p-5 text-slate-900 shadow-lg',
                            answer.is_correct ? 'animate-pop bg-emerald-50 ring-2 ring-emerald-300' : 'animate-shake bg-rose-50 ring-2 ring-rose-300',
                        )}
                        role="status"
                        aria-live="polite"
                    >
                        <p className={cx('flex items-center gap-2 text-2xl font-extrabold', answer.is_correct ? 'text-emerald-700' : 'text-rose-700')}>
                            {answer.is_correct ? <CheckCircle2 className="size-7" /> : <XCircle className="size-7" />}
                            {answer.is_correct ? 'Correct!' : answer.selected ? 'Incorrect' : 'Not answered'}
                        </p>
                        {!answer.is_correct && correctChoice && (
                            <p className="mt-2 text-slate-700">
                                The correct answer is <strong className="text-emerald-700">{correctChoice.text}</strong>.
                            </p>
                        )}
                        {answer.explanation && (
                            <p className="mt-3 flex gap-2 rounded-xl bg-white/70 p-3 text-sm text-slate-700">
                                <Lightbulb className="size-4 shrink-0 translate-y-0.5 text-amber-500" />
                                <span>{answer.explanation}</span>
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Action bar (fixed on phones for easy thumb reach) */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-indigo-950/80 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
                <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 sm:px-6">
                    <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" icon={ArrowLeft} onClick={() => go(index - 1)} disabled={index === 0}>
                        <span className="hidden min-[400px]:inline">Previous</span>
                    </Button>
                    <div className="flex flex-1 justify-end gap-2">
                        {!answer ? (
                            <Button variant="white" size="lg" icon={Send} onClick={submitAnswer} disabled={!choice} loading={submitting} className="flex-1 sm:flex-none">
                                {submitting ? 'Checking…' : 'Submit answer'}
                            </Button>
                        ) : !isLast ? (
                            <Button variant="white" size="lg" onClick={() => go(index + 1)} className="flex-1 sm:flex-none">
                                Next question <ArrowRight className="size-5" />
                            </Button>
                        ) : null}
                        {(isLast || allAnswered) && (
                            <Button
                                variant={allAnswered ? 'success' : 'secondary'}
                                size="lg"
                                icon={Flag}
                                onClick={() => (allAnswered ? finish() : setConfirmFinish(true))}
                                loading={finishing}
                                className="flex-1 sm:flex-none"
                            >
                                {finishing ? 'Submitting…' : 'Finish quiz'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={confirmFinish}
                onClose={() => setConfirmFinish(false)}
                onConfirm={() => {
                    setConfirmFinish(false);
                    finish();
                }}
                tone="primary"
                confirmLabel="Submit quiz"
                title="Finish the quiz now?"
                message={
                    <p>
                        You have answered {answeredCount} of {total} questions. Unanswered questions will be marked incorrect.
                    </p>
                }
            />
        </div>
    );
}
