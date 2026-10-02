<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documents the existing linguaguard_db schema (created in phpMyAdmin).
 *
 * Every table is created only when it does not already exist, so running
 * `php artisan migrate` against the live database is SAFE: it records this
 * migration and leaves the existing tables and data untouched. On an empty
 * database (e.g. the in-memory SQLite test database) it builds the same schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('password');
                $table->enum('role', ['admin', 'learner'])->default('learner');
                $table->timestamp('email_verified_at')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('questions')) {
            Schema::create('questions', function (Blueprint $table) {
                $table->id();
                $table->text('question_text');
                $table->text('contextual_sentence');
                $table->string('target_word');
                $table->string('option_a');
                $table->string('option_b');
                $table->string('option_c');
                $table->string('option_d');
                $table->enum('correct_answer', ['A', 'B', 'C', 'D']);
                $table->text('explanation')->nullable();
                $table->enum('category', ['Noun', 'Pronoun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Interjection']);
                $table->enum('difficulty', ['Easy', 'Medium', 'Hard'])->default('Easy');
                $table->foreignId('created_by')->constrained('users')->cascadeOnUpdate();
                $table->timestamps();

                $table->index('category', 'idx_questions_category');
                $table->index('difficulty', 'idx_questions_difficulty');
            });
        }

        if (! Schema::hasTable('quizzes')) {
            Schema::create('quizzes', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('instructions')->nullable();
                $table->string('quiz_code', 20)->unique();
                $table->unsignedInteger('time_limit')->default(30);
                $table->decimal('passing_score', 5, 2)->default(75.00);
                $table->boolean('is_active')->default(false);
                $table->boolean('randomize_questions')->default(false);
                $table->boolean('randomize_choices')->default(false);
                $table->boolean('allow_retry')->default(true);
                $table->foreignId('created_by')->constrained('users')->cascadeOnUpdate();
                $table->timestamps();

                $table->index('is_active', 'idx_quizzes_active');
            });
        }

        if (! Schema::hasTable('quiz_questions')) {
            Schema::create('quiz_questions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('question_id')->constrained('questions')->cascadeOnUpdate();
                $table->unsignedInteger('question_order')->default(1);
                $table->timestamps();

                $table->unique(['quiz_id', 'question_id'], 'unique_quiz_question');
                $table->index(['quiz_id', 'question_order'], 'idx_quiz_questions_quiz_order');
            });
        }

        if (! Schema::hasTable('quiz_attempts')) {
            Schema::create('quiz_attempts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete()->cascadeOnUpdate();
                $table->unsignedInteger('attempt_number')->default(1);
                $table->unsignedInteger('score')->default(0);
                $table->unsignedInteger('total_questions')->default(0);
                $table->decimal('percentage', 5, 2)->default(0);
                $table->enum('status', ['in_progress', 'completed', 'timed_out'])->default('in_progress');
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index('status', 'idx_attempts_status');
                $table->index(['user_id', 'quiz_id'], 'idx_attempts_user_quiz');
            });
        }

        if (! Schema::hasTable('quiz_answers')) {
            Schema::create('quiz_answers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_attempt_id')->constrained('quiz_attempts')->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('question_id')->constrained('questions')->cascadeOnUpdate();
                $table->enum('selected_answer', ['A', 'B', 'C', 'D'])->nullable();
                $table->boolean('is_correct')->default(false);
                $table->timestamp('answered_at')->nullable();
                $table->timestamps();

                $table->unique(['quiz_attempt_id', 'question_id'], 'unique_attempt_question');
            });
        }
    }

    /**
     * Intentionally a no-op: rolling back must never drop the existing
     * LINGUAGUARD tables or their data.
     */
    public function down(): void
    {
        //
    }
};
