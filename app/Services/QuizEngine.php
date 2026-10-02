<?php

namespace App\Services;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAnswer;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * All quiz rules live here: eligibility, attempt creation, answer checking,
 * the server-side timer and final scoring. Nothing score-related is ever
 * taken from the client.
 */
class QuizEngine
{
    /** Allowance for network latency when an answer is sent right at the deadline. */
    public const ANSWER_GRACE_SECONDS = 3;

    /**
     * Returns a learner-facing reason why the quiz cannot be started, or null.
     */
    public function unavailableReason(User $user, Quiz $quiz): ?string
    {
        if (! $quiz->is_active) {
            return 'This quiz is currently unavailable.';
        }

        if (! $quiz->quizQuestions()->exists()) {
            return 'This quiz has no questions yet. Please check with your teacher.';
        }

        if ($this->inProgressAttempt($user, $quiz)) {
            return null; // can always resume
        }

        if (! $quiz->allow_retry && $quiz->hasFinishedAttemptBy($user)) {
            return 'You have already completed this quiz.';
        }

        return null;
    }

    /**
     * The learner's running attempt for this quiz, after expiring it if its time is up.
     */
    public function inProgressAttempt(User $user, Quiz $quiz): ?QuizAttempt
    {
        $attempt = QuizAttempt::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->where('status', QuizAttempt::STATUS_IN_PROGRESS)
            ->latest('id')
            ->first();

        if ($attempt && $this->expireIfOverdue($attempt)) {
            return null;
        }

        return $attempt;
    }

    /**
     * Starts a new attempt, or resumes the running one.
     *
     * @throws QuizException
     */
    public function start(User $user, Quiz $quiz): QuizAttempt
    {
        return DB::transaction(function () use ($user, $quiz) {
            // Serialize concurrent "start" clicks by the same learner.
            User::whereKey($user->id)->lockForUpdate()->first();

            if ($reason = $this->unavailableReason($user, $quiz)) {
                throw new QuizException($reason);
            }

            if ($existing = $this->inProgressAttempt($user, $quiz)) {
                return $existing;
            }

            $attempt = new QuizAttempt;
            $attempt->user_id = $user->id;
            $attempt->quiz_id = $quiz->id;
            $attempt->attempt_number = (int) QuizAttempt::where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->max('attempt_number') + 1;
            $attempt->score = 0;
            $attempt->total_questions = $quiz->quizQuestions()->count();
            $attempt->percentage = 0;
            $attempt->status = QuizAttempt::STATUS_IN_PROGRESS;
            $attempt->started_at = now();
            $attempt->save();

            return $attempt;
        });
    }

    /**
     * The attempt's questions in the order this learner sees them. When the
     * quiz randomizes questions, the order is a stable per-attempt shuffle.
     *
     * @return Collection<int, Question>
     */
    public function orderedQuestions(QuizAttempt $attempt): Collection
    {
        $questions = $attempt->quiz->questions()->get();

        if ($attempt->quiz->randomize_questions) {
            $questions = $questions->sortBy(fn (Question $q) => $this->seed($attempt, $q->id, 'q'))->values();
        }

        return $questions;
    }

    /**
     * Choices in display order. Keys stay the original A–D letters so the
     * server can check them against the stored correct_answer.
     *
     * @return array<int, array{key: string, text: string}>
     */
    public function choicesFor(QuizAttempt $attempt, Question $question): array
    {
        $keys = Question::CHOICES;

        if ($attempt->quiz->randomize_choices) {
            usort($keys, fn ($a, $b) => strcmp(
                $this->seed($attempt, $question->id, $a),
                $this->seed($attempt, $question->id, $b),
            ));
        }

        return array_map(fn ($key) => ['key' => $key, 'text' => $question->optionText($key)], $keys);
    }

