<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\QuizEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $learner;

    private Quiz $quiz;

    /** @var array<int, Question> */
    private array $questions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->learner = User::factory()->create();

        // Correct answers: A, B, C
        $this->questions = [
            Question::factory()->create(['created_by' => $this->admin->id, 'correct_answer' => 'A']),
            Question::factory()->create(['created_by' => $this->admin->id, 'correct_answer' => 'B']),
            Question::factory()->create(['created_by' => $this->admin->id, 'correct_answer' => 'C']),
        ];

        $this->quiz = Quiz::factory()->create([
            'created_by' => $this->admin->id,
            'time_limit' => 10,
            'passing_score' => 60,
            'is_active' => true,
            'allow_retry' => true,
        ]);
        $this->quiz->syncOrderedQuestions(array_map(fn ($q) => $q->id, $this->questions));
    }

    private function startAttempt(?User $user = null): QuizAttempt
    {
        $this->actingAs($user ?? $this->learner)->post("/quiz/{$this->quiz->quiz_code}/start");

        return QuizAttempt::where('user_id', ($user ?? $this->learner)->id)->latest('id')->firstOrFail();
    }

    private function answer(QuizAttempt $attempt, Question $question, string $choice, array $extra = [])
    {
        return $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/answers", [
            'question_id' => $question->id,
            'selected_answer' => $choice,
            ...$extra,
        ]);
    }

    // ---- Joining ----

    public function test_join_with_valid_code_goes_to_instructions(): void
    {
        $this->actingAs($this->learner)->post('/join', ['code' => strtolower($this->quiz->quiz_code)])
            ->assertRedirect(route('learner.quiz.intro', $this->quiz->quiz_code));

        $this->actingAs($this->learner)->get("/quiz/{$this->quiz->quiz_code}")
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Learner/QuizIntro')
                ->where('quiz.title', $this->quiz->title)
                ->where('quiz.questions_count', 3)
                ->where('quiz.time_limit', 10)
                ->where('unavailableReason', null));
    }

    public function test_join_with_unknown_code(): void
    {
        $this->actingAs($this->learner)->post('/join', ['code' => 'NOPE99'])
            ->assertSessionHasErrors(['code' => 'Quiz code not found.']);
    }

    public function test_join_inactive_quiz(): void
    {
        $this->quiz->update(['is_active' => false]);

        $this->actingAs($this->learner)->post('/join', ['code' => $this->quiz->quiz_code])
            ->assertSessionHasErrors(['code' => 'This quiz is currently unavailable.']);
    }

    public function test_quiz_without_questions_cannot_be_started(): void
    {
        $empty = Quiz::factory()->create(['created_by' => $this->admin->id, 'is_active' => true]);

        $this->actingAs($this->learner)->post('/join', ['code' => $empty->quiz_code])->assertSessionHasErrors('code');
        $this->actingAs($this->learner)->post("/quiz/{$empty->quiz_code}/start")->assertSessionHas('error');
        $this->assertSame(0, QuizAttempt::count());
    }

    public function test_retry_disabled_blocks_second_attempt(): void
    {
        $this->quiz->update(['allow_retry' => false]);
        $attempt = $this->startAttempt();
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $this->actingAs($this->learner)->post('/join', ['code' => $this->quiz->quiz_code])
            ->assertSessionHasErrors(['code' => 'You have already completed this quiz.']);

        $this->actingAs($this->learner)->post("/quiz/{$this->quiz->quiz_code}/start")->assertSessionHas('error');
        $this->assertSame(1, QuizAttempt::count());
    }

    // ---- Starting & playing ----

    public function test_start_creates_in_progress_attempt(): void
    {
        $attempt = $this->startAttempt();

        $this->assertSame(QuizAttempt::STATUS_IN_PROGRESS, $attempt->status);
        $this->assertSame(1, $attempt->attempt_number);
        $this->assertSame(3, $attempt->total_questions);
        $this->assertNotNull($attempt->started_at);
        $this->assertSame($this->quiz->id, $attempt->quiz_id);
    }

    public function test_starting_twice_resumes_the_same_attempt(): void
    {
        $first = $this->startAttempt();
        $second = $this->startAttempt();

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, QuizAttempt::count());
    }

    public function test_retry_increments_attempt_number(): void
    {
        $first = $this->startAttempt();
        $this->actingAs($this->learner)->post("/attempts/{$first->id}/finish");

        $second = $this->startAttempt();
        $this->assertSame(2, $second->attempt_number);
    }

    public function test_play_page_does_not_leak_unanswered_correct_answers(): void
    {
        $attempt = $this->startAttempt();

        $response = $this->actingAs($this->learner)->get("/attempts/{$attempt->id}");
        $response->assertOk()->assertInertia(fn ($p) => $p->component('Learner/Play')
            ->has('questions', 3)
            ->where('questions.0.answer', null)
            ->missing('questions.0.correct_answer')
            ->missing('questions.0.explanation')
            ->has('questions.0.choices', 4));

        $this->assertStringNotContainsString('correct_answer', json_encode($response->viewData('page')['props']['questions']));
    }

    // ---- Answering ----

    public function test_answers_are_checked_on_the_server(): void
    {
        $attempt = $this->startAttempt();

        $this->answer($attempt, $this->questions[0], 'A')->assertRedirect(route('learner.attempts.play', $attempt));
        $this->answer($attempt, $this->questions[1], 'D');

        $answers = $attempt->answers()->orderBy('id')->get();
        $this->assertTrue($answers[0]->is_correct);
        $this->assertFalse($answers[1]->is_correct);
        $this->assertNotNull($answers[0]->answered_at);

        // Feedback becomes visible only for answered questions.
        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}")
            ->assertInertia(fn ($p) => $p
                ->where('questions.0.answer.is_correct', true)
                ->where('questions.1.answer.is_correct', false)
                ->where('questions.1.answer.correct_answer', 'B')
                ->where('questions.2.answer', null));
    }

    public function test_client_supplied_correctness_and_score_are_ignored(): void
    {
        $attempt = $this->startAttempt();

        $this->answer($attempt, $this->questions[0], 'D', ['is_correct' => true, 'score' => 100, 'percentage' => 100]);
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish", ['score' => 3, 'percentage' => 100, 'status' => 'completed']);

        $attempt->refresh();
        $this->assertFalse($attempt->answers()->first()->is_correct);
        $this->assertSame(0, $attempt->score);
        $this->assertSame(0.0, $attempt->percentage);
    }

    public function test_duplicate_answers_are_prevented(): void
    {
        $attempt = $this->startAttempt();

        $this->answer($attempt, $this->questions[0], 'D');
        $this->answer($attempt, $this->questions[0], 'A')->assertSessionHas('error', 'You have already answered this question.');

        $this->assertSame(1, $attempt->answers()->count());
        $this->assertFalse($attempt->answers()->first()->is_correct);
    }

    public function test_question_must_belong_to_the_quiz(): void
    {
        $attempt = $this->startAttempt();
        $foreign = Question::factory()->create(['created_by' => $this->admin->id]);

        $this->answer($attempt, $foreign, 'A')->assertSessionHas('error');
        $this->assertSame(0, $attempt->answers()->count());
    }

    public function test_invalid_answer_choice_is_rejected(): void
    {
        $attempt = $this->startAttempt();

        $this->answer($attempt, $this->questions[0], 'E')->assertSessionHasErrors('selected_answer');
        $this->assertSame(0, $attempt->answers()->count());
    }

    public function test_learner_cannot_touch_another_learners_attempt(): void
    {
        $attempt = $this->startAttempt();
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $other = User::factory()->create();
        $this->actingAs($other)->get("/attempts/{$attempt->id}")->assertForbidden();
        $this->actingAs($other)->get("/attempts/{$attempt->id}/result")->assertForbidden();
        $this->actingAs($other)->post("/attempts/{$attempt->id}/answers", ['question_id' => $this->questions[0]->id, 'selected_answer' => 'A'])->assertForbidden();
        $this->actingAs($other)->post("/attempts/{$attempt->id}/finish")->assertForbidden();
    }

    // ---- Finishing & results ----

    public function test_finishing_calculates_and_saves_results(): void
    {
        $attempt = $this->startAttempt();
        $this->answer($attempt, $this->questions[0], 'A'); // correct
        $this->answer($attempt, $this->questions[1], 'B'); // correct
        // third question skipped

        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish")
            ->assertRedirect(route('learner.attempts.result', $attempt));

        $attempt->refresh();
        $this->assertSame(QuizAttempt::STATUS_COMPLETED, $attempt->status);
        $this->assertSame(2, $attempt->score);
        $this->assertSame(3, $attempt->total_questions);
        $this->assertEqualsWithDelta(66.67, $attempt->percentage, 0.001);
        $this->assertNotNull($attempt->completed_at);
        $this->assertTrue($attempt->passed());

        // The skipped question is stored as a blank, incorrect answer.
        $this->assertSame(3, $attempt->answers()->count());
        $this->assertNull($attempt->answers()->where('question_id', $this->questions[2]->id)->first()->selected_answer);

        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}/result")
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Learner/Result')
                ->where('attempt.score', 2)
                ->where('attempt.passed', true)
                ->has('review', 3)
                ->where('review.2.correct_answer', 'C')
                ->where('review.2.selected_answer', null));
    }

    public function test_no_answers_after_finishing(): void
    {
        $attempt = $this->startAttempt();
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $this->answer($attempt, $this->questions[0], 'A')->assertRedirect(route('learner.attempts.result', $attempt));
        $this->assertSame(0, $attempt->fresh()->score);
    }

    public function test_result_is_not_available_before_finishing(): void
    {
        $attempt = $this->startAttempt();

        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}/result")
            ->assertRedirect(route('learner.attempts.play', $attempt));
    }

    public function test_failing_result(): void
    {
        $attempt = $this->startAttempt();
        $this->answer($attempt, $this->questions[0], 'A');
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $attempt->refresh();
        $this->assertEqualsWithDelta(33.33, $attempt->percentage, 0.001);
        $this->assertFalse($attempt->passed());
    }

    // ---- Server-side timer ----

    public function test_expired_attempt_is_timed_out_and_rejects_answers(): void
    {
        $attempt = $this->startAttempt();
        $this->answer($attempt, $this->questions[0], 'A');

        $this->travel(11)->minutes();

        $this->answer($attempt, $this->questions[1], 'B')
            ->assertRedirect(route('learner.attempts.result', $attempt));

        $attempt->refresh();
        $this->assertSame(QuizAttempt::STATUS_TIMED_OUT, $attempt->status);
        $this->assertSame(1, $attempt->score);
        $this->assertFalse((bool) $attempt->answers()->where('question_id', $this->questions[1]->id)->value('is_correct'));
        $this->assertTrue($attempt->completed_at->lessThanOrEqualTo($attempt->started_at->copy()->addMinutes(10)));
    }

    public function test_opening_an_expired_attempt_finalizes_it(): void
    {
        $attempt = $this->startAttempt();
        $this->travel(15)->minutes();

        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}")
            ->assertRedirect(route('learner.attempts.result', $attempt));

        $this->assertSame(QuizAttempt::STATUS_TIMED_OUT, $attempt->fresh()->status);
    }

    public function test_early_timeout_request_from_browser_is_ignored(): void
    {
        $attempt = $this->startAttempt();

        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish", ['reason' => 'timeout'])
            ->assertRedirect(route('learner.attempts.play', $attempt));

        $this->assertSame(QuizAttempt::STATUS_IN_PROGRESS, $attempt->fresh()->status);
    }

    public function test_timeout_request_at_deadline_times_out(): void
    {
        $attempt = $this->startAttempt();
        $this->travel(10)->minutes();

        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish", ['reason' => 'timeout']);

        $this->assertSame(QuizAttempt::STATUS_TIMED_OUT, $attempt->fresh()->status);
    }

    public function test_late_manual_submit_is_recorded_as_timed_out(): void
    {
        $attempt = $this->startAttempt();
        $this->travel(20)->minutes();

        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $this->assertSame(QuizAttempt::STATUS_TIMED_OUT, $attempt->fresh()->status);
    }

    public function test_remaining_time_comes_from_the_server(): void
    {
        $this->freezeSecond();
        $attempt = $this->startAttempt();
        $this->travel(4)->minutes();

        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}")
            ->assertInertia(fn ($p) => $p->where('attempt.remaining_seconds', 360));
    }

    // ---- Randomization ----

    public function test_randomized_order_is_stable_per_attempt_and_keeps_answer_keys(): void
    {
        $this->quiz->update(['randomize_questions' => true, 'randomize_choices' => true]);
        $attempt = $this->startAttempt()->load('quiz');
        $engine = app(QuizEngine::class);

        $first = $engine->orderedQuestions($attempt)->pluck('id')->all();
        $again = $engine->orderedQuestions($attempt->fresh('quiz'))->pluck('id')->all();
        $this->assertSame($first, $again);
        $this->assertEqualsCanonicalizing(array_map(fn ($q) => $q->id, $this->questions), $first);

        $choices = $engine->choicesFor($attempt, $this->questions[0]);
        $this->assertEqualsCanonicalizing(['A', 'B', 'C', 'D'], array_column($choices, 'key'));
        foreach ($choices as $c) {
            $this->assertSame($this->questions[0]->optionText($c['key']), $c['text']);
        }
    }

    // ---- History, dashboards & admin results ----

    public function test_history_only_shows_own_attempts(): void
    {
        $mine = $this->startAttempt();
        $this->actingAs($this->learner)->post("/attempts/{$mine->id}/finish");

        $other = User::factory()->create();
        $this->startAttempt($other);

        $this->actingAs($this->learner)->get('/history')
            ->assertInertia(fn ($p) => $p->component('Learner/History')
                ->has('attempts.data', 1)
                ->where('attempts.data.0.id', $mine->id));
    }

    public function test_learner_dashboard_statistics(): void
    {
        $attempt = $this->startAttempt();
        $this->answer($attempt, $this->questions[0], 'A');
        $this->answer($attempt, $this->questions[1], 'B');
        $this->answer($attempt, $this->questions[2], 'C');
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $this->actingAs($this->learner)->get('/learner')
            ->assertInertia(fn ($p) => $p->component('Learner/Dashboard')
                ->where('stats.average_score', 100)
                ->where('stats.completed_quizzes', 1)
                ->where('stats.passed_quizzes', 1)
                ->has('availableQuizzes', 1)
                ->has('recentAttempts', 1));
    }

    public function test_admin_results_filters_and_performance(): void
    {
        $a1 = $this->startAttempt();
        $this->answer($a1, $this->questions[0], 'A');
        $this->answer($a1, $this->questions[1], 'B');
        $this->answer($a1, $this->questions[2], 'C');
        $this->actingAs($this->learner)->post("/attempts/{$a1->id}/finish"); // 100%

        $other = User::factory()->create();
        $a2 = $this->startAttempt($other);
        $this->actingAs($other)->post("/attempts/{$a2->id}/finish"); // 0%

        $this->actingAs($this->admin)->get('/admin/results')
            ->assertInertia(fn ($p) => $p->component('Admin/Results/Index')
                ->has('attempts.data', 2)
                ->where('performance.total_attempts', 2)
                ->where('performance.average_score', 50)
                ->where('performance.highest_score', 100)
                ->where('performance.lowest_score', 0)
                ->where('performance.passed', 1)
                ->where('performance.failed', 1));

        $this->actingAs($this->admin)->get("/admin/results?learner={$other->id}")
            ->assertInertia(fn ($p) => $p->has('attempts.data', 1)->where('attempts.data.0.id', $a2->id));

        $this->actingAs($this->admin)->get('/admin/results?search='.urlencode($other->name))
            ->assertInertia(fn ($p) => $p->has('attempts.data', 1));

        $this->actingAs($this->admin)->get("/admin/results?quiz={$this->quiz->id}&status=completed")
            ->assertInertia(fn ($p) => $p->has('attempts.data', 2));

        $this->actingAs($this->admin)->get("/admin/results/{$a1->id}")
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Admin/Results/Show')
                ->where('attempt.learner.id', $this->learner->id)
                ->where('attempt.score', 3)
                ->has('review', 3));

        $this->actingAs($this->admin)->get('/admin')
            ->assertInertia(fn ($p) => $p->where('stats.attempts', 2)->where('stats.average_score', 50)->where('stats.learners', 2));
    }
}
