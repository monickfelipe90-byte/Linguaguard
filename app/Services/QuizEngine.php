<?php

namespace App\Services;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizActivityLog;
use App\Models\QuizAnswer;
use App\Models\QuizAttempt;
use App\Models\QuizAttemptItem;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Random\Randomizer;

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

            $this->createItems($attempt, $quiz);
            QuizActivityLog::record($attempt, QuizActivityLog::QUIZ_STARTED, [
                'attempt_number' => $attempt->attempt_number,
                'total_questions' => $attempt->total_questions,
            ]);

            return $attempt;
        });
    }

    /**
     * Saves the attempt's question order and each question's choice order.
     * Called once when the attempt starts, so nothing reshuffles afterwards
     * (on refresh, navigation, or if the quiz is edited mid-attempt).
     */
    private function createItems(QuizAttempt $attempt, Quiz $quiz): void
    {
        $randomizer = new Randomizer; // cryptographically secure engine by default
        $questionIds = $quiz->questions()->pluck('questions.id')->all();

        if ($quiz->randomize_questions) {
            $questionIds = $randomizer->shuffleArray($questionIds);
        }

        foreach (array_values($questionIds) as $index => $questionId) {
            $keys = $quiz->randomize_choices ? $randomizer->shuffleArray(Question::CHOICES) : Question::CHOICES;

            $item = new QuizAttemptItem;
            $item->quiz_attempt_id = $attempt->id;
            $item->question_id = $questionId;
            $item->position = $index + 1;
            $item->choice_order = implode('', $keys);
            $item->save();
        }
    }

    /**
     * The attempt's saved items (question + choice order) in display order.
     * Attempts created before items existed get the same order they always
     * had: still-running ones are saved now, finished ones are only computed.
     *
     * @return Collection<int, QuizAttemptItem>
     */
    public function items(QuizAttempt $attempt): Collection
    {
        $attempt->loadMissing('quiz');
        $items = $attempt->items()->with('question')->get();

        if ($items->isNotEmpty()) {
            return $items;
        }

        $questions = $attempt->quiz->questions()->get();
        if ($attempt->quiz->randomize_questions) {
            $questions = $questions->sortBy(fn (Question $q) => $this->seed($attempt, $q->id, 'q'))->values();
        }

        $items = $questions->values()->map(function (Question $q, $index) use ($attempt) {
            $keys = Question::CHOICES;
            if ($attempt->quiz->randomize_choices) {
                usort($keys, fn ($a, $b) => strcmp($this->seed($attempt, $q->id, $a), $this->seed($attempt, $q->id, $b)));
            }

            $item = new QuizAttemptItem;
            $item->quiz_attempt_id = $attempt->id;
            $item->question_id = $q->id;
            $item->position = $index + 1;
            $item->choice_order = implode('', $keys);
            $item->setRelation('question', $q);

            return $item;
        });

        if (! $attempt->isFinished()) {
            $items->each(fn (QuizAttemptItem $item) => $item->save());
        }

        return $items;
    }

    /**
     * The attempt's questions in the order this learner sees them.
     *
     * @return Collection<int, Question>
     */
    public function orderedQuestions(QuizAttempt $attempt): Collection
    {
        return $this->items($attempt)->map(fn (QuizAttemptItem $item) => $item->question)->filter()->values();
    }

    /**
     * Choices in the attempt's saved display order. Keys stay the original A–D
     * letters, so the server checks them against the stored correct_answer.
     *
     * @return array<int, array{key: string, text: string}>
     */
    public function choicesFor(QuizAttempt $attempt, Question $question): array
    {
        $item = $this->items($attempt)->firstWhere('question_id', $question->id);
        $keys = $item ? $item->choiceKeys() : Question::CHOICES;

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

        // Only questions frozen into this attempt at start can be answered.
        $question = $this->items($attempt)->firstWhere('question_id', $questionId)?->question;
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
    public function finalize(QuizAttempt $attempt, string $status = QuizAttempt::STATUS_COMPLETED, ?string $reason = null): QuizAttempt
    {
        $attempt->loadMissing('quiz');
        $questionIds = $this->items($attempt)->pluck('question_id');

        DB::transaction(function () use ($attempt, $status, $reason, $questionIds) {
            $locked = QuizAttempt::whereKey($attempt->id)->lockForUpdate()->first();

            if ($locked->isFinished()) {
                return;
            }

            // A learner who submits after the deadline has timed out, whatever the client says.
            if ($status === QuizAttempt::STATUS_COMPLETED && $attempt->isOverdue(self::ANSWER_GRACE_SECONDS)) {
                $status = QuizAttempt::STATUS_TIMED_OUT;
            }

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

            QuizActivityLog::record($locked, $status === QuizAttempt::STATUS_TIMED_OUT ? QuizActivityLog::TIMED_OUT : QuizActivityLog::SUBMITTED, array_filter([
                'score' => $score,
                'total_questions' => $total,
                'percentage' => $locked->percentage,
                'reason' => $reason,
            ], fn ($v) => $v !== null));
        });

        return $attempt->refresh();
    }

    /**
     * Handles a tab-visibility event sent by the learner's browser.
     *
     * The browser only reports *that* the page was hidden or shown; the count,
     * warnings, flag and any automatic submission are decided here. Duplicate
     * deliveries of the same event (same client event id) are ignored, and an
     * event whose "hidden" report was lost is still counted once on return.
     *
     * @return array{tab_switch_count:int, warning_count:int, max_tab_switches:int, flagged:bool, auto_submitted:bool, counted:bool}
     */
    public function recordVisibility(QuizAttempt $attempt, string $state, string $eventId): array
    {
        $attempt->loadMissing('quiz');
        $quiz = $attempt->quiz;
        $counted = false;
        $autoSubmit = false;

        if ($quiz->tab_detection_enabled && ! $attempt->isFinished() && ! $attempt->isOverdue(self::ANSWER_GRACE_SECONDS)) {
            DB::transaction(function () use ($attempt, $quiz, $state, $eventId, &$counted, &$autoSubmit) {
                $locked = QuizAttempt::whereKey($attempt->id)->lockForUpdate()->first();
                if ($locked->isFinished()) {
                    return;
                }

                $switchKey = "{$eventId}:hidden";
                $alreadyCounted = QuizActivityLog::where('quiz_attempt_id', $locked->id)->where('client_event_id', $switchKey)->exists();

                // Count the switch once: on "hidden", or on "visible" if the hidden report never arrived.
                if (! $alreadyCounted) {
                    $locked->tab_switch_count++;
                    $count = $locked->tab_switch_count;
                    QuizActivityLog::record($locked, QuizActivityLog::TAB_SWITCH, ['count' => $count], $switchKey);
                    $counted = true;

                    if ($count < $quiz->max_tab_switches) {
                        $locked->warning_count = $count;
                        QuizActivityLog::record($locked, QuizActivityLog::WARNING, ['warning' => $count, 'of' => $quiz->max_tab_switches]);
                    } elseif ($locked->review_status === QuizAttempt::REVIEW_NORMAL) {
                        $locked->review_status = QuizAttempt::REVIEW_FLAGGED;
                        $locked->flagged_at = now();
                        QuizActivityLog::record($locked, QuizActivityLog::FLAGGED, ['tab_switches' => $count, 'threshold' => $quiz->max_tab_switches]);
                        $autoSubmit = $quiz->auto_submit_on_flag;
                    }
                    $locked->save();
                }

                $returnKey = "{$eventId}:visible";
                if ($state === 'visible' && ! QuizActivityLog::where('quiz_attempt_id', $locked->id)->where('client_event_id', $returnKey)->exists()) {
                    QuizActivityLog::record($locked, QuizActivityLog::RETURNED, [], $returnKey);
                }
            });

            if ($autoSubmit) {
                QuizActivityLog::record($attempt, QuizActivityLog::AUTO_SUBMITTED, ['reason' => 'tab_switch_limit']);
                $this->finalize($attempt, QuizAttempt::STATUS_COMPLETED, 'auto_submitted_after_tab_switches');
            }
        }

        $attempt->refresh();

        return [
            'tab_switch_count' => $attempt->tab_switch_count,
            'warning_count' => $attempt->warning_count,
            'max_tab_switches' => $quiz->max_tab_switches,
            'flagged' => $attempt->review_status !== QuizAttempt::REVIEW_NORMAL,
            'auto_submitted' => $autoSubmit,
            'counted' => $counted,
        ];
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
