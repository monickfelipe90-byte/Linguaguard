import { useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertCircle, ClipboardList, PlayCircle, RotateCcw, Timer, Trophy } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { BackLink, Button, Card, LinkButton } from '../../components/ui';
import { formatPercent } from '../../lib/format';

export default function QuizIntro({ quiz, unavailableReason, inProgressAttempt, previousAttempts }) {
    const [starting, setStarting] = useState(false);

    const start = () =>
        router.post(`/quiz/${quiz.quiz_code}/start`, {}, { onStart: () => setStarting(true), onFinish: () => setStarting(false) });

    const instructions = (quiz.instructions || '').split('\n').map((l) => l.trim()).filter(Boolean);

    return (
        <AppLayout title={quiz.title}>
            <div className="mx-auto max-w-3xl">
                <BackLink href="/join">Join a different quiz</BackLink>

                <Card className="mt-2 overflow-hidden">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white sm:p-8">
                        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 font-mono text-sm font-bold tracking-widest">{quiz.quiz_code}</p>
                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{quiz.title}</h1>
                        {quiz.description && <p className="mt-2 text-indigo-100">{quiz.description}</p>}
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        <Fact icon={ClipboardList} label="Questions" value={quiz.questions_count} />
                        <Fact icon={Timer} label="Time limit" value={`${quiz.time_limit} min`} />
                        <Fact icon={Trophy} label="Passing score" value={formatPercent(quiz.passing_score)} />
                    </div>

                    <div className="p-6 sm:p-8">
                        <h2 className="font-bold text-slate-900">Instructions</h2>
                        {instructions.length > 0 ? (
                            <ol className="mt-3 space-y-2">
                                {instructions.map((line, i) => (
                                    <li key={i} className="flex gap-3 text-slate-700">
                                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{i + 1}</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mt-2 text-slate-600">Read each sentence and choose the part of speech of the highlighted word.</p>
                        )}
                        <ul className="mt-5 space-y-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                            <li>• The timer starts when you press Start Quiz and keeps running even if you leave the page.</li>
                            <li>• You will see whether each answer is correct right after you submit it.</li>
                            <li>• When time runs out, your quiz is submitted automatically.</li>
                            {!quiz.allow_retry && <li className="font-semibold text-amber-700">• This quiz can only be taken once.</li>}
                            {quiz.tab_detection_enabled && (
                                <li>
                                    • Please stay on the quiz page. Leaving it (switching tabs or apps) is recorded and shown to your teacher. After{' '}
                                    {quiz.max_tab_switches} time{quiz.max_tab_switches === 1 ? '' : 's'}, the attempt is marked for teacher review
                                    {quiz.auto_submit_on_flag ? ' and submitted automatically' : ''}.
                                </li>
                            )}
                        </ul>

                        {unavailableReason ? (
                            <div className="mt-6 flex gap-3 rounded-xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200" role="alert">
                                <AlertCircle className="size-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">{unavailableReason}</p>
                                    <LinkButton href="/learner" variant="secondary" size="sm" className="mt-3">
                                        Back to dashboard
                                    </LinkButton>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6">
                                {previousAttempts > 0 && !inProgressAttempt && (
                                    <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                                        <RotateCcw className="size-4" /> You have taken this quiz {previousAttempts} time{previousAttempts === 1 ? '' : 's'}. This will be a new attempt.
                                    </p>
                                )}
                                <Button size="xl" className="w-full" icon={PlayCircle} loading={starting} onClick={start}>
                                    {starting ? 'Loading quiz…' : inProgressAttempt ? 'RESUME QUIZ' : 'START QUIZ'}
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}

function Fact({ icon: Icon, label, value }) {
    return (
        <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
            <Icon className="size-5 text-indigo-500" />
            <p className="text-lg font-extrabold text-slate-900 tabular-nums sm:text-xl">{value}</p>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
        </div>
    );
}
