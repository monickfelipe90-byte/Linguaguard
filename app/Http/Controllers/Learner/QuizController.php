<?php

namespace App\Http\Controllers\Learner;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Services\QuizEngine;
use App\Services\QuizException;
use App\Support\Present;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QuizController extends Controller
{
    public function __construct(private QuizEngine $engine)
    {
    }

    public function joinForm(Request $request): Response
    {
        return Inertia::render('Learner/Join', [
            'code' => Quiz::normalizeCode($request->query('code')),
        ]);
    }

    public function join(Request $request): RedirectResponse
    {
        $request->merge(['code' => Quiz::normalizeCode($request->input('code'))]);
        $request->validate(
            ['code' => ['required', 'string', 'max:20']],
            ['code.required' => 'Please enter a quiz code.']
        );

        $quiz = Quiz::where('quiz_code', $request->input('code'))->first();

        $error = ! $quiz
            ? 'Quiz code not found.'
            : $this->engine->unavailableReason($request->user(), $quiz);

        if ($error) {
            throw ValidationException::withMessages(['code' => $error])
                ->redirectTo(route('learner.join', ['code' => $request->input('code')]));
        }

        return redirect()->route('learner.quiz.intro', $quiz->quiz_code);
    }

    public function intro(Request $request, string $code): Response
    {
        $quiz = Quiz::where('quiz_code', Quiz::normalizeCode($code))->first();
        abort_unless($quiz, 404, 'Quiz code not found.');

        $user = $request->user();
        $inProgress = $this->engine->inProgressAttempt($user, $quiz);

        return Inertia::render('Learner/QuizIntro', [
            'quiz' => [
                'title' => $quiz->title,
                'description' => $quiz->description,
                'instructions' => $quiz->instructions,
                'quiz_code' => $quiz->quiz_code,
                'time_limit' => $quiz->time_limit,
                'passing_score' => $quiz->passing_score,
                'questions_count' => $quiz->quizQuestions()->count(),
                'allow_retry' => $quiz->allow_retry,
            ],
            'unavailableReason' => $this->engine->unavailableReason($user, $quiz),
            'inProgressAttempt' => $inProgress?->id,
            'previousAttempts' => $quiz->attempts()->where('user_id', $user->id)->finished()->count(),
        ]);
    }

    public function start(Request $request, string $code): RedirectResponse
    {
        $quiz = Quiz::where('quiz_code', Quiz::normalizeCode($code))->first();
        abort_unless($quiz, 404, 'Quiz code not found.');

        try {
            $attempt = $this->engine->start($request->user(), $quiz);
        } catch (QuizException $e) {
            return redirect()->route('learner.quiz.intro', $quiz->quiz_code)->with('error', $e->getMessage());
        }

        return redirect()->route('learner.attempts.play', $attempt);
    }

    public function play(Request $request, QuizAttempt $attempt): Response|RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);

        if ($this->engine->expireIfOverdue($attempt)) {
            return redirect()->route('learner.attempts.result', $attempt)
                ->with('error', 'Time is up! Your quiz was submitted automatically.');
        }

        if ($attempt->isFinished()) {
            return redirect()->route('learner.attempts.result', $attempt);
        }

        $answers = $attempt->answers()->get()->keyBy('question_id');

        $questions = $this->engine->orderedQuestions($attempt)->values()->map(function (Question $q, $i) use ($attempt, $answers) {
            $answer = $answers->get($q->id);

            return [
                'id' => $q->id,
                'number' => $i + 1,
                'contextual_sentence' => $q->contextual_sentence,
                'target_word' => $q->target_word,
                'question_text' => $q->question_text,
                'choices' => $this->engine->choicesFor($attempt, $q),
                // Feedback (incl. the right answer) only for questions this learner already answered.
                'answer' => $answer ? [
                    'selected' => $answer->selected_answer,
                    'is_correct' => $answer->is_correct,
                    'correct_answer' => $q->correct_answer,
                    'explanation' => $q->explanation,
                ] : null,
            ];
        });

        return Inertia::render('Learner/Play', [
            'attempt' => [
                'id' => $attempt->id,
                'attempt_number' => $attempt->attempt_number,
                'remaining_seconds' => $attempt->remainingSeconds(),
                'time_limit' => $attempt->quiz->time_limit,
            ],
            'quiz' => [
                'title' => $attempt->quiz->title,
                'quiz_code' => $attempt->quiz->quiz_code,
            ],
            'questions' => $questions,
        ]);
    }

    public function answer(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'selected_answer' => ['required', Rule::in(Question::CHOICES)],
        ], [
            'selected_answer.required' => 'Please choose an answer.',
            'selected_answer.in' => 'Please choose one of the four answers.',
        ]);

        try {
            $this->engine->submitAnswer($attempt, (int) $data['question_id'], $data['selected_answer']);
        } catch (QuizException $e) {
            if ($attempt->refresh()->isFinished()) {
                return redirect()->route('learner.attempts.result', $attempt)->with('error', $e->getMessage());
            }

            return redirect()->route('learner.attempts.play', $attempt)->with('error', $e->getMessage());
        }

        return redirect()->route('learner.attempts.play', $attempt);
    }

    public function finish(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);
        $attempt->load('quiz');

        if ($attempt->isFinished()) {
            return redirect()->route('learner.attempts.result', $attempt);
        }

        if ($request->input('reason') === 'timeout') {
            // The browser's timer is only a hint: honour it only if the server agrees time is (nearly) up.
            if ($attempt->remainingSeconds() > 5) {
                return redirect()->route('learner.attempts.play', $attempt);
            }
            $this->engine->finalize($attempt, QuizAttempt::STATUS_TIMED_OUT);

            return redirect()->route('learner.attempts.result', $attempt)
                ->with('error', 'Time is up! Your quiz was submitted automatically.');
        }

        $this->engine->finalize($attempt, QuizAttempt::STATUS_COMPLETED);

        return redirect()->route('learner.attempts.result', $attempt)
            ->with($attempt->status === QuizAttempt::STATUS_TIMED_OUT ? 'error' : 'success',
                $attempt->status === QuizAttempt::STATUS_TIMED_OUT ? 'Time is up! Your quiz was submitted automatically.' : 'Quiz submitted!');
    }

    public function result(Request $request, QuizAttempt $attempt): Response|RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);
        $this->engine->expireIfOverdue($attempt);

        if (! $attempt->isFinished()) {
            return redirect()->route('learner.attempts.play', $attempt);
        }

        $attempt->load('quiz');

        return Inertia::render('Learner/Result', [
            'attempt' => Present::attempt($attempt),
            'review' => Present::review($attempt, $this->engine),
            'canRetry' => $attempt->quiz->allow_retry && $attempt->quiz->is_active,
        ]);
    }

    public function history(Request $request): Response
    {
        $user = $request->user();
        $this->engine->expireOverdueAttempts($user->id);

        return Inertia::render('Learner/History', [
            'attempts' => QuizAttempt::with('quiz')
                ->where('user_id', $user->id)
                ->latest('id')
                ->paginate(10)
                ->through(fn ($a) => Present::attempt($a)),
        ]);
    }

    private function authorizeOwner(Request $request, QuizAttempt $attempt): void
    {
        abort_unless((int) $attempt->user_id === (int) $request->user()->id, 403, 'You can only view your own quiz attempts.');
    }
}
