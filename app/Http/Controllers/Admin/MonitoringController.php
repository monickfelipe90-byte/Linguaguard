<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizActivityLog;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\QuizEngine;
use App\Support\Present;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Anti-cheating monitoring: tab-switch statistics, flagged attempts and reviews.
 */
class MonitoringController extends Controller
{
    public function index(Request $request, QuizEngine $engine): Response
    {
        $engine->expireOverdueAttempts();

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'quiz' => ['nullable', 'integer'],
            'learner' => ['nullable', 'integer'],
            'review' => ['nullable', Rule::in(QuizAttempt::REVIEW_STATUSES)],
            'status' => ['nullable', Rule::in([QuizAttempt::STATUS_IN_PROGRESS, QuizAttempt::STATUS_COMPLETED, QuizAttempt::STATUS_TIMED_OUT])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = QuizAttempt::query()
            ->when($filters['quiz'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.quiz_id', $v))
            ->when($filters['learner'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.user_id', $v))
            ->when($filters['review'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.review_status', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.status', $v))
            ->when($filters['from'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.started_at', '>=', $v.' 00:00:00'))
            ->when($filters['to'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.started_at', '<=', $v.' 23:59:59'))
            ->when($filters['search'] ?? null, function ($q, $term) {
                $q->where(function ($q) use ($term) {
                    $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"))
                        ->orWhereHas('quiz', fn ($z) => $z->where('title', 'like', "%{$term}%")->orWhere('quiz_code', 'like', "%{$term}%"));
                });
            });

        $attempts = (clone $query)->with(['quiz', 'user'])
            // Flagged first, then the most tab switches, then the newest.
            ->orderByRaw("CASE quiz_attempts.review_status WHEN 'flagged' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END")
            ->orderByDesc('quiz_attempts.tab_switch_count')
            ->orderByDesc('quiz_attempts.id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($a) => Present::attempt($a));

        $stats = (clone $query)->toBase()
            ->selectRaw('COUNT(*) as attempts')
            ->selectRaw('COALESCE(SUM(tab_switch_count), 0) as tab_switches')
            ->selectRaw('SUM(CASE WHEN tab_switch_count > 0 THEN 1 ELSE 0 END) as with_switches')
            ->selectRaw("SUM(CASE WHEN review_status = 'flagged' THEN 1 ELSE 0 END) as flagged")
            ->selectRaw("SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) as reviewed")
            ->first();

        return Inertia::render('Admin/Monitoring/Index', [
            'attempts' => $attempts,
            'stats' => [
                'attempts' => (int) $stats->attempts,
                'tab_switches' => (int) $stats->tab_switches,
                'with_switches' => (int) $stats->with_switches,
                'flagged' => (int) $stats->flagged,
                'reviewed' => (int) $stats->reviewed,
                'average_switches' => $stats->attempts ? round($stats->tab_switches / $stats->attempts, 2) : 0,
            ],
            'filters' => [
                'search' => $filters['search'] ?? '',
                'quiz' => isset($filters['quiz']) ? (string) $filters['quiz'] : '',
                'learner' => isset($filters['learner']) ? (string) $filters['learner'] : '',
                'review' => $filters['review'] ?? '',
                'status' => $filters['status'] ?? '',
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
            ],
            'quizzes' => Quiz::orderBy('title')->get(['id', 'title', 'quiz_code']),
            'learners' => User::learners()->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    /**
     * Marks a flagged attempt as reviewed. The score and answers are never changed.
     */
    public function review(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($attempt->review_status !== QuizAttempt::REVIEW_FLAGGED) {
            return back()->with('error', 'Only attempts flagged for review can be marked as reviewed.');
        }

        DB::transaction(function () use ($attempt, $request, $data) {
            $locked = QuizAttempt::whereKey($attempt->id)->lockForUpdate()->first();
            $locked->review_status = QuizAttempt::REVIEW_REVIEWED;
            $locked->reviewed_at = now();
            $locked->reviewed_by = $request->user()->id;
            $locked->save();

            QuizActivityLog::record($locked, QuizActivityLog::REVIEWED, array_filter([
                'reviewer_id' => $request->user()->id,
                'reviewer' => $request->user()->name,
                'notes' => isset($data['notes']) ? trim($data['notes']) : null,
            ]));
        });

        return back()->with('success', 'Attempt marked as reviewed. The learner\'s score was not changed.');
    }
}
