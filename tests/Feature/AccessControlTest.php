<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        foreach (['/admin', '/admin/questions', '/admin/quizzes', '/admin/results', '/learner', '/join', '/history', '/profile'] as $url) {
            $this->get($url)->assertRedirect(route('login'));
        }
    }

    public function test_learner_cannot_access_any_admin_route(): void
    {
        $learner = User::factory()->create();
        $question = Question::factory()->create();
        $quiz = Quiz::factory()->create();

        $this->actingAs($learner);

        foreach (['/admin', '/admin/questions', '/admin/questions/create', "/admin/questions/{$question->id}", '/admin/quizzes', "/admin/quizzes/{$quiz->id}/edit", '/admin/results'] as $url) {
            $this->get($url)->assertForbidden()->assertInertia(fn ($page) => $page->component('Error')->where('status', 403));
        }

        $this->post('/admin/questions', [])->assertForbidden();
        $this->delete("/admin/questions/{$question->id}")->assertForbidden();
        $this->patch("/admin/quizzes/{$quiz->id}/toggle")->assertForbidden();
        $this->delete("/admin/quizzes/{$quiz->id}")->assertForbidden();

        $this->assertModelExists($question);
        $this->assertModelExists($quiz);
    }

    public function test_admin_cannot_use_learner_quiz_routes(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->get('/learner')->assertForbidden();
        $this->get('/join')->assertForbidden();
        $this->get('/history')->assertForbidden();
    }

    public function test_admin_pages_render_for_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $question = Question::factory()->create(['created_by' => $admin->id]);
        $quiz = Quiz::factory()->create(['created_by' => $admin->id]);

        $this->actingAs($admin);

        $this->get('/admin')->assertOk()->assertInertia(fn ($p) => $p->component('Admin/Dashboard'));
        $this->get('/admin/questions')->assertOk()->assertInertia(fn ($p) => $p->component('Admin/Questions/Index'));
        $this->get('/admin/questions/create')->assertOk();
        $this->get("/admin/questions/{$question->id}")->assertOk()->assertInertia(fn ($p) => $p->component('Admin/Questions/Show'));
        $this->get("/admin/questions/{$question->id}/edit")->assertOk();
        $this->get('/admin/quizzes')->assertOk()->assertInertia(fn ($p) => $p->component('Admin/Quizzes/Index'));
        $this->get('/admin/quizzes/create')->assertOk();
        $this->get("/admin/quizzes/{$quiz->id}")->assertOk()->assertInertia(fn ($p) => $p->component('Admin/Quizzes/Show'));
        $this->get("/admin/quizzes/{$quiz->id}/edit")->assertOk();
        $this->get('/admin/results')->assertOk()->assertInertia(fn ($p) => $p->component('Admin/Results/Index'));
    }

    public function test_missing_records_show_friendly_404(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get('/admin/questions/999999')
            ->assertNotFound()
            ->assertInertia(fn ($p) => $p->component('Error')->where('status', 404));
    }

    public function test_shared_props_never_include_password(): void
    {
        $learner = User::factory()->create();

        $this->actingAs($learner)->get('/learner')
            ->assertInertia(fn ($p) => $p->where('auth.user.id', $learner->id)->missing('auth.user.password'));
    }
}
