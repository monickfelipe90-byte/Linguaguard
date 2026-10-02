<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAnswer;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionBankTest extends TestCase
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
            'contextual_sentence' => 'She sings beautifully every morning.',
            'target_word' => 'beautifully',
            'question_text' => 'What part of speech is the word "beautifully"?',
            'option_a' => 'Adjective',
            'option_b' => 'Adverb',
            'option_c' => 'Verb',
            'option_d' => 'Noun',
            'correct_answer' => 'B',
            'explanation' => '"Beautifully" describes how she sings.',
            'category' => 'Adverb',
            'difficulty' => 'Medium',
        ], $overrides);
    }

    public function test_admin_can_add_question(): void
    {
        $this->actingAs($this->admin)->post('/admin/questions', $this->payload())->assertRedirect()->assertSessionHasNoErrors();

        $question = Question::firstWhere('target_word', 'beautifully');
        $this->assertNotNull($question);
        $this->assertSame('B', $question->correct_answer);
        $this->assertSame($this->admin->id, $question->created_by);
    }

    public function test_question_validation(): void
    {
        $this->actingAs($this->admin)->post('/admin/questions', $this->payload([
            'contextual_sentence' => '',
            'option_c' => '',
            'correct_answer' => 'E',
            'category' => 'Article',
            'difficulty' => 'Impossible',
            'explanation' => '',
        ]))->assertSessionHasErrors(['contextual_sentence', 'option_c', 'correct_answer', 'category', 'difficulty', 'explanation']);

        $this->assertSame(0, Question::count());
    }

    public function test_target_word_must_be_in_sentence_and_options_unique(): void
    {
        $this->actingAs($this->admin)->post('/admin/questions', $this->payload([
            'target_word' => 'loudly',
            'option_b' => 'adjective',
        ]))->assertSessionHasErrors(['target_word', 'option_a']);
    }

    public function test_admin_can_edit_question(): void
    {
        $question = Question::factory()->create(['created_by' => $this->admin->id]);

        $this->actingAs($this->admin)->put("/admin/questions/{$question->id}", $this->payload())
            ->assertRedirect(route('admin.questions.show', $question));

        $this->assertSame('beautifully', $question->fresh()->target_word);
    }

    public function test_admin_can_delete_unused_question_and_it_is_removed_from_quizzes(): void
    {
        $question = Question::factory()->create(['created_by' => $this->admin->id]);
        $other = Question::factory()->create(['created_by' => $this->admin->id]);
        $quiz = Quiz::factory()->create(['created_by' => $this->admin->id]);
        $quiz->syncOrderedQuestions([$question->id, $other->id]);

        $this->actingAs($this->admin)->delete("/admin/questions/{$question->id}")->assertRedirect(route('admin.questions.index'));

        $this->assertModelMissing($question);
        $this->assertSame([1], $quiz->questions()->get()->pluck('pivot.question_order')->all());
    }

    public function test_question_with_learner_answers_is_protected_from_deletion(): void
    {
        $question = Question::factory()->create(['created_by' => $this->admin->id]);
        $quiz = Quiz::factory()->create(['created_by' => $this->admin->id]);
        $quiz->syncOrderedQuestions([$question->id]);

        $attempt = new QuizAttempt;
        $attempt->user_id = User::factory()->create()->id;
        $attempt->quiz_id = $quiz->id;
        $attempt->started_at = now();
        $attempt->save();

        $answer = new QuizAnswer;
        $answer->quiz_attempt_id = $attempt->id;
        $answer->question_id = $question->id;
        $answer->selected_answer = 'A';
        $answer->is_correct = true;
        $answer->save();

        $this->actingAs($this->admin)->delete("/admin/questions/{$question->id}")->assertSessionHas('error');
        $this->assertModelExists($question);
    }

    public function test_search_and_filters(): void
    {
        Question::factory()->create(['created_by' => $this->admin->id, 'target_word' => 'table', 'contextual_sentence' => 'The table is big.', 'category' => 'Noun', 'difficulty' => 'Easy']);
        Question::factory()->create(['created_by' => $this->admin->id, 'target_word' => 'ran', 'contextual_sentence' => 'He ran home.', 'category' => 'Verb', 'difficulty' => 'Hard']);

        $this->actingAs($this->admin)->get('/admin/questions?search=ran')
            ->assertInertia(fn ($p) => $p->has('questions.data', 1)->where('questions.data.0.target_word', 'ran'));

        $this->actingAs($this->admin)->get('/admin/questions?category=Noun')
            ->assertInertia(fn ($p) => $p->has('questions.data', 1)->where('questions.data.0.category', 'Noun'));

        $this->actingAs($this->admin)->get('/admin/questions?difficulty=Hard')
            ->assertInertia(fn ($p) => $p->has('questions.data', 1)->where('questions.data.0.difficulty', 'Hard'));

        $this->actingAs($this->admin)->get('/admin/questions?category=Adverb')
            ->assertInertia(fn ($p) => $p->has('questions.data', 0));
    }

    public function test_question_bank_paginates(): void
    {
        Question::factory()->count(12)->create(['created_by' => $this->admin->id]);

        $this->actingAs($this->admin)->get('/admin/questions')
            ->assertInertia(fn ($p) => $p->has('questions.data', 10)->where('questions.total', 12)->where('questions.last_page', 2));
    }
}
