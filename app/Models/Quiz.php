<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quiz extends Model
{
    use HasFactory;

    /** Unambiguous characters (no 0/O, 1/I/L) so codes are easy to read aloud and type. */
    private const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    protected $fillable = [
        'title',
        'description',
        'instructions',
        'time_limit',
        'passing_score',
        'is_active',
        'randomize_questions',
        'randomize_choices',
        'allow_retry',
        'tab_detection_enabled',
        'max_tab_switches',
        'auto_submit_on_flag',
    ];

    protected function casts(): array
    {
        return [
            'time_limit' => 'integer',
            'passing_score' => 'float',
            'is_active' => 'boolean',
            'randomize_questions' => 'boolean',
            'randomize_choices' => 'boolean',
            'allow_retry' => 'boolean',
            'tab_detection_enabled' => 'boolean',
            'max_tab_switches' => 'integer',
            'auto_submit_on_flag' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'quiz_questions')
            ->using(QuizQuestion::class)
            ->withPivot('id', 'question_order')
            ->withTimestamps()
            ->orderBy('quiz_questions.question_order')
            ->orderBy('quiz_questions.id');
    }

    public function quizQuestions(): HasMany
    {
        return $this->hasMany(QuizQuestion::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    /**
     * Generates a cryptographically random code such as "LG8K42" that is not
     * already used by another quiz. The unique DB index is the final guard.
     */
    public static function generateUniqueCode(): string
    {
        $max = strlen(self::CODE_ALPHABET) - 1;

        do {
            $code = 'LG';
            for ($i = 0; $i < 4; $i++) {
                $code .= self::CODE_ALPHABET[random_int(0, $max)];
            }
        } while (static::where('quiz_code', $code)->exists());

        return $code;
    }

    public static function normalizeCode(?string $code): string
    {
        return strtoupper(preg_replace('/\s+/', '', (string) $code));
    }

    /**
     * Replace the quiz's question list with the given ordered question ids.
     *
     * @param  array<int, int>  $questionIds
     */
    public function syncOrderedQuestions(array $questionIds): void
    {
        $sync = [];
        foreach (array_values(array_unique($questionIds)) as $index => $questionId) {
            $sync[$questionId] = ['question_order' => $index + 1];
        }

        $this->questions()->sync($sync);
    }

    public function hasFinishedAttemptBy(User $user): bool
    {
        return $this->attempts()
            ->where('user_id', $user->id)
            ->whereIn('status', [QuizAttempt::STATUS_COMPLETED, QuizAttempt::STATUS_TIMED_OUT])
            ->exists();
    }

    public function scopeSearch($query, ?string $term)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
                ->orWhere('quiz_code', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%");
        });
    }
}
