import { CheckCircle2, Clock3, Hourglass, Trophy, TrendingUp } from 'lucide-react';
import { Badge, cx } from './ui';
import { difficultyTones, formatPercent, statusLabels, statusTones } from '../lib/format';

/**
 * Renders a sentence with the first case-insensitive occurrence of the target word highlighted.
 */
export function HighlightedSentence({ sentence, word, className, markClassName }) {
    const index = word ? sentence.toLowerCase().indexOf(word.toLowerCase()) : -1;

    if (index === -1) return <span className={className}>{sentence}</span>;

    return (
        <span className={className}>
            {sentence.slice(0, index)}
            <mark className={cx('rounded-md bg-amber-200/90 px-1 py-0.5 font-bold text-slate-900 decoration-amber-500 underline-offset-4', markClassName)}>
                {sentence.slice(index, index + word.length)}
            </mark>
            {sentence.slice(index + word.length)}
        </span>
    );
}

export function StatusBadge({ status }) {
    const icons = { in_progress: Hourglass, completed: CheckCircle2, timed_out: Clock3 };
    return (
        <Badge tone={statusTones[status]} icon={icons[status]}>
            {statusLabels[status] ?? status}
        </Badge>
    );
}

export function ResultBadge({ attempt }) {
    if (attempt.status === 'in_progress') return null;
    return attempt.passed ? (
        <Badge tone="green" icon={Trophy}>
            Passed
        </Badge>
    ) : (
        <Badge tone="red" icon={TrendingUp}>
            Needs improvement
        </Badge>
    );
}

export function DifficultyBadge({ difficulty }) {
    return <Badge tone={difficultyTones[difficulty] ?? 'slate'}>{difficulty}</Badge>;
}

export function CategoryBadge({ category }) {
    return <Badge tone="violet">{category}</Badge>;
}

export function ScoreBar({ percentage, passing, className }) {
    const value = Math.max(0, Math.min(100, Number(percentage) || 0));
    const passed = passing === undefined || value >= passing;
    return (
        <div className={cx('flex items-center gap-2', className)}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={cx('h-full rounded-full', passed ? 'bg-emerald-500' : 'bg-rose-400')} style={{ width: `${value}%` }} />
            </div>
            <span className="w-14 text-right text-sm font-bold text-slate-700 tabular-nums">{formatPercent(value)}</span>
        </div>
    );
}
