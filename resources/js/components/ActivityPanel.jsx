import { useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock3, Eye, EyeOff, Flag, PlayCircle, Send, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardHeader, Button, EmptyState, TextArea, Field, cx } from './ui';
import { Modal } from './Modal';
import { ReviewBadge } from './quiz';
import { formatDate } from '../lib/format';

const events = {
    quiz_started: { label: 'Quiz started', icon: PlayCircle, tone: 'bg-indigo-100 text-indigo-600' },
    tab_switch: { label: 'Left the quiz page (tab switch)', icon: EyeOff, tone: 'bg-amber-100 text-amber-700' },
    returned_to_quiz: { label: 'Returned to the quiz', icon: Eye, tone: 'bg-sky-100 text-sky-700' },
    warning_displayed: { label: 'Warning displayed', icon: AlertTriangle, tone: 'bg-amber-100 text-amber-700' },
    attempt_flagged: { label: 'Attempt flagged for review', icon: Flag, tone: 'bg-rose-100 text-rose-700' },
    auto_submitted: { label: 'Automatically submitted', icon: Zap, tone: 'bg-rose-100 text-rose-700' },
    quiz_submitted: { label: 'Quiz submitted', icon: Send, tone: 'bg-emerald-100 text-emerald-700' },
    quiz_timed_out: { label: 'Quiz timed out', icon: Clock3, tone: 'bg-slate-200 text-slate-700' },
    attempt_reviewed: { label: 'Marked as reviewed', icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700' },
};

function describe(log) {
    const d = log.details || {};
    switch (log.type) {
        case 'quiz_started':
            return `Attempt #${d.attempt_number ?? '?'} · ${d.total_questions ?? '?'} questions`;
        case 'tab_switch':
            return `Switch #${d.count}`;
        case 'warning_displayed':
            return `Warning ${d.warning} (flag at ${d.of})`;
        case 'attempt_flagged':
            return `${d.tab_switches} tab switches reached the limit of ${d.threshold}`;
        case 'quiz_submitted':
        case 'quiz_timed_out':
            return `Score ${d.score}/${d.total_questions}${d.reason ? ' · automatic submission' : ''}`;
        case 'attempt_reviewed':
            return `By ${d.reviewer ?? 'admin'}${d.notes ? ` — “${d.notes}”` : ''}`;
        default:
            return null;
    }
}

export default function ActivityPanel({ attempt, activity, monitoring, reviewer }) {
    const [confirm, setConfirm] = useState(false);
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    const markReviewed = () =>
        router.post(
            `/admin/results/${attempt.id}/review`,
            { notes },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => {
                    setBusy(false);
                    setConfirm(false);
                    setNotes('');
                },
            },
        );

    return (
        <Card id="activity" className="mt-6 scroll-mt-20">
            <CardHeader
                title="Anti-cheating activity"
                description={monitoring.tab_detection_enabled ? `Tab-switch detection on · flag at ${monitoring.max_tab_switches}` : 'Tab-switch detection is off for this quiz'}
                icon={ShieldAlert}
                action={
                    attempt.review_status === 'flagged' && (
                        <Button variant="success" size="sm" icon={ShieldCheck} onClick={() => setConfirm(true)}>
                            Mark as reviewed
                        </Button>
                    )
                }
            />

            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                <Metric label="Tab switches" value={attempt.tab_switch_count} />
                <Metric label="Warnings shown" value={attempt.warning_count} />
                <div className="bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">Review status</p>
                    <div className="mt-1">
                        <ReviewBadge status={attempt.review_status} />
                    </div>
                </div>
                <div className="bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">{attempt.reviewed_at ? 'Reviewed' : 'Flagged'}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {attempt.reviewed_at ? formatDate(attempt.reviewed_at) : formatDate(attempt.flagged_at)}
                    </p>
                    {attempt.reviewed_at && reviewer && <p className="text-xs text-slate-500">by {reviewer}</p>}
                </div>
            </div>

            {activity.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No activity recorded." description="This attempt was taken before activity logging was added." className="py-8" />
            ) : (
                <ol className="space-y-0 p-5">
                    {activity.map((log, i) => {
                        const e = events[log.type] ?? { label: log.type, icon: ShieldCheck, tone: 'bg-slate-100 text-slate-600' };
                        const detail = describe(log);
                        return (
                            <li key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                                {i < activity.length - 1 && <span className="absolute top-9 bottom-0 left-[1.0625rem] w-px bg-slate-200" aria-hidden />}
                                <span className={cx('relative grid size-9 shrink-0 place-items-center rounded-full', e.tone)}>
                                    <e.icon className="size-4" aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="font-semibold text-slate-900">{e.label}</p>
                                    {detail && <p className="text-sm break-words text-slate-600">{detail}</p>}
                                    <p className="text-xs text-slate-400">{formatDate(log.at)}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            <Modal open={confirm} onClose={busy ? undefined : () => setConfirm(false)} labelledBy="review-title">
                <h2 id="review-title" className="text-lg font-bold text-slate-900">
                    Mark this attempt as reviewed?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                    This records that you looked at {attempt.learner.name}’s activity. The score ({attempt.score}/{attempt.total_questions}) and answers will not change.
                </p>
                <Field label="Notes (optional)" htmlFor="review-notes" className="mt-4">
                    <TextArea id="review-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Talked with the learner — phone notification." />
                </Field>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="success" icon={ShieldCheck} onClick={markReviewed} loading={busy}>
                        Mark as reviewed
                    </Button>
                </div>
            </Modal>
        </Card>
    );
}

function Metric({ label, value }) {
    return (
        <div className="bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
        </div>
    );
}
