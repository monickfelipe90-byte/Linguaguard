import { ArrowDownRight, ArrowUpRight, CheckCircle2, Gauge, Hash, XCircle } from 'lucide-react';
import { Card, CardHeader } from './ui';
import { formatPercent } from '../lib/format';

/**
 * Score and result monitoring: totals, average/highest/lowest and pass/fail counts.
 */
export default function PerformancePanel({ performance, title = 'Performance overview', description = 'Based on finished quiz attempts.' }) {
    const p = performance;
    const items = [
        { label: 'Total attempts', value: p.total_attempts, icon: Hash, tone: 'text-indigo-600 bg-indigo-50' },
        { label: 'Average score', value: formatPercent(p.average_score), icon: Gauge, tone: 'text-violet-600 bg-violet-50' },
        { label: 'Highest score', value: formatPercent(p.highest_score), icon: ArrowUpRight, tone: 'text-sky-600 bg-sky-50' },
        { label: 'Lowest score', value: formatPercent(p.lowest_score), icon: ArrowDownRight, tone: 'text-amber-600 bg-amber-50' },
        { label: 'Passed', value: p.passed, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
        { label: 'Failed', value: p.failed, icon: XCircle, tone: 'text-rose-600 bg-rose-50' },
    ];

    return (
        <Card>
            <CardHeader title={title} description={description} icon={Gauge} />
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 bg-white p-4">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.tone}`}>
                            <item.icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-500">{item.label}</p>
                            <p className="text-lg font-extrabold text-slate-900 tabular-nums">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            {p.total_attempts > 0 && (
                <div className="px-5 py-4">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                        <span>Pass rate</span>
                        <span>{formatPercent(p.pass_rate)}</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-rose-200">
                        <div className="h-full bg-emerald-500" style={{ width: `${p.pass_rate}%` }} />
                    </div>
                </div>
            )}
        </Card>
    );
}
