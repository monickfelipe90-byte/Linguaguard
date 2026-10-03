import { router } from '@inertiajs/react';
import { Eye, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './ui';

/**
 * Shown when the learner returns to the quiz page after leaving it.
 * Wording is deliberately neutral: leaving the page is recorded, not judged.
 */
export default function TabWarningModal({ warning, onClose }) {
    if (!warning) return null;

    const max = warning.max_tab_switches;
    const count = warning.tab_switch_count;
    const flagged = warning.flagged && !warning.offline;
    const remaining = max - count;

    let title;
    let body;

    if (warning.offline) {
        title = 'You left the quiz page';
        body = 'Please remain on the quiz page until you finish.';
    } else if (warning.finished) {
        title = 'Your quiz was submitted';
        body = `You left the quiz page ${count} times, so your quiz was submitted automatically and marked for your teacher to review. Your answers so far were saved.`;
    } else if (flagged) {
        title = 'Attempt marked for teacher review';
        body = `You have left the quiz page ${count} times. This attempt will be reviewed by your teacher. You can keep answering. Please remain on the quiz page until you finish.`;
    } else {
        title = `Warning ${warning.warning_count}`;
        body = `You have left the quiz page. This activity has been recorded. Please remain on the quiz page until you finish.`;
    }

    return (
        <Modal open onClose={warning.finished ? undefined : onClose} labelledBy="tab-warning-title">
            <div className="text-center">
                <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${flagged ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {flagged ? <ShieldAlert className="size-7" aria-hidden /> : <Eye className="size-7" aria-hidden />}
                </span>
                <h2 id="tab-warning-title" className="mt-4 text-xl font-extrabold text-slate-900">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{body}</p>

                {!warning.offline && !warning.finished && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                        <p className="font-semibold text-slate-800">
                            Times you left the quiz page: <span className="tabular-nums">{count}</span> / {max}
                        </p>
                        {!flagged && remaining > 0 && (
                            <p className="mt-0.5 text-slate-500">
                                {remaining === 1 ? 'One more time' : `${remaining} more times`} will mark this attempt for teacher review.
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-6">
                    {warning.finished ? (
                        <Button size="lg" className="w-full" onClick={() => router.visit(warning.result_url)}>
                            View my results
                        </Button>
                    ) : (
                        <Button size="lg" className="w-full" onClick={onClose} autoFocus>
                            Back to the quiz
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
