<?php

namespace Database\Factories;

use App\Models\Quiz;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quiz>
 */
class QuizFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->sentence(),
            'instructions' => 'Read each sentence carefully.',
            'time_limit' => 10,
            'passing_score' => 75,
            'is_active' => true,
            'randomize_questions' => false,
            'randomize_choices' => false,
            'allow_retry' => true,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Quiz $quiz) {
            $quiz->quiz_code ??= Quiz::generateUniqueCode();
            $quiz->created_by ??= User::factory()->admin()->create()->id;
        });
    }
}
