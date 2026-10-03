<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\QuizEngine;
use App\Support\PerformanceStats;
use App\Support\Present;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(QuizEngine $engine): Response
    {
        $engine->expireOverdueAttempts();

        $performance = PerformanceStats::summary();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'learners' => User::learners()->count(),
                'questions' => Question::count(),
                'quizzes' => Quiz::count(),
                'active_quizzes' => Quiz::where('is_active', true)->count(),
                'attempts' => QuizAttempt::count(),
                'average_score' => $performance['average_score'],
            ],
            'performance' => $performance,
            'recentAttempts' => QuizAttempt::with(['quiz', 'user'])
                ->latest('id')->take(6)->get()
                ->map(fn ($a) => Present::attempt($a)),
            'monitoring' => [
                'flagged' => QuizAttempt::where('review_status', QuizAttempt::REVIEW_FLAGGED)->count(),
                'reviewed' => QuizAttempt::where('review_status', QuizAttempt::REVIEW_REVIEWED)->count(),
                'tab_switches' => (int) QuizAttempt::sum('tab_switch_count'),
                'with_switches' => QuizAttempt::where('tab_switch_count', '>', 0)->count(),
                'recent' => QuizAttempt::with(['quiz', 'user'])
                    ->where(fn ($q) => $q->where('tab_switch_count', '>', 0)->orWhere('review_status', '!=', QuizAttempt::REVIEW_NORMAL))
                    ->orderByRaw("CASE review_status WHEN 'flagged' THEN 0 ELSE 1 END")
                    ->latest('id')->take(5)->get()
                    ->map(fn ($a) => Present::attempt($a)),
            ],
            'recentQuestions' => Question::latest('id')->take(5)
                ->get(['id', 'target_word', 'contextual_sentence', 'category', 'difficulty', 'created_at']),
            'recentQuizzes' => Quiz::withCount('quizQuestions as questions_count')
                ->latest('id')->take(5)
                ->get(['id', 'title', 'quiz_code', 'is_active', 'created_at']),
        ]);
    }
}
