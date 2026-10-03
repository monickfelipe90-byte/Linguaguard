<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\MonitoringController;
use App\Http\Controllers\Admin\QuestionController;
use App\Http\Controllers\Admin\QuizController as AdminQuizController;
use App\Http\Controllers\Admin\ResultController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Learner\DashboardController as LearnerDashboardController;
use App\Http\Controllers\Learner\QuizController as LearnerQuizController;
use App\Http\Controllers\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public pages
Route::get('/', fn () => Inertia::render('Welcome'))->name('home');
Route::get('/about', fn () => Inertia::render('About'))->name('about');

// Guests only
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Sends each user to the dashboard for their role.
    Route::get('/dashboard', fn (Request $request) => redirect()->route($request->user()->homeRoute()))->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');

    // Teacher / Admin
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', AdminDashboardController::class)->name('dashboard');

        Route::resource('questions', QuestionController::class);

        Route::resource('quizzes', AdminQuizController::class);
        Route::patch('quizzes/{quiz}/toggle', [AdminQuizController::class, 'toggle'])->name('quizzes.toggle');
        Route::patch('quizzes/{quiz}/regenerate-code', [AdminQuizController::class, 'regenerateCode'])->name('quizzes.regenerate-code');

        Route::get('results', [ResultController::class, 'index'])->name('results.index');
        Route::get('results/{attempt}', [ResultController::class, 'show'])->name('results.show');
        Route::post('results/{attempt}/review', [MonitoringController::class, 'review'])->name('results.review');

        Route::get('monitoring', [MonitoringController::class, 'index'])->name('monitoring.index');
    });

    // Learner
    Route::middleware('role:learner')->name('learner.')->group(function () {
        Route::get('/learner', LearnerDashboardController::class)->name('dashboard');
        Route::get('/join', [LearnerQuizController::class, 'joinForm'])->name('join');
        Route::post('/join', [LearnerQuizController::class, 'join'])->middleware('throttle:30,1')->name('join.submit');
        Route::get('/quiz/{code}', [LearnerQuizController::class, 'intro'])->name('quiz.intro');
        Route::post('/quiz/{code}/start', [LearnerQuizController::class, 'start'])->name('quiz.start');
        Route::get('/attempts/{attempt}', [LearnerQuizController::class, 'play'])->name('attempts.play');
        Route::post('/attempts/{attempt}/answers', [LearnerQuizController::class, 'answer'])->middleware('throttle:120,1')->name('attempts.answer');
        Route::post('/attempts/{attempt}/finish', [LearnerQuizController::class, 'finish'])->name('attempts.finish');
        Route::post('/attempts/{attempt}/activity', [LearnerQuizController::class, 'activity'])->middleware('throttle:60,1')->name('attempts.activity');
        Route::get('/attempts/{attempt}/result', [LearnerQuizController::class, 'result'])->name('attempts.result');
        Route::get('/history', [LearnerQuizController::class, 'history'])->name('history');
    });
});
