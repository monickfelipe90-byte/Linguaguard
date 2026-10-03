<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizActivityLog;
use App\Models\QuizAttempt;
use App\Models\QuizAttemptItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AntiCheatingTest extends TestCase
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

        $this->questions = [];
        foreach (['A', 'B', 'C', 'D', 'A', 'B'] as $correct) {
            $this->questions[] = Question::factory()->create(['created_by' => $this->admin->id, 'correct_answer' => $correct]);
        }

        $this->quiz = Quiz::factory()->create([
            'created_by' => $this->admin->id,
            'time_limit' => 10,
            'is_active' => true,
            'tab_detection_enabled' => true,
            'max_tab_switches' => 3,
            'auto_submit_on_flag' => false,
        ]);
        $this->quiz->syncOrderedQuestions(array_map(fn ($q) => $q->id, $this->questions));
    }

    private function start(?User $user = null): QuizAttempt
    {
        $user ??= $this->learner;
        $this->actingAs($user)->post("/quiz/{$this->quiz->quiz_code}/start");

        return QuizAttempt::where('user_id', $user->id)->latest('id')->firstOrFail();
    }

    private function visibility(QuizAttempt $attempt, string $state, string $eventId, ?User $user = null, array $extra = [])
    {
        return $this->actingAs($user ?? $this->learner)->postJson("/attempts/{$attempt->id}/activity", [
            'state' => $state,
            'event_id' => $eventId,
            ...$extra,
        ]);
    }

    /** One complete leave-and-return cycle. */
    private function tabSwitch(QuizAttempt $attempt, string $eventId)
    {
        $this->visibility($attempt, 'hidden', $eventId)->assertOk();

        return $this->visibility($attempt, 'visible', $eventId)->assertOk();
    }

    private function eventTypes(QuizAttempt $attempt): array
    {
        return $attempt->activityLogs()->pluck('event_type')->all();
    }

    // ---- Tab-switch detection ----

    public function test_tab_switch_is_recorded_once_per_leave_and_return(): void
    {
        $attempt = $this->start();

        $this->visibility($attempt, 'hidden', 'evt-1')->assertOk()->assertJson(['tab_switch_count' => 1, 'counted' => true]);
        $this->visibility($attempt, 'visible', 'evt-1')->assertOk()->assertJson(['tab_switch_count' => 1, 'warning_count' => 1, 'counted' => false]);

        $attempt->refresh();
        $this->assertSame(1, $attempt->tab_switch_count);
        $this->assertSame(
            [QuizActivityLog::QUIZ_STARTED, QuizActivityLog::TAB_SWITCH, QuizActivityLog::WARNING, QuizActivityLog::RETURNED],
            $this->eventTypes($attempt)
        );
        $this->assertNotNull($attempt->activityLogs()->first()->created_at);
    }

    public function test_duplicate_event_submissions_are_ignored(): void
    {
        $attempt = $this->start();

        $this->visibility($attempt, 'hidden', 'evt-dup');
        $this->visibility($attempt, 'hidden', 'evt-dup');
        $this->visibility($attempt, 'visible', 'evt-dup');
        $this->visibility($attempt, 'visible', 'evt-dup');

        $attempt->refresh();
        $this->assertSame(1, $attempt->tab_switch_count);
        $this->assertSame(1, $attempt->activityLogs()->where('event_type', QuizActivityLog::TAB_SWITCH)->count());
        $this->assertSame(1, $attempt->activityLogs()->where('event_type', QuizActivityLog::RETURNED)->count());
    }

    public function test_switch_is_still_counted_when_the_hidden_report_was_lost(): void
    {
        $attempt = $this->start();

        $this->visibility($attempt, 'visible', 'evt-lost')->assertJson(['tab_switch_count' => 1, 'counted' => true]);

        $this->assertSame(1, $attempt->fresh()->tab_switch_count);
    }

    public function test_warnings_increment_then_third_switch_flags_the_attempt(): void
    {
        $attempt = $this->start();

        $this->tabSwitch($attempt, 'a1')->assertJson(['tab_switch_count' => 1, 'warning_count' => 1, 'flagged' => false]);
        $this->tabSwitch($attempt, 'a2')->assertJson(['tab_switch_count' => 2, 'warning_count' => 2, 'flagged' => false]);
        $this->assertSame(QuizAttempt::REVIEW_NORMAL, $attempt->fresh()->review_status);

        $this->tabSwitch($attempt, 'a3')->assertJson(['tab_switch_count' => 3, 'flagged' => true, 'finished' => false, 'auto_submitted' => false]);

        $attempt->refresh();
        $this->assertSame(QuizAttempt::REVIEW_FLAGGED, $attempt->review_status);
        $this->assertNotNull($attempt->flagged_at);
        $this->assertSame(2, $attempt->warning_count);
        $this->assertSame(QuizAttempt::STATUS_IN_PROGRESS, $attempt->status); // not punished: keeps going
        $this->assertSame(1, $attempt->activityLogs()->where('event_type', QuizActivityLog::FLAGGED)->count());

        // Further switches keep counting but do not flag again.
        $this->tabSwitch($attempt, 'a4');
        $this->assertSame(4, $attempt->fresh()->tab_switch_count);
        $this->assertSame(1, $attempt->activityLogs()->where('event_type', QuizActivityLog::FLAGGED)->count());
    }

    public function test_threshold_is_configurable(): void
    {
        $this->quiz->update(['max_tab_switches' => 1]);
        $attempt = $this->start();

        $this->tabSwitch($attempt, 'b1')->assertJson(['flagged' => true]);
        $this->assertSame(0, $attempt->fresh()->warning_count);
    }

    public function test_automatic_submission_when_enabled(): void
    {
        $this->quiz->update(['max_tab_switches' => 2, 'auto_submit_on_flag' => true]);
        $attempt = $this->start();
        $items = app(\App\Services\QuizEngine::class)->items($attempt->load('quiz'));
        $first = $items->first()->question;
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/answers", ['question_id' => $first->id, 'selected_answer' => $first->correct_answer]);

        $this->tabSwitch($attempt, 'c1');
        $this->visibility($attempt, 'hidden', 'c2')->assertJson(['auto_submitted' => true, 'finished' => true]);

        $attempt->refresh();
        $this->assertSame(QuizAttempt::STATUS_COMPLETED, $attempt->status);
        $this->assertSame(QuizAttempt::REVIEW_FLAGGED, $attempt->review_status);
        $this->assertSame(1, $attempt->score); // score is calculated normally, not reduced
        $types = $this->eventTypes($attempt);
        $this->assertContains(QuizActivityLog::AUTO_SUBMITTED, $types);
        $this->assertContains(QuizActivityLog::SUBMITTED, $types);

        // The return report after auto-submission tells the browser to go to the result.
        $this->visibility($attempt, 'visible', 'c2')->assertJson(['finished' => true])
            ->assertJsonPath('result_url', route('learner.attempts.result', $attempt));
    }

    public function test_detection_disabled_records_nothing(): void
    {
        $this->quiz->update(['tab_detection_enabled' => false]);
        $attempt = $this->start();

        $this->tabSwitch($attempt, 'd1')->assertJson(['tab_switch_count' => 0, 'counted' => false]);
        $this->assertSame(0, $attempt->activityLogs()->where('event_type', QuizActivityLog::TAB_SWITCH)->count());
    }

    public function test_events_after_the_attempt_ended_are_ignored(): void
    {
        $attempt = $this->start();
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $this->tabSwitch($attempt, 'e1')->assertJson(['tab_switch_count' => 0, 'finished' => true]);
    }

    public function test_client_cannot_set_counts_or_flags(): void
    {
        $attempt = $this->start();

        $this->visibility($attempt, 'hidden', 'f1', null, ['tab_switch_count' => 0, 'warning_count' => 0, 'review_status' => 'reviewed', 'flagged' => false]);
        $this->tabSwitch($attempt, 'f2');
        $this->tabSwitch($attempt, 'f3');

        $attempt->refresh();
        $this->assertSame(3, $attempt->tab_switch_count);
        $this->assertSame(QuizAttempt::REVIEW_FLAGGED, $attempt->review_status);
    }

    public function test_invalid_activity_payload_is_rejected(): void
    {
        $attempt = $this->start();

        $this->visibility($attempt, 'blur', 'g1')->assertStatus(422);
        $this->visibility($attempt, 'hidden', 'bad id <script>')->assertStatus(422);
        $this->assertSame(0, $attempt->fresh()->tab_switch_count);
    }

    // ---- Access control ----

    public function test_learner_cannot_report_activity_for_another_learner(): void
    {
        $attempt = $this->start();
        $other = User::factory()->create();

        $this->visibility($attempt, 'hidden', 'h1', $other)->assertForbidden();
        $this->assertSame(0, $attempt->fresh()->tab_switch_count);
    }

    public function test_learner_cannot_access_monitoring_or_logs(): void
    {
        $attempt = $this->start();
        $this->tabSwitch($attempt, 'i1');

        $this->actingAs($this->learner)->get('/admin/monitoring')->assertForbidden();
        $this->actingAs($this->learner)->get("/admin/results/{$attempt->id}")->assertForbidden();
        $this->actingAs($this->learner)->post("/admin/results/{$attempt->id}/review")->assertForbidden();

        // Learner pages never expose the activity log.
        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}")->assertInertia(fn ($p) => $p->missing('activity'));
        $other = User::factory()->create();
        $this->actingAs($other)->get("/attempts/{$attempt->id}")->assertForbidden();
    }

    // ---- Admin monitoring & review ----

    public function test_admin_sees_flagged_attempts_and_activity(): void
    {
        $flagged = $this->start();
        foreach (['j1', 'j2', 'j3'] as $id) {
            $this->tabSwitch($flagged, $id);
        }
        $calm = $this->start(User::factory()->create());

        $this->actingAs($this->admin)->get('/admin/monitoring')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Admin/Monitoring/Index')
                ->where('stats.tab_switches', 3)
                ->where('stats.flagged', 1)
                ->where('stats.with_switches', 1)
                ->has('attempts.data', 2)
                ->where('attempts.data.0.id', $flagged->id) // flagged listed first
                ->where('attempts.data.0.review_status', 'flagged')
                ->where('attempts.data.0.tab_switch_count', 3)
                ->where('attempts.data.0.warning_count', 2)
                ->where('attempts.data.0.learner.name', $this->learner->name)
                ->where('attempts.data.0.quiz.quiz_code', $this->quiz->quiz_code));

        $this->actingAs($this->admin)->get('/admin/monitoring?review=flagged')
            ->assertInertia(fn ($p) => $p->has('attempts.data', 1));
        $this->actingAs($this->admin)->get('/admin/monitoring?review=normal')
            ->assertInertia(fn ($p) => $p->has('attempts.data', 1)->where('attempts.data.0.id', $calm->id));
        $this->actingAs($this->admin)->get("/admin/monitoring?learner={$this->learner->id}&quiz={$this->quiz->id}&from=".now()->toDateString())
            ->assertInertia(fn ($p) => $p->has('attempts.data', 1));
        $this->actingAs($this->admin)->get('/admin/monitoring?to=2000-01-01')
            ->assertInertia(fn ($p) => $p->has('attempts.data', 0));

        $this->actingAs($this->admin)->get("/admin/results/{$flagged->id}")
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Admin/Results/Show')
                ->where('attempt.review_status', 'flagged')
                ->has('activity')
                ->where('activity.0.type', QuizActivityLog::QUIZ_STARTED));

        $this->actingAs($this->admin)->get('/admin')
            ->assertInertia(fn ($p) => $p->where('monitoring.flagged', 1)->where('monitoring.tab_switches', 3)->has('monitoring.recent', 1));
    }

    public function test_admin_marks_flagged_attempt_reviewed_without_changing_score(): void
    {
        $attempt = $this->start();
        foreach (['k1', 'k2', 'k3'] as $id) {
            $this->tabSwitch($attempt, $id);
        }
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");
        $before = $attempt->fresh()->only(['score', 'percentage', 'status', 'total_questions']);

        $this->actingAs($this->admin)->post("/admin/results/{$attempt->id}/review", ['notes' => 'Phone notification.'])
            ->assertSessionHas('success');

        $attempt->refresh();
        $this->assertSame(QuizAttempt::REVIEW_REVIEWED, $attempt->review_status);
        $this->assertNotNull($attempt->reviewed_at);
        $this->assertSame($this->admin->id, $attempt->reviewed_by);
        $this->assertSame($before, $attempt->only(['score', 'percentage', 'status', 'total_questions']));

        $log = $attempt->activityLogs()->where('event_type', QuizActivityLog::REVIEWED)->first();
        $this->assertSame('Phone notification.', $log->details['notes']);

        // Only flagged attempts can be marked reviewed.
        $this->actingAs($this->admin)->post("/admin/results/{$attempt->id}/review")->assertSessionHas('error');
    }

    // ---- Activity log lifecycle ----

    public function test_lifecycle_events_are_logged(): void
    {
        $submitted = $this->start();
        $this->actingAs($this->learner)->post("/attempts/{$submitted->id}/finish");
        $this->assertSame([QuizActivityLog::QUIZ_STARTED, QuizActivityLog::SUBMITTED], $this->eventTypes($submitted));

        $timedOut = $this->start();
        $this->travel(11)->minutes();
        $this->actingAs($this->learner)->get("/attempts/{$timedOut->id}");
        $this->assertSame([QuizActivityLog::QUIZ_STARTED, QuizActivityLog::TIMED_OUT], $this->eventTypes($timedOut));
        $this->assertSame(QuizAttempt::STATUS_TIMED_OUT, $timedOut->fresh()->status);
    }

    public function test_activity_logs_are_not_mass_assignable(): void
    {
        $this->expectException(\Illuminate\Database\Eloquent\MassAssignmentException::class);
        (new QuizActivityLog)->fill(['event_type' => 'x']);
    }

    // ---- Saved randomization ----

    public function test_question_and_choice_order_are_saved_at_start_and_never_reshuffle(): void
    {
        $this->quiz->update(['randomize_questions' => true, 'randomize_choices' => true]);
        $attempt = $this->start();

        $items = QuizAttemptItem::where('quiz_attempt_id', $attempt->id)->orderBy('position')->get();
        $this->assertCount(6, $items);
        $this->assertSame(range(1, 6), $items->pluck('position')->all());
        $this->assertEqualsCanonicalizing(array_map(fn ($q) => $q->id, $this->questions), $items->pluck('question_id')->all());
        foreach ($items as $item) {
            $this->assertEqualsCanonicalizing(['A', 'B', 'C', 'D'], $item->choiceKeys());
        }

        $orderOf = fn () => collect($this->actingAs($this->learner)->get("/attempts/{$attempt->id}")->viewData('page')['props']['questions'])
            ->map(fn ($q) => [$q['id'], array_column($q['choices'], 'key')])->all();

        $first = $orderOf();
        $this->assertSame($items->map(fn ($i) => [$i->question_id, $i->choiceKeys()])->all(), $first);
        $this->assertSame($first, $orderOf()); // refresh: same order
        $this->assertSame($first, $orderOf());
    }

    public function test_randomization_produces_different_orders_across_attempts(): void
    {
        $this->quiz->update(['randomize_questions' => true, 'randomize_choices' => true]);

        $orders = collect(range(1, 8))->map(function () {
            $attempt = $this->start(User::factory()->create());

            return QuizAttemptItem::where('quiz_attempt_id', $attempt->id)->orderBy('position')->get()
                ->map(fn ($i) => $i->question_id.$i->choice_order)->implode(',');
        });

        $this->assertGreaterThan(1, $orders->unique()->count());
    }

    public function test_no_randomization_keeps_teacher_order(): void
    {
        $attempt = $this->start();

        $items = QuizAttemptItem::where('quiz_attempt_id', $attempt->id)->orderBy('position')->get();
        $this->assertSame(array_map(fn ($q) => $q->id, $this->questions), $items->pluck('question_id')->all());
        $this->assertSame(['ABCD'], $items->pluck('choice_order')->unique()->values()->all());
    }

    public function test_scoring_is_correct_after_choices_are_shuffled(): void
    {
        $this->quiz->update(['randomize_questions' => true, 'randomize_choices' => true]);
        $attempt = $this->start();

        $questions = collect($this->actingAs($this->learner)->get("/attempts/{$attempt->id}")->viewData('page')['props']['questions']);

        // Answer every question correctly by picking the choice whose TEXT is the right option,
        // wherever the shuffle placed it on screen.
        foreach ($questions as $q) {
            $model = Question::find($q['id']);
            $correctText = $model->optionText($model->correct_answer);
            $choice = collect($q['choices'])->firstWhere('text', $correctText);
            $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/answers", ['question_id' => $q['id'], 'selected_answer' => $choice['key']]);
        }
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $attempt->refresh();
        $this->assertSame(6, $attempt->score);
        $this->assertSame(100.0, $attempt->percentage);
    }

    public function test_question_set_is_frozen_for_a_running_attempt(): void
    {
        $attempt = $this->start();

        $late = Question::factory()->create(['created_by' => $this->admin->id]);
        $this->quiz->syncOrderedQuestions([...array_map(fn ($q) => $q->id, $this->questions), $late->id]);

        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/answers", ['question_id' => $late->id, 'selected_answer' => 'A'])
            ->assertSessionHas('error');
        $this->actingAs($this->learner)->post("/attempts/{$attempt->id}/finish");

        $attempt->refresh();
        $this->assertSame(6, $attempt->total_questions);
        $this->assertSame(6, $attempt->answers()->count());
    }

    public function test_attempts_started_before_this_feature_get_their_order_saved(): void
    {
        $this->quiz->update(['randomize_questions' => true]);
        $attempt = $this->start();
        DB::table('quiz_attempt_items')->where('quiz_attempt_id', $attempt->id)->delete(); // simulate an old attempt

        $first = collect($this->actingAs($this->learner)->get("/attempts/{$attempt->id}")->viewData('page')['props']['questions'])->pluck('id')->all();

        $this->assertSame(6, QuizAttemptItem::where('quiz_attempt_id', $attempt->id)->count());
        $second = collect($this->actingAs($this->learner)->get("/attempts/{$attempt->id}")->viewData('page')['props']['questions'])->pluck('id')->all();
        $this->assertSame($first, $second);
    }

    // ---- Quiz security settings ----

    public function test_admin_saves_security_settings(): void
    {
        $payload = [
            'title' => 'Secure quiz',
            'time_limit' => 10,
            'passing_score' => 75,
            'is_active' => true,
            'randomize_questions' => true,
            'randomize_choices' => true,
            'allow_retry' => true,
            'tab_detection_enabled' => true,
            'max_tab_switches' => 5,
            'auto_submit_on_flag' => true,
            'question_ids' => [$this->questions[0]->id],
        ];

        $this->actingAs($this->admin)->post('/admin/quizzes', $payload)->assertSessionHasNoErrors();
        $quiz = Quiz::firstWhere('title', 'Secure quiz');
        $this->assertTrue($quiz->tab_detection_enabled);
        $this->assertSame(5, $quiz->max_tab_switches);
        $this->assertTrue($quiz->auto_submit_on_flag);

        $this->actingAs($this->admin)->put("/admin/quizzes/{$quiz->id}", [...$payload, 'tab_detection_enabled' => false, 'auto_submit_on_flag' => false])
            ->assertSessionHasNoErrors();
        $quiz->refresh();
        $this->assertFalse($quiz->tab_detection_enabled);
        $this->assertFalse($quiz->auto_submit_on_flag);

        $this->actingAs($this->admin)->post('/admin/quizzes', [...$payload, 'max_tab_switches' => 0])->assertSessionHasErrors('max_tab_switches');
        $this->actingAs($this->admin)->post('/admin/quizzes', [...$payload, 'max_tab_switches' => 99])->assertSessionHasErrors('max_tab_switches');
    }

    public function test_learner_is_told_about_monitoring_before_starting(): void
    {
        $this->actingAs($this->learner)->get("/quiz/{$this->quiz->quiz_code}")
            ->assertInertia(fn ($p) => $p->where('quiz.tab_detection_enabled', true)->where('quiz.max_tab_switches', 3));

        $attempt = $this->start();
        $this->actingAs($this->learner)->get("/attempts/{$attempt->id}")
            ->assertInertia(fn ($p) => $p->where('monitoring.enabled', true)->where('monitoring.tab_switch_count', 0));
    }
}
