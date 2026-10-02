<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'Please enter your password.',
        ]);

        $throttleKey = Str::lower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ]);
        }

        try {
            $authenticated = Auth::attempt($credentials, $request->boolean('remember'));
        } catch (\RuntimeException $e) {
            // The stored password is not a valid bcrypt hash (e.g. edited by hand in the database).
            // Treat it as a failed login instead of a server error; the password must be reset.
            Log::warning('Login rejected: stored password hash is invalid.', ['email' => $credentials['email']]);
            $authenticated = false;
        }

        if (! $authenticated) {
            RateLimiter::hit($throttleKey, 60);
            throw ValidationException::withMessages([
                'email' => 'Invalid email or password.',
            ]);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        $user = $request->user();

        return redirect()->intended(route($user->homeRoute()))
            ->with('success', "Welcome back, {$user->name}!");
    }

    public function showRegister(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], [
            'name.required' => 'Please enter your full name.',
            'email.unique' => 'An account with this email already exists.',
            'password.confirmed' => 'The passwords do not match.',
        ]);

        // Public registration always creates learner accounts.
        $user = new User;
        $user->name = $data['name'];
        $user->email = Str::lower($data['email']);
        $user->password = $data['password'];
        $user->role = User::ROLE_LEARNER;
        $user->save();

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('learner.dashboard')
            ->with('success', 'Your account is ready. Welcome to LINGUAGUARD!');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home')->with('success', 'You have been logged out.');
    }
}
