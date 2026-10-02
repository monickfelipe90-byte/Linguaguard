<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class QuizAttempt extends Model
{
    use HasFactory;

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_TIMED_OUT = 'timed_out';

    public const FINISHED_STATUSES = [self::STATUS_COMPLETED, self::STATUS_TIMED_OUT];

    /**
     * Score-related fields are only ever written by the QuizEngine service,
     * never mass-assigned from request input.
     *
     * @var list<string>
     */
    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'attempt_number' => 'integer',
            'score' => 'integer',
            'total_questions' => 'integer',
            'percentage' => 'float',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(QuizAnswer::class);
    }

    public function isFinished(): bool
    {
        return in_array($this->status, self::FINISHED_STATUSES, true);
    }

    public function deadline(): Carbon
    {
        return $this->started_at->copy()->addMinutes($this->quiz->time_limit);
    }

    public function remainingSeconds(): int
    {
        return max(0, (int) now()->diffInSeconds($this->deadline(), false));
    }

    public function isOverdue(int $graceSeconds = 0): bool
    {
        return now()->greaterThan($this->deadline()->copy()->addSeconds($graceSeconds));
    }

    public function passed(): bool
    {
        return $this->isFinished() && $this->percentage >= $this->quiz->passing_score;
    }

    public function scopeFinished($query)
    {
        return $query->whereIn('quiz_attempts.status', self::FINISHED_STATUSES);
    }
}
