<?php

namespace App\Support;

use App\Models\QuizAttempt;
use App\Services\QuizEngine;

/**
 * Shapes models into the plain arrays the React pages receive, so that only
 * intended fields (never passwords or unrevealed answers) reach the browser.
 */
class Present
{
    public static function attempt(QuizAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'attempt_number' => $attempt->attempt_number,
            'score' => $attempt->score,
            'total_questions' => $attempt->total_questions,
            'percentage' => $attempt->percentage,
            'status' => $attempt->status,
            'passed' => $attempt->passed(),
            'tab_switch_count' => (int) $attempt->tab_switch_count,
            'warning_count' => (int) $attempt->warning_count,
            'review_status' => $attempt->review_status ?? QuizAttempt::REVIEW_NORMAL,
            'flagged_at' => $attempt->flagged_at?->toIso8601String(),
            'reviewed_at' => $attempt->reviewed_at?->toIso8601String(),
            'started_at' => $attempt->started_at?->toIso8601String(),
            'completed_at' => $attempt->completed_at?->toIso8601String(),
            'duration_seconds' => $attempt->started_at && $attempt->completed_at
                ? (int) $attempt->started_at->diffInSeconds($attempt->completed_at)
                : null,
            'quiz' => $attempt->relationLoaded('quiz') ? [
                'id' => $attempt->quiz->id,
                'title' => $attempt->quiz->title,
                'quiz_code' => $attempt->quiz->quiz_code,
                'passing_score' => $attempt->quiz->passing_score,
                'time_limit' => $attempt->quiz->time_limit,
            ] : null,
            'learner' => $attempt->relationLoaded('user') ? [
                'id' => $attempt->user->id,
                'name' => $attempt->user->name,
                'email' => $attempt->user->email,
            ] : null,
        ];
    }

    /**
     * Full answer review for a finished attempt (learner result page and admin detail).
     */
    public static function review(QuizAttempt $attempt, QuizEngine $engine): array
    {
        $answers = $attempt->answers()->get()->keyBy('question_id');

        return $engine->orderedQuestions($attempt)->values()->map(function ($question, $index) use ($answers) {
            $answer = $answers->get($question->id);

            return [
                'number' => $index + 1,
                'question_id' => $question->id,
                'question_text' => $question->question_text,
                'contextual_sentence' => $question->contextual_sentence,
                'target_word' => $question->target_word,
                'category' => $question->category,
                'options' => $question->options(),
                'selected_answer' => $answer?->selected_answer,
                'selected_text' => $question->optionText($answer?->selected_answer),
                'correct_answer' => $question->correct_answer,
                'correct_text' => $question->optionText($question->correct_answer),
                'is_correct' => (bool) $answer?->is_correct,
                'explanation' => $question->explanation,
            ];
        })->all();
    }
}
