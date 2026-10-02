<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pages_render(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('Welcome'));
        $this->get('/about')->assertOk()->assertInertia(fn ($page) => $page->component('About'));
        $this->get('/login')->assertOk()->assertInertia(fn ($page) => $page->component('Auth/Login'));
        $this->get('/register')->assertOk()->assertInertia(fn ($page) => $page->component('Auth/Register'));
    }

    public function test_admin_login_redirects_to_admin_dashboard(): void
    {
        $admin = User::factory()->admin()->create(['password' => 'Secret123']);

        $this->post('/login', ['email' => $admin->email, 'password' => 'Secret123'])
            ->assertRedirect(route('admin.dashboard'));

        $this->assertAuthenticatedAs($admin);
    }

    public function test_learner_login_redirects_to_learner_dashboard(): void
    {
        $learner = User::factory()->create(['password' => 'Secret123']);

        $this->post('/login', ['email' => $learner->email, 'password' => 'Secret123'])
            ->assertRedirect(route('learner.dashboard'));

        $this->assertAuthenticatedAs($learner);
    }

    public function test_invalid_login_shows_friendly_error(): void
    {
        $learner = User::factory()->create(['password' => 'Secret123']);

        $this->from('/login')
            ->post('/login', ['email' => $learner->email, 'password' => 'wrong-password'])
            ->assertRedirect('/login')
            ->assertSessionHasErrors(['email' => 'Invalid email or password.']);

        $this->assertGuest();
    }

    public function test_malformed_stored_hash_fails_gracefully(): void
    {
        $user = User::factory()->create();
        \DB::table('users')->where('id', $user->id)->update(['password' => '$2y$12$truncatedhashvalue']);

        $this->from('/login')
            ->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect('/login')
            ->assertSessionHasErrors(['email' => 'Invalid email or password.']);

        $this->assertGuest();
    }

    public function test_login_is_rate_limited(): void
    {
        $learner = User::factory()->create(['password' => 'Secret123']);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['email' => $learner->email, 'password' => 'nope']);
        }

        $this->post('/login', ['email' => $learner->email, 'password' => 'Secret123'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_logout(): void
    {
        $learner = User::factory()->create();

        $this->actingAs($learner)->post('/logout')->assertRedirect(route('home'));
        $this->assertGuest();
    }

    public function test_registration_always_creates_a_learner(): void
    {
        $this->post('/register', [
            'name' => 'Ana Cruz',
            'email' => 'ana@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'role' => 'admin', // must be ignored
        ])->assertRedirect(route('learner.dashboard'));

        $user = User::where('email', 'ana@example.com')->first();
        $this->assertSame('learner', $user->role);
        $this->assertNotSame('Password123', $user->password);
        $this->assertAuthenticatedAs($user);
    }

    public function test_registration_validation(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->post('/register', [
            'name' => '',
            'email' => 'taken@example.com',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertSessionHasErrors(['name', 'email', 'password']);
    }

    public function test_dashboard_route_sends_users_to_their_role_home(): void
    {
        $this->actingAs(User::factory()->admin()->create())->get('/dashboard')->assertRedirect(route('admin.dashboard'));
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertRedirect(route('learner.dashboard'));
    }

    public function test_logged_in_users_are_redirected_away_from_login(): void
    {
        $this->actingAs(User::factory()->create())->get('/login')->assertRedirect(route('learner.dashboard'));
    }

    public function test_profile_and_password_update(): void
    {
        $user = User::factory()->create(['password' => 'OldPass123']);

        $this->actingAs($user)->get('/profile')->assertOk();
        $this->actingAs($user)->put('/profile', ['name' => 'New Name', 'email' => 'new@example.com'])->assertSessionHasNoErrors();
        $this->assertSame('New Name', $user->fresh()->name);

        $this->actingAs($user)->put('/profile/password', [
            'current_password' => 'wrong',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertSessionHasErrors('current_password');

        $this->actingAs($user)->put('/profile/password', [
            'current_password' => 'OldPass123',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertSessionHasNoErrors();
    }
}
