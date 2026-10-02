<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class QuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => is_string($this->input('title')) ? trim($this->input('title')) : $this->input('title'),
            'is_active' => $this->boolean('is_active'),
            'randomize_questions' => $this->boolean('randomize_questions'),
            'randomize_choices' => $this->boolean('randomize_choices'),
            'allow_retry' => $this->boolean('allow_retry'),
            'question_ids' => array_values((array) $this->input('question_ids', [])),
        ]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'instructions' => ['nullable', 'string', 'max:4000'],
            'time_limit' => ['required', 'integer', 'min:1', 'max:300'],
            'passing_score' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
            'randomize_questions' => ['boolean'],
            'randomize_choices' => ['boolean'],
            'allow_retry' => ['boolean'],
            'question_ids' => ['array', 'max:200'],
            'question_ids.*' => ['integer', 'distinct', 'exists:questions,id'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->boolean('is_active') && count((array) $this->input('question_ids')) === 0) {
                    $validator->errors()->add('is_active', 'Add at least one question before activating this quiz.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Please give the quiz a title.',
            'time_limit.min' => 'The time limit must be at least 1 minute.',
            'time_limit.max' => 'The time limit cannot exceed 300 minutes.',
            'passing_score.min' => 'The passing score must be between 0 and 100.',
            'passing_score.max' => 'The passing score must be between 0 and 100.',
            'question_ids.*.distinct' => 'A question can only be added to a quiz once.',
            'question_ids.*.exists' => 'One of the selected questions no longer exists.',
        ];
    }
}
