<?php

namespace Database\Factories;

use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Question>
 */
class QuestionFactory extends Factory
{
    public function definition(): array
    {
        $word = fake()->unique()->word();

        return [
            'contextual_sentence' => "The {$word} was on the table.",
            'target_word' => $word,
            'question_text' => "What part of speech is the word \"{$word}\"?",
            'option_a' => 'Noun',
            'option_b' => 'Verb',
            'option_c' => 'Adjective',
            'option_d' => 'Adverb',
            'correct_answer' => 'A',
            'explanation' => "\"{$word}\" names a thing, so it is a noun.",
            'category' => 'Noun',
            'difficulty' => 'Easy',
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Question $question) {
            $question->created_by ??= User::factory()->admin()->create()->id;
        });
    }
}
