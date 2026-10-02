<?php

namespace App\Support;

use App\Models\QuizAttempt;
use Illuminate\Database\Eloquent\Builder;

/**
 * Score/result monitoring computed only from recorded, finished attempts.
 */
class PerformanceStats
{
    /**
     * @param  Builder<QuizAttempt>|null  $query  optional pre-filtered attempts query
     */
    public static function summary(?Builder $query = null): array
    {
        $base = ($query ? clone $query : QuizAttempt::query())
            ->finished()
            ->join('quizzes', 'quizzes.id', '=', 'quiz_attempts.quiz_id');

        $row = (clone $base)->toBase()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('AVG(quiz_attempts.percentage) as average')
            ->selectRaw('MAX(quiz_attempts.percentage) as highest')
            ->selectRaw('MIN(quiz_attempts.percentage) as lowest')
            ->selectRaw('SUM(CASE WHEN quiz_attempts.percentage >= quizzes.passing_score THEN 1 ELSE 0 END) as passed')
            ->first();

        $total = (int) $row->total;
        $passed = (int) $row->passed;

        return [
            'total_attempts' => $total,
            'average_score' => $total ? round((float) $row->average, 2) : null,
            'highest_score' => $total ? round((float) $row->highest, 2) : null,
            'lowest_score' => $total ? round((float) $row->lowest, 2) : null,
            'passed' => $passed,
            'failed' => $total - $passed,
            'pass_rate' => $total ? round($passed / $total * 100, 1) : null,
        ];
    }
}
