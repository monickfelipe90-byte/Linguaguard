import { useCallback, useEffect, useRef, useState } from 'react';

function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function newEventId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Detects when the learner leaves the quiz page (Visibility API) and reports it
 * to the server, which decides the count, warnings and flag. Returns the latest
 * server-confirmed state plus the warning to show when the learner comes back.
 *
 * Not counted: reloading or navigating away from the page itself, and moving
 * between questions (that never hides the page).
 */
export default function useTabMonitor({ attemptId, monitoring }) {
    const enabled = !!monitoring?.enabled;
    const [state, setState] = useState({
        tab_switch_count: monitoring?.tab_switch_count ?? 0,
        warning_count: monitoring?.warning_count ?? 0,
        max_tab_switches: monitoring?.max_tab_switches ?? 3,
        flagged: !!monitoring?.flagged,
    });
    const [warning, setWarning] = useState(null);
    const pendingId = useRef(null);
    const unloading = useRef(false);

    const send = useCallback(
        (payload, keepalive = false) =>
            fetch(`/attempts/${attemptId}/activity`, {
                method: 'POST',
                credentials: 'same-origin',
                keepalive,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(payload),
            }).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        [attemptId],
    );

    useEffect(() => {
        if (!enabled) return;

        const markUnloading = () => {
            unloading.current = true;
        };

        const onVisibility = async () => {
            if (unloading.current) return;

            if (document.visibilityState === 'hidden') {
                if (pendingId.current) return; // already away
                pendingId.current = newEventId();
                send({ state: 'hidden', event_id: pendingId.current }, true).catch(() => {});
                return;
            }

            const id = pendingId.current;
            if (!id) return;
            pendingId.current = null;

            try {
                const result = await send({ state: 'visible', event_id: id });
                setState({
                    tab_switch_count: result.tab_switch_count,
                    warning_count: result.warning_count,
                    max_tab_switches: result.max_tab_switches,
                    flagged: result.flagged,
                });
                setWarning({ ...result, key: id });
            } catch {
                // The server could not be reached; still remind the learner.
                setWarning({ offline: true, key: id });
            }
        };

        window.addEventListener('beforeunload', markUnloading);
        window.addEventListener('pagehide', markUnloading);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('beforeunload', markUnloading);
            window.removeEventListener('pagehide', markUnloading);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, send]);

    return { enabled, ...state, warning, dismissWarning: () => setWarning(null) };
}
