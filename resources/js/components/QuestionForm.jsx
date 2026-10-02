import { Link } from '@inertiajs/react';
import { Check, Save } from 'lucide-react';
import { Button, Card, Field, Input, Select, TextArea, cx } from './ui';
import { HighlightedSentence } from './quiz';

const letters = ['A', 'B', 'C', 'D'];

export default function QuestionForm({ form, onSubmit, categories, difficulties, submitLabel, cancelHref }) {
    const { data, setData, errors, processing } = form;

    return (
        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3" noValidate>
            <div className="space-y-6 lg:col-span-2">
                <Card className="space-y-5 p-5 sm:p-6">
                    <h2 className="font-bold text-slate-900">Sentence & question</h2>
                    <Field
                        label="Contextual sentence"
                        htmlFor="contextual_sentence"
                        error={errors.contextual_sentence}
                        hint="A full sentence that shows how the target word is used."
                        required
                    >
                        <TextArea
                            id="contextual_sentence"
                            rows={2}
                            value={data.contextual_sentence}
                            onChange={(e) => setData('contextual_sentence', e.target.value)}
                            error={errors.contextual_sentence}
                            placeholder="The students quickly answered the question."
                        />
                    </Field>
                    <Field label="Target word" htmlFor="target_word" error={errors.target_word} hint="Must appear in the sentence; it will be highlighted." required>
                        <Input
                            id="target_word"
                            value={data.target_word}
                            onChange={(e) => setData('target_word', e.target.value)}
                            error={errors.target_word}
                            placeholder="quickly"
                        />
                    </Field>
                    <Field label="Question" htmlFor="question_text" error={errors.question_text} required>
                        <Input
                            id="question_text"
                            value={data.question_text}
                            onChange={(e) => setData('question_text', e.target.value)}
                            error={errors.question_text}
                            placeholder='What part of speech is the word "quickly"?'
                        />
                    </Field>
                </Card>

                <Card className="space-y-4 p-5 sm:p-6">
                    <div>
                        <h2 className="font-bold text-slate-900">Answer choices</h2>
                        <p className="text-sm text-slate-500">Enter four choices and mark the correct one.</p>
                    </div>
                    {errors.correct_answer && <p className="text-sm font-medium text-rose-600">{errors.correct_answer}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {letters.map((letter) => {
                            const key = `option_${letter.toLowerCase()}`;
                            const isCorrect = data.correct_answer === letter;
                            return (
                                <div key={letter} className={cx('rounded-xl p-3 ring-2 transition', isCorrect ? 'bg-emerald-50/60 ring-emerald-400' : 'ring-slate-200')}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <label htmlFor={key} className="text-sm font-bold text-slate-700">
                                            Option {letter} <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setData('correct_answer', letter)}
                                            className={cx(
                                                'inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition',
                                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                            )}
                                            aria-pressed={isCorrect}
                                        >
                                            <Check className="size-3.5" /> {isCorrect ? 'Correct answer' : 'Mark correct'}
                                        </button>
                                    </div>
                                    <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} error={errors[key]} />
                                    {errors[key] && <p className="mt-1 text-sm font-medium text-rose-600">{errors[key]}</p>}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="p-5 sm:p-6">
                    <Field label="Explanation" htmlFor="explanation" error={errors.explanation} hint="Shown to learners after they answer." required>
                        <TextArea
                            id="explanation"
                            rows={3}
                            value={data.explanation}
                            onChange={(e) => setData('explanation', e.target.value)}
                            error={errors.explanation}
                            placeholder='"Quickly" describes how the students answered, so it is an adverb.'
                        />
                    </Field>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="space-y-5 p-5 sm:p-6">
                    <h2 className="font-bold text-slate-900">Classification</h2>
                    <Field label="Category (part of speech)" htmlFor="category" error={errors.category} required>
                        <Select id="category" value={data.category} onChange={(e) => setData('category', e.target.value)} error={errors.category}>
                            <option value="">Select a category</option>
                            {categories.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Difficulty" error={errors.difficulty} required>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulty">
                            {difficulties.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    role="radio"
                                    aria-checked={data.difficulty === d}
                                    onClick={() => setData('difficulty', d)}
                                    className={cx(
                                        'min-h-11 rounded-xl text-sm font-bold ring-1 transition',
                                        data.difficulty === d ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50',
                                    )}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </Field>
                </Card>

                <Card className="p-5 sm:p-6">
                    <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-500 uppercase">Learner preview</h2>
                    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-center">
                        <p className="rounded-lg bg-white p-3 font-semibold text-slate-800">
                            {data.contextual_sentence ? <HighlightedSentence sentence={data.contextual_sentence} word={data.target_word} /> : <span className="text-slate-400">Your sentence…</span>}
                        </p>
                        <p className="mt-2 text-sm text-indigo-100">{data.question_text || 'Your question…'}</p>
                    </div>
                </Card>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button type="submit" size="lg" loading={processing} icon={Save} className="flex-1">
                        {processing ? 'Saving…' : submitLabel}
                    </Button>
                    <Link href={cancelHref} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl font-semibold text-slate-600 hover:bg-slate-100">
                        Cancel
                    </Link>
                </div>
            </div>
        </form>
    );
}
