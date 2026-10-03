<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Anti-cheating and quiz monitoring (additive only).
 *
 * Adds settings columns to `quizzes`, monitoring columns to `quiz_attempts`,
 * and two new tables. Nothing existing is renamed, changed or removed, and
 * every step is guarded so the migration can be re-run safely.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            if (! Schema::hasColumn('quizzes', 'tab_detection_enabled')) {
                $table->boolean('tab_detection_enabled')->default(true)->after('allow_retry');
            }
            if (! Schema::hasColumn('quizzes', 'max_tab_switches')) {
                $table->unsignedTinyInteger('max_tab_switches')->default(3)->after('tab_detection_enabled');
            }
            if (! Schema::hasColumn('quizzes', 'auto_submit_on_flag')) {
                $table->boolean('auto_submit_on_flag')->default(false)->after('max_tab_switches');
            }
        });

        Schema::table('quiz_attempts', function (Blueprint $table) {
            if (! Schema::hasColumn('quiz_attempts', 'tab_switch_count')) {
                $table->unsignedInteger('tab_switch_count')->default(0)->after('status');
            }
            if (! Schema::hasColumn('quiz_attempts', 'warning_count')) {
                $table->unsignedInteger('warning_count')->default(0)->after('tab_switch_count');
            }
            if (! Schema::hasColumn('quiz_attempts', 'review_status')) {
                // normal | flagged | reviewed
                $table->string('review_status', 20)->default('normal')->after('warning_count')->index('idx_attempts_review_status');
            }
            if (! Schema::hasColumn('quiz_attempts', 'flagged_at')) {
                $table->timestamp('flagged_at')->nullable()->after('review_status');
            }
            if (! Schema::hasColumn('quiz_attempts', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('flagged_at');
            }
            if (! Schema::hasColumn('quiz_attempts', 'reviewed_by')) {
                $table->foreignId('reviewed_by')->nullable()->after('reviewed_at')
                    ->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            }
        });

        if (! Schema::hasTable('quiz_activity_logs')) {
            Schema::create('quiz_activity_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_attempt_id')->constrained('quiz_attempts')->cascadeOnDelete()->cascadeOnUpdate();
                $table->string('event_type', 40);
                $table->json('details')->nullable();
                // Browser-generated id used only to ignore duplicate submissions of the same event.
                $table->string('client_event_id', 64)->nullable();
                $table->timestamp('created_at')->nullable(); // always set by the server

                $table->index(['quiz_attempt_id', 'event_type'], 'idx_activity_attempt_event');
                $table->unique(['quiz_attempt_id', 'client_event_id'], 'unique_activity_client_event');
            });
        }

        if (! Schema::hasTable('quiz_attempt_items')) {
            Schema::create('quiz_attempt_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_attempt_id')->constrained('quiz_attempts')->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('question_id')->constrained('questions')->cascadeOnUpdate();
                $table->unsignedInteger('position');
                $table->string('choice_order', 4)->default('ABCD'); // display order of the original A–D keys
                $table->timestamps();

                $table->unique(['quiz_attempt_id', 'question_id'], 'unique_attempt_item_question');
                $table->unique(['quiz_attempt_id', 'position'], 'unique_attempt_item_position');
            });
        }
    }

    /**
     * Intentionally a no-op: rolling back must never remove monitoring data.
     */
    public function down(): void
    {
        //
    }
};