    /**
     * Records one answer. Correctness is decided here from the database value.
     *
     * @throws QuizException
     */
    public function submitAnswer(QuizAttempt $attempt, int $questionId, string $selected): QuizAnswer
    {
        $attempt->loadMissing('quiz');

        if ($attempt->isFinished()) {
            throw new QuizException('This quiz attempt has already ended.');
        }

        if ($attempt->isOverdue(self::ANSWER_GRACE_SECONDS)) {
            $this->finalize($attempt, QuizAttempt::STATUS_TIMED_OUT);
            throw new QuizException('Quiz time expired. Your answers so far have been submitted.');
        }

        if (! in_array($selected, Question::CHOICES, true)) {
            throw new QuizException('Please choose one of the four answers.');
        }

        $question = $attempt->quiz->questions()->where('questions.id', $questionId)->first();
        if (! $question) {
            throw new QuizException('That question is not part of this quiz.');
        }

        if ($attempt->answers()->where('question_id', $question->id)->exists()) {
            throw new QuizException('You have already answered this question.');
        }

        $answer = new QuizAnswer;
        $answer->quiz_attempt_id = $attempt->id;
        $answer->question_id = $question->id;
        $answer->selected_answer = $selected;
        $answer->is_correct = $selected === $question->correct_answer;
        $answer->answered_at = now();

        try {
            $answer->save();
        } catch (UniqueConstraintViolationException) {
            // A duplicate request raced the check above.
            throw new QuizException('You have already answered this question.');
        }

        return $answer;
    }

    /**
     * Finishes the attempt: stores blank answers for skipped questions and
     * computes the score from the stored, server-checked answers.
     * Calling it on an already finished attempt is a no-op.
     */
    public function finalize(QuizAttempt $attempt, string $status = QuizAttempt::STATUS_COMPLETED): QuizAttempt
    {
        $attempt->loadMissing('quiz');

        DB::transaction(function () use ($attempt, $status) {
            $locked = QuizAttempt::whereKey($attempt->id)->lockForUpdate()->first();

            if ($locked->isFinished()) {
                return;
            }

            // A learner who submits after the deadline has timed out, whatever the client says.
            if ($status === QuizAttempt::STATUS_COMPLETED && $attempt->isOverdue(self::ANSWER_GRACE_SECONDS)) {
                $status = QuizAttempt::STATUS_TIMED_OUT;
            }

            $questionIds = $attempt->quiz->quizQuestions()->pluck('question_id');
            $answeredIds = $attempt->answers()->pluck('question_id');
            $now = now();

            foreach ($questionIds->diff($answeredIds) as $questionId) {
                $blank = new QuizAnswer;
                $blank->quiz_attempt_id = $attempt->id;
                $blank->question_id = $questionId;
                $blank->selected_answer = null;
                $blank->is_correct = false;
                $blank->answered_at = null;
                $blank->save();
            }

            $total = max($locked->total_questions, $questionIds->count());
            $score = $attempt->answers()->whereIn('question_id', $questionIds)->where('is_correct', true)->count();

            $locked->score = $score;
            $locked->total_questions = $total;
            $locked->percentage = $total > 0 ? round($score / $total * 100, 2) : 0;
            $locked->status = $status;
            $locked->completed_at = $status === QuizAttempt::STATUS_TIMED_OUT
                ? $now->min($attempt->deadline())
                : $now;
            $locked->save();
        });

        return $attempt->refresh();
    }

    /**
     * Server-side timer: closes the attempt if its time limit has passed.
     */
    public function expireIfOverdue(QuizAttempt $attempt): bool
    {
        $attempt->loadMissing('quiz');

        if ($attempt->isFinished() || ! $attempt->isOverdue(self::ANSWER_GRACE_SECONDS)) {
            return false;
        }

        $this->finalize($attempt, QuizAttempt::STATUS_TIMED_OUT);

        return true;
    }

    /**
     * Closes every abandoned attempt whose time ran out (optionally for one learner),
     * so listings never show stale "in progress" results.
     */
    public function expireOverdueAttempts(?int $userId = null): void
    {
        QuizAttempt::with('quiz')
            ->where('status', QuizAttempt::STATUS_IN_PROGRESS)
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->get()
            ->each(fn (QuizAttempt $attempt) => $this->expireIfOverdue($attempt));
    }

    private function seed(QuizAttempt $attempt, int $questionId, string $salt): string
    {
        return hash_hmac('sha256', "{$attempt->id}:{$questionId}:{$salt}", (string) config('app.key'));
    }
}
