<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    use HasFactory;

    public const CATEGORIES = ['Noun', 'Pronoun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Interjection'];

    public const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

    public const CHOICES = ['A', 'B', 'C', 'D'];

    protected $fillable = [
        'question_text',
        'contextual_sentence',
        'target_word',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'correct_answer',
        'explanation',
        'category',
        'difficulty',
    ];

    /**
     * The correct answer and explanation must never leak to learners through
     * accidental serialization; they are exposed explicitly where allowed.
     *
     * @var list<string>
     */
    protected $hidden = ['correct_answer', 'explanation'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function quizzes(): BelongsToMany
    {
        return $this->belongsToMany(Quiz::class, 'quiz_questions')
            ->using(QuizQuestion::class)
            ->withPivot('id', 'question_order')
            ->withTimestamps();
    }

    public function quizAnswers(): HasMany
    {
        return $this->hasMany(QuizAnswer::class);
    }

    /**
     * @return array<string, string> e.g. ['A' => 'Noun', 'B' => 'Verb', ...]
     */
    public function options(): array
    {
        return [
            'A' => $this->option_a,
            'B' => $this->option_b,
            'C' => $this->option_c,
            'D' => $this->option_d,
        ];
    }

    public function optionText(?string $key): ?string
    {
        return $key ? ($this->options()[$key] ?? null) : null;
    }

    /**
     * Full representation for the admin interface (includes the answer key).
     */
    public function toAdminArray(): array
    {
        return $this->makeVisible(['correct_answer', 'explanation'])->toArray();
    }

    public function scopeSearch($query, ?string $term)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('question_text', 'like', "%{$term}%")
                ->orWhere('contextual_sentence', 'like', "%{$term}%")
                ->orWhere('target_word', 'like', "%{$term}%");
        });
    }
}
