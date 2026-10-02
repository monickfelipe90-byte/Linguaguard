<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\QuizRequest;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Support\PerformanceStats;
use App\Support\Present;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuizController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $quizzes = Quiz::query()
            ->search($filters['search'] ?? null)
            ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->where('is_active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn ($q) => $q->where('is_active', false))
            ->withCount(['quizQuestions as questions_count', 'attempts'])
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Quizzes/Index', [
            'quizzes' => $quizzes,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Quizzes/Create', [
            'bank' => $this->questionBank(),
            'categories' => Question::CATEGORIES,
            'difficulties' => Question::DIFFICULTIES,
        ]);
    }

    public function store(QuizRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $quiz = DB::transaction(function () use ($data, $request) {
            $quiz = new Quiz(collect($data)->except('question_ids')->all());
            $quiz->created_by = $request->user()->id;
            $this->saveWithUniqueCode($quiz);
            $quiz->syncOrderedQuestions($data['question_ids']);

            return $quiz;
        });

        return redirect()->route('admin.quizzes.show', $quiz)
            ->with('success', "Quiz created. Share the code {$quiz->quiz_code} with your learners.");
    }

    public function show(Quiz $quiz): Response
    {
        $quiz->load('creator:id,name');

        $attempts = $quiz->attempts()->with('user')->latest('id')->take(10)->get();

        return Inertia::render('Admin/Quizzes/Show', [
            'quiz' => $quiz,
            'questions' => $quiz->questions()->get()->map(fn (Question $q) => [
                ...$q->toAdminArray(),
                'question_order' => $q->pivot->question_order,
            ]),
            'performance' => PerformanceStats::summary(QuizAttempt::where('quiz_attempts.quiz_id', $quiz->id)),
            'recentAttempts' => $attempts->map(fn ($a) => Present::attempt($a->setRelation('quiz', $quiz))),
            'attemptsCount' => $quiz->attempts()->count(),
        ]);
    }

    public function edit(Quiz $quiz): Response
    {
        return Inertia::render('Admin/Quizzes/Edit', [
            'quiz' => $quiz,
            'selectedIds' => $quiz->questions()->pluck('questions.id'),
            'bank' => $this->questionBank(),
            'categories' => Question::CATEGORIES,
            'difficulties' => Question::DIFFICULTIES,
            'attemptsCount' => $quiz->attempts()->count(),
        ]);
    }

    public function update(QuizRequest $request, Quiz $quiz): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($quiz, $data) {
            $quiz->update(collect($data)->except('question_ids')->all());
            $quiz->syncOrderedQuestions($data['question_ids']);
        });

        return redirect()->route('admin.quizzes.show', $quiz)->with('success', 'Quiz saved.');
    }

    public function toggle(Quiz $quiz): RedirectResponse
    {
        if (! $quiz->is_active && ! $quiz->quizQuestions()->exists()) {
            return back()->with('error', 'Add at least one question before activating this quiz.');
        }

        $quiz->is_active = ! $quiz->is_active;
        $quiz->save();

        return back()->with('success', $quiz->is_active
            ? "\"{$quiz->title}\" is now active. Learners can join with code {$quiz->quiz_code}."
            : "\"{$quiz->title}\" has been deactivated.");
    }

    public function regenerateCode(Quiz $quiz): RedirectResponse
    {
        $this->saveWithUniqueCode($quiz);

        return back()->with('success', "New quiz code: {$quiz->quiz_code}");
    }

    public function destroy(Quiz $quiz): RedirectResponse
    {
        if ($quiz->attempts()->exists()) {
            return back()->with('error', 'This quiz has learner attempts. Deactivate it instead so their results are kept.');
        }

        $quiz->delete(); // quiz_questions rows cascade in the database

        return redirect()->route('admin.quizzes.index')->with('success', 'Quiz deleted.');
    }

    private function saveWithUniqueCode(Quiz $quiz): void
    {
        // The unique index is the final authority; retry if another request took the same code.
        for ($try = 0; $try < 5; $try++) {
            $quiz->quiz_code = Quiz::generateUniqueCode();
            try {
                $quiz->save();

                return;
            } catch (UniqueConstraintViolationException $e) {
                if ($try === 4) {
                    throw $e;
                }
            }
        }
    }

    private function questionBank(): array
    {
        return Question::orderBy('category')->orderBy('id')
            ->get(['id', 'question_text', 'contextual_sentence', 'target_word', 'category', 'difficulty'])
            ->toArray();
    }
}
