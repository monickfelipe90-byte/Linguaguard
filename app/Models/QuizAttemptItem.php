<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The saved position of one question (and its choice order) within one attempt,
 * generated once when the attempt starts so the order never reshuffles.
 */
class QuizAttemptItem extends Model
{
    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(QuizAttempt::class, 'quiz_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * @return list<string> e.g. ['C', 'A', 'D', 'B']
     */
    public function choiceKeys(): array
    {
        return str_split($this->choice_order);
    }
}
