<?php

namespace App\Http\Requests;

use App\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class QuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['question_text', 'contextual_sentence', 'target_word', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        if (is_string($this->input('correct_answer'))) {
            $trimmed['correct_answer'] = strtoupper(trim($this->input('correct_answer')));
        }

        $this->merge($trimmed);
    }

    public function rules(): array
    {
        return [
            'contextual_sentence' => ['required', 'string', 'max:1000'],
            'target_word' => ['required', 'string', 'max:255'],
            'question_text' => ['required', 'string', 'max:1000'],
            'option_a' => ['required', 'string', 'max:255'],
            'option_b' => ['required', 'string', 'max:255'],
            'option_c' => ['required', 'string', 'max:255'],
            'option_d' => ['required', 'string', 'max:255'],
            'correct_answer' => ['required', Rule::in(Question::CHOICES)],
            'explanation' => ['required', 'string', 'max:2000'],
            'category' => ['required', Rule::in(Question::CATEGORIES)],
            'difficulty' => ['required', Rule::in(Question::DIFFICULTIES)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $sentence = (string) $this->input('contextual_sentence');
                $word = (string) $this->input('target_word');
                if ($sentence !== '' && $word !== '' && mb_stripos($sentence, $word) === false) {
                    $validator->errors()->add('target_word', 'The target word must appear in the contextual sentence.');
                }

                $options = array_map(
                    fn ($o) => mb_strtolower(trim((string) $o)),
                    [$this->input('option_a'), $this->input('option_b'), $this->input('option_c'), $this->input('option_d')]
                );
                if (! in_array('', $options, true) && count(array_unique($options)) < 4) {
                    $validator->errors()->add('option_a', 'All four choices must be different.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'correct_answer.in' => 'The correct answer must be A, B, C, or D.',
            'category.in' => 'Please choose a valid part of speech.',
            'difficulty.in' => 'Please choose Easy, Medium, or Hard.',
        ];
    }

    public function attributes(): array
    {
        return [
            'question_text' => 'question',
            'option_a' => 'option A',
            'option_b' => 'option B',
            'option_c' => 'option C',
            'option_d' => 'option D',
        ];
    }
}
