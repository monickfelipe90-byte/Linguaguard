<?php

namespace Database\Seeders;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Safe, idempotent seeder: it only inserts records that do not exist yet,
 * so it can be run against the populated linguaguard_db without duplicating
 * the existing users, questions or quizzes.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->orderBy('id')->first();

        if (! $admin) {
            $admin = User::firstOrNew(['email' => 'admin@linguaguard.test']);
            $admin->name = 'LINGUAGUARD Administrator';
            $admin->password = 'Admin@12345';
            $admin->role = User::ROLE_ADMIN;
            $admin->save();
            $this->command?->info('Created admin@linguaguard.test (password: Admin@12345)');
        }

        if (! User::where('role', User::ROLE_LEARNER)->exists()) {
            $learner = new User(['name' => 'Juan Dela Cruz', 'email' => 'learner1@linguaguard.test', 'password' => 'Learner@12345']);
            $learner->role = User::ROLE_LEARNER;
            $learner->save();
            $this->command?->info('Created learner1@linguaguard.test (password: Learner@12345)');
        }

        foreach ($this->sampleQuestions() as $row) {
            $exists = Question::where('contextual_sentence', $row['contextual_sentence'])
                ->where('target_word', $row['target_word'])
                ->exists();

            if (! $exists) {
                $question = new Question($row);
                $question->created_by = $admin->id;
                $question->save();
            }
        }

        $title = 'Parts of Speech Starter Quiz';
        if (! Quiz::where('title', $title)->exists() && Question::exists()) {
            $quiz = new Quiz([
                'title' => $title,
                'description' => 'Identify the part of speech of the highlighted word in each sentence.',
                'instructions' => "Read each sentence carefully.\nLook at the highlighted word and decide how it is used in the sentence.\nChoose the best answer from the four choices.",
                'time_limit' => 10,
                'passing_score' => 75,
                'is_active' => true,
                'randomize_questions' => false,
                'randomize_choices' => false,
                'allow_retry' => true,
            ]);
            $quiz->created_by = $admin->id;
            $quiz->quiz_code = Quiz::generateUniqueCode();
            $quiz->save();
            $quiz->syncOrderedQuestions(Question::orderBy('id')->take(10)->pluck('id')->all());
            $this->command?->info("Created demo quiz \"{$title}\" with code {$quiz->quiz_code}");
        }
    }

    /**
     * The same starter questions that ship in linguaguard_db (skipped when present).
     */
    private function sampleQuestions(): array
    {
        $q = fn ($sentence, $word, $a, $b, $c, $d, $correct, $explanation, $category) => [
            'contextual_sentence' => $sentence,
            'target_word' => $word,
            'question_text' => "What part of speech is the word \"{$word}\"?",
            'option_a' => $a, 'option_b' => $b, 'option_c' => $c, 'option_d' => $d,
            'correct_answer' => $correct,
            'explanation' => $explanation,
            'category' => $category,
            'difficulty' => 'Easy',
        ];

        return [
            $q('The teacher explained the lesson clearly.', 'teacher', 'Noun', 'Verb', 'Adjective', 'Adverb', 'A', '"Teacher" names a person, so it is a noun.', 'Noun'),
            $q('The students quickly answered the question.', 'quickly', 'Adjective', 'Adverb', 'Verb', 'Noun', 'B', '"Quickly" describes how the students answered, so it is an adverb.', 'Adverb'),
            $q('The class visited a beautiful garden.', 'beautiful', 'Noun', 'Verb', 'Adjective', 'Adverb', 'C', '"Beautiful" describes the noun "garden", so it is an adjective.', 'Adjective'),
            $q('They completed their project before lunch.', 'They', 'Pronoun', 'Noun', 'Conjunction', 'Verb', 'A', '"They" takes the place of the people doing the action, so it is a pronoun.', 'Pronoun'),
            $q('Ana studied her English lesson last night.', 'studied', 'Noun', 'Verb', 'Adverb', 'Preposition', 'B', '"Studied" shows the action Ana did, so it is a verb.', 'Verb'),
            $q('The book is under the table.', 'under', 'Adverb', 'Preposition', 'Conjunction', 'Adjective', 'B', '"Under" shows the relationship between the book and the table, so it is a preposition.', 'Preposition'),
            $q('John and Mark worked together.', 'and', 'Preposition', 'Interjection', 'Conjunction', 'Pronoun', 'C', '"And" joins the two nouns "John" and "Mark", so it is a conjunction.', 'Conjunction'),
            $q('Wow! That was an amazing performance.', 'Wow', 'Adjective', 'Interjection', 'Noun', 'Adverb', 'B', '"Wow" expresses strong feeling, so it is an interjection.', 'Interjection'),
        ];
    }
}
