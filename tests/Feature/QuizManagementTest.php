<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Unit 1 Quiz',
            'description' => 'Nouns and verbs',
            'instructions' => 'Read carefully.',
            'time_limit' => 15,
            'passing_score' => 70,
            'is_active' => true,
            'randomize_questions' => false,
            'randomize_choices' => true,
            'allow_retry' => false,
            'question_ids' => [],
        ], $overrides);
    }

    public function test_admin_can_create_quiz_with_generated_code_and_ordered_questions(): void
    {
        [$q1, $q2, $q3] = Question::factory()->count(3)->create(['created_by' => $this->admin->id]);

        $this->actingAs($this->admin)
            ->post('/admin/quizzes', $this->payload(['question_ids' => [$q3->id, $q1->id, $q2->id]]))
            ->assertSessionHasNoErrors();

        $quiz = Quiz::firstWhere('title', 'Unit 1 Quiz');
        $this->assertMatchesRegularExpression('/^LG[A-Z2-9]{4}$/', $quiz->quiz_code);
        $this->assertTrue($quiz->randomize_choices);
        $this->assertFalse($quiz->allow_retry);
        $this->assertSame([$q3->id, $q1->id, $q2->id], $quiz->questions()->pluck('questions.id')->all());
        $this->assertSame([1, 2, 3], $quiz->questions()->get()->pluck('pivot.question_order')->all());
    }

    public function test_client_cannot_choose_the_quiz_code(): void
    {
        $q = Question::factory()->create(['created_by' => $this->admin->id]);

        $this->actingAs($this->admin)->post('/admin/quizzes', $this->payload(['question_ids' => [$q->id], 'quiz_code' => 'HACKED']));

        $this->assertNotSame('HACKED', Quiz::first()->quiz_code);
    }

    public function test_generated_codes_are_unique(): void
    {
        $codes = collect(range(1, 50))->map(fn () => Quiz::factory()->create(['created_by' => $this->admin->id])->quiz_code);
        $this->assertSame(50, $codes->unique()->count());
    }

    public function test_quiz_validation(): void
    {
        $this->actingAs($this->admin)->post('/admin/quizzes', $this->payload([
            'title' => '',
            'time_limit' => 0,
            'passing_score' => 120,
        ]))->assertSessionHasErrors(['title', 'time_limit', 'passing_score']);

        $this->actingAs($this->admin)->post('/admin/quizzes', $this->payload(['passing_score' => -1]))
            ->assertSessionHasErrors(['passing_score']);
    }

    public function test_duplicate_questions_in_a_quiz_are_rejected(): void
    {
        $q = Question::factory()->create(['created_by' => $this->admin->id]);

        $this->actingAs($this->admin)->post('/admin/quizzes', $this->payload(['question_ids' => [$q->id, $q->id]]))
            ->assertSessionHasErrors('question_ids.0');
    }

    public function test_active_quiz_needs_questions(): void
    {
        $this->actingAs($this->admin)->post('/admin/quizzes', $this->payload(['is_active' => true, 'question_ids' => []]))
            ->assertSessionHasErrors('is_active');

        $this->actingAs($this->admin)->post('/admin/quizzes', $this->payload(['is_active' => false, 'question_ids' => []]))
            ->assertSessionHasNoErrors();
    }

    public function test_admin_can_edit_quiz_and_reorder_or_remove_questions(): void
    {
        [$q1, $q2, $q3] = Question::factory()->count(3)->create(['created_by' => $this->admin->id]);
        $quiz = Quiz::factory()->create(['created_by' => $this->admin->id]);
        $quiz->syncOrderedQuestions([$q1->id, $q2->id, $q3->id]);
        $code = $quiz->quiz_code;

        $this->actingAs($this->admin)
            ->put("/admin/quizzes/{$quiz->id}", $this->payload(['title' => 'Renamed', 'question_ids' => [$q3->id, $q1->id]]))
            ->assertRedirect(route('admin.quizzes.show', $quiz));

        $quiz->refresh();
        $this->assertSame('Renamed', $quiz->title);
        $this->assertSame($code, $quiz->quiz_code);
        $this->assertSame([$q3->id, $q1->id], $quiz->questions()->pluck('questions.id')->all());
    }

    public function test_activate_and_deactivate(): void
    {
        $quiz = Quiz::factory()->create(['created_by' => $this->admin->id, 'is_active' => false]);

        // No questions yet: cannot activate.
        $this->actingAs($this->admin)->patch("/admin/quizzes/{$quiz->id}/toggle")->assertSessionHas('error');
        $this->assertFalse($quiz->fresh()->is_active);

        $quiz->syncOrderedQuestions([Question::factory()->create(['created_by' => $this->admin->id])->id]);

        $this->actingAs($this->admin)->patch("/admin/quizzes/{$quiz->id}/toggle");
        $this->assertTrue($quiz->fresh()->is_active);

        $this->actingAs($this->admin)->patch("/admin/quizzes/{$quiz->id}/toggle");
        $this->assertFalse($quiz->fresh()->is_active);
    }

    public function test_regenerate_code(): void
    {
        $quiz = Quiz::factory()->create(['created_by' => $this->admin->id]);
        $old = $quiz->quiz_code;

        $this->actingAs($this->admin)->patch("/admin/quizzes/{$quiz->id}/regenerate-code");

        $this->assertNotSame($old, $quiz->fresh()->quiz_code);
    }

    public function test_delete_quiz_only_when_safe(): void
    {
        $safe = Quiz::factory()->create(['created_by' => $this->admin->id]);
        $safe->syncOrderedQuestions([Question::factory()->create(['created_by' => $this->admin->id])->id]);

        $this->actingAs($this->admin)->delete("/admin/quizzes/{$safe->id}")->assertRedirect(route('admin.quizzes.index'));
        $this->assertModelMissing($safe);
        $this->assertSame(0, \DB::table('quiz_questions')->where('quiz_id', $safe->id)->count());

        $used = Quiz::factory()->create(['created_by' => $this->admin->id]);
        $attempt = new QuizAttempt;
        $attempt->user_id = User::factory()->create()->id;
        $attempt->quiz_id = $used->id;
        $attempt->started_at = now();
        $attempt->save();

        $this->actingAs($this->admin)->delete("/admin/quizzes/{$used->id}")->assertSessionHas('error');
        $this->assertModelExists($used);
    }

    public function test_quiz_search_and_status_filter(): void
    {
        Quiz::factory()->create(['created_by' => $this->admin->id, 'title' => 'Verbs Galore', 'is_active' => true]);
        Quiz::factory()->create(['created_by' => $this->admin->id, 'title' => 'Noun Practice', 'is_active' => false]);

        $this->actingAs($this->admin)->get('/admin/quizzes?search=Verbs')
            ->assertInertia(fn ($p) => $p->has('quizzes.data', 1)->where('quizzes.data.0.title', 'Verbs Galore'));
        $this->actingAs($this->admin)->get('/admin/quizzes?status=inactive')
            ->assertInertia(fn ($p) => $p->has('quizzes.data', 1)->where('quizzes.data.0.title', 'Noun Practice'));
    }
}
