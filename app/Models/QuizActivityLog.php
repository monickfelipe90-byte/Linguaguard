<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One server-timestamped event in a quiz attempt's activity history.
 * Rows are only ever created by the server; nothing is mass assignable.
 */
class QuizActivityLog extends Model
{
    public const UPDATED_AT = null;

    public const QUIZ_STARTED = 'quiz_started';

    public const TAB_SWITCH = 'tab_switch';

    public const RETURNED = 'returned_to_quiz';

    public const WARNING = 'warning_displayed';

    public const FLAGGED = 'attempt_flagged';

    public const AUTO_SUBMITTED = 'auto_submitted';

    public const SUBMITTED = 'quiz_submitted';

    public const TIMED_OUT = 'quiz_timed_out';

    public const REVIEWED = 'attempt_reviewed';

    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(QuizAttempt::class, 'quiz_attempt_id');
    }

    public static function record(QuizAttempt $attempt, string $type, array $details = [], ?string $clientEventId = null): self
    {
        $log = new self;
        $log->quiz_attempt_id = $attempt->id;
        $log->event_type = $type;
        $log->details = $details ?: null;
        $log->client_event_id = $clientEventId;
        $log->save();

        return $log;
    }
}
