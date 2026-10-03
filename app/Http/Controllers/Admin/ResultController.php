<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\QuizEngine;
use App\Support\PerformanceStats;
use App\Support\Present;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ResultController extends Controller
{
    public function index(Request $request, QuizEngine $engine): Response
    {
        $engine->expireOverdueAttempts();

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'quiz' => ['nullable', 'integer'],
            'learner' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in([QuizAttempt::STATUS_IN_PROGRESS, QuizAttempt::STATUS_COMPLETED, QuizAttempt::STATUS_TIMED_OUT])],
        ]);

        $query = QuizAttempt::query()
            ->when($filters['quiz'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.quiz_id', $v))
            ->when($filters['learner'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.user_id', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('quiz_attempts.status', $v))
            ->when($filters['search'] ?? null, function ($q, $term) {
                $q->where(function ($q) use ($term) {
                    $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"))
                        ->orWhereHas('quiz', fn ($z) => $z->where('title', 'like', "%{$term}%")->orWhere('quiz_code', 'like', "%{$term}%"));
                });
            });

        $attempts = (clone $query)->with(['quiz', 'user'])
            ->latest('quiz_attempts.id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($a) => Present::attempt($a));

        $recent = QuizAttempt::finished()->with(['quiz', 'user'])
            ->latest('completed_at')->take(8)->get()
            ->map(fn ($a) => Present::attempt($a));

        return Inertia::render('Admin/Results/Index', [
            'attempts' => $attempts,
            'performance' => PerformanceStats::summary($query),
            'recentPerformance' => $recent,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'quiz' => isset($filters['quiz']) ? (string) $filters['quiz'] : '',
                'learner' => isset($filters['learner']) ? (string) $filters['learner'] : '',
                'status' => $filters['status'] ?? '',
            ],
            'quizzes' => Quiz::orderBy('title')->get(['id', 'title', 'quiz_code']),
            'learners' => User::learners()->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    public function show(QuizAttempt $attempt, QuizEngine $engine): Response
    {
        $engine->expireIfOverdue($attempt);
        $attempt->load(['quiz', 'user', 'reviewer:id,name']);

        return Inertia::render('Admin/Results/Show', [
            'attempt' => Present::attempt($attempt),
            'review' => $attempt->isFinished() ? Present::review($attempt, $engine) : [],
            'answeredCount' => $attempt->answers()->whereNotNull('selected_answer')->count(),
            'reviewer' => $attempt->reviewer?->name,
            'monitoring' => [
                'tab_detection_enabled' => $attempt->quiz->tab_detection_enabled,
                'max_tab_switches' => $attempt->quiz->max_tab_switches,
            ],
            'activity' => $attempt->activityLogs()->get(['id', 'event_type', 'details', 'created_at'])
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'type' => $log->event_type,
                    'details' => $log->details ?? [],
                    'at' => $log->created_at?->toIso8601String(),
                ]),
        ]);
    }
}
