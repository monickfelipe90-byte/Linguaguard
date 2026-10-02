<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\QuestionRequest;
use App\Models\Question;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuestionController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::in(Question::CATEGORIES)],
            'difficulty' => ['nullable', Rule::in(Question::DIFFICULTIES)],
        ]);

        $questions = Question::query()
            ->search($filters['search'] ?? null)
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($filters['difficulty'] ?? null, fn ($q, $v) => $q->where('difficulty', $v))
            ->withCount(['quizzes', 'quizAnswers'])
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Question $q) => $q->toAdminArray());

        return Inertia::render('Admin/Questions/Index', [
            'questions' => $questions,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'category' => $filters['category'] ?? '',
                'difficulty' => $filters['difficulty'] ?? '',
            ],
            'categories' => Question::CATEGORIES,
            'difficulties' => Question::DIFFICULTIES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Questions/Create', $this->formOptions());
    }

    public function store(QuestionRequest $request): RedirectResponse
    {
        $question = new Question($request->validated());
        $question->created_by = $request->user()->id;
        $question->save();

        return redirect()->route('admin.questions.show', $question)->with('success', 'Question added to the bank.');
    }

    public function show(Question $question): Response
    {
        $question->load('creator:id,name')->loadCount(['quizAnswers', 'quizAnswers as correct_answers_count' => fn ($q) => $q->where('is_correct', true)]);

        return Inertia::render('Admin/Questions/Show', [
            'question' => $question->toAdminArray(),
            'quizzes' => $question->quizzes()->get(['quizzes.id', 'title', 'quiz_code', 'is_active']),
        ]);
    }

    public function edit(Question $question): Response
    {
        return Inertia::render('Admin/Questions/Edit', [
            'question' => $question->toAdminArray(),
            ...$this->formOptions(),
        ]);
    }

    public function update(QuestionRequest $request, Question $question): RedirectResponse
    {
        $question->update($request->validated());

        return redirect()->route('admin.questions.show', $question)->with('success', 'Question updated.');
    }

    public function destroy(Question $question): RedirectResponse
    {
        if ($question->quizAnswers()->exists()) {
            return back()->with('error', 'This question already has recorded learner answers, so it cannot be deleted without losing results.');
        }

        DB::transaction(function () use ($question) {
            $quizzes = $question->quizzes()->get();
            $question->quizzes()->detach();

            // Close the gap in each affected quiz's question order.
            foreach ($quizzes as $quiz) {
                $quiz->syncOrderedQuestions($quiz->questions()->pluck('questions.id')->all());
            }

            $question->delete();
        });

        return redirect()->route('admin.questions.index')->with('success', 'Question deleted.');
    }

    private function formOptions(): array
    {
        return [
            'categories' => Question::CATEGORIES,
            'difficulties' => Question::DIFFICULTIES,
        ];
    }
}
