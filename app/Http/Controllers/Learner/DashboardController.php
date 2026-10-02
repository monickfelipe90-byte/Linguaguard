<?php

namespace App\Http\Controllers\Learner;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Services\QuizEngine;
use App\Support\Present;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, QuizEngine $engine): Response
    {
        $user = $request->user();
        $engine->expireOverdueAttempts($user->id);

        $attempts = QuizAttempt::with('quiz')->where('user_id', $user->id)->get();
        $finished = $attempts->filter->isFinished();

        $inProgressQuizIds = $attempts->where('status', QuizAttempt::STATUS_IN_PROGRESS)->pluck('id', 'quiz_id');
        $finishedQuizIds = $finished->pluck('quiz_id')->unique();

        $available = Quiz::where('is_active', true)
            ->whereHas('quizQuestions')
            ->withCount('quizQuestions as questions_count')
            ->latest('id')
            ->get()
            ->map(fn (Quiz $quiz) => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'description' => $quiz->description,
                'quiz_code' => $quiz->quiz_code,
                'time_limit' => $quiz->time_limit,
                'passing_score' => $quiz->passing_score,
                'questions_count' => $quiz->questions_count,
                'in_progress_attempt' => $inProgressQuizIds->get($quiz->id),
                'completed' => $finishedQuizIds->contains($quiz->id),
                'can_retry' => $quiz->allow_retry,
            ]);

        return Inertia::render('Learner/Dashboard', [
            'stats' => [
                'average_score' => $finished->count() ? round($finished->avg('percentage'), 2) : null,
                'completed_quizzes' => $finishedQuizIds->count(),
                'passed_quizzes' => $finished->filter->passed()->pluck('quiz_id')->unique()->count(),
                'total_attempts' => $finished->count(),
            ],
            'availableQuizzes' => $available,
            'recentAttempts' => $attempts->sortByDesc('id')->take(5)->values()
                ->map(fn ($a) => Present::attempt($a)),
        ]);
    }
}
