export function formatDate(iso, withTime = true) {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
}

export function formatPercent(value) {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
    return m ? `${m}m ${s}s` : `${s}s`;
}

export function formatClock(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const statusLabels = {
    in_progress: 'In progress',
    completed: 'Completed',
    timed_out: 'Timed out',
};

export const statusTones = {
    in_progress: 'amber',
    completed: 'indigo',
    timed_out: 'slate',
};

export const difficultyTones = {
    Easy: 'green',
    Medium: 'amber',
    Hard: 'red',
};
