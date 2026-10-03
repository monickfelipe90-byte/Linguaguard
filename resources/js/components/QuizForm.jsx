import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowDown, ArrowUp, BookMarked, ListPlus, Plus, Save, Search, ShieldCheck, X } from 'lucide-react';
import { Button, Card, EmptyState, Field, Input, Select, TextArea, Toggle, cx } from './ui';
import { CategoryBadge, DifficultyBadge, HighlightedSentence } from './quiz';

export default function QuizForm({ form, onSubmit, bank, categories, difficulties, submitLabel, cancelHref, attemptsCount = 0 }) {
    const { data, setData, errors, processing } = form;
    const questionErrors = Object.entries(errors)
        .filter(([k]) => k.startsWith('question_ids'))
        .map(([, v]) => v);

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="space-y-5 p-5 sm:p-6 lg:col-span-2">
                    <h2 className="font-bold text-slate-900">Quiz details</h2>
                    <Field label="Title" htmlFor="title" error={errors.title} required>
                        <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} error={errors.title} placeholder="Parts of Speech: Quarter 1 Review" />
                    </Field>
                    <Field label="Description" htmlFor="description" error={errors.description}>
                        <TextArea id="description" rows={2} value={data.description} onChange={(e) => setData('description', e.target.value)} error={errors.description} />
                    </Field>
                    <Field label="Instructions" htmlFor="instructions" error={errors.instructions} hint="Shown to learners before they start. One instruction per line.">
                        <TextArea id="instructions" rows={4} value={data.instructions} onChange={(e) => setData('instructions', e.target.value)} error={errors.instructions} />
                    </Field>
                </Card>

                <Card className="space-y-5 p-5 sm:p-6">
                    <h2 className="font-bold text-slate-900">Settings</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Time limit (min)" htmlFor="time_limit" error={errors.time_limit} required>
                            <Input id="time_limit" type="number" min={1} max={300} inputMode="numeric" value={data.time_limit} onChange={(e) => setData('time_limit', e.target.value)} error={errors.time_limit} />
                        </Field>
                        <Field label="Passing score (%)" htmlFor="passing_score" error={errors.passing_score} required>
                            <Input id="passing_score" type="number" min={0} max={100} step="0.01" inputMode="decimal" value={data.passing_score} onChange={(e) => setData('passing_score', e.target.value)} error={errors.passing_score} />
                        </Field>
                    </div>
                    <div className="space-y-2">
                        <Toggle id="is_active" checked={data.is_active} onChange={(v) => setData('is_active', v)} label="Active" description="Learners can join with the quiz code." />
                        {errors.is_active && <p className="text-sm font-medium text-rose-600">{errors.is_active}</p>}
                        <Toggle id="allow_retry" checked={data.allow_retry} onChange={(v) => setData('allow_retry', v)} label="Allow retries" description="Learners may take the quiz again." />
                    </div>
                </Card>
            </div>

            <Card className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                        <ShieldCheck className="size-5" aria-hidden />
                    </span>
                    <div>
                        <h2 className="font-bold text-slate-900">Quiz security settings</h2>
                        <p className="text-sm text-slate-500">Discourage cheating and record activity for your review. Learners are told about these settings before they start.</p>
                    </div>
                </div>
                <div className="mt-5 grid gap-2 md:grid-cols-2">
                    <Toggle
                        id="tab_detection_enabled"
                        checked={data.tab_detection_enabled}
                        onChange={(v) => setData('tab_detection_enabled', v)}
                        label="Tab-switch detection"
                        description="Record when a learner leaves the quiz page and show a warning."
                    />
                    <div className={cx('rounded-xl p-3 ring-1 ring-slate-200', !data.tab_detection_enabled && 'opacity-50')}>
                        <Field label="Maximum tab switches" htmlFor="max_tab_switches" error={errors.max_tab_switches} hint="Warnings are shown before this; reaching it flags the attempt for review.">
                            <Input
                                id="max_tab_switches"
                                type="number"
                                min={1}
                                max={20}
                                inputMode="numeric"
                                value={data.max_tab_switches}
                                onChange={(e) => setData('max_tab_switches', e.target.value)}
                                error={errors.max_tab_switches}
                                disabled={!data.tab_detection_enabled}
                                className="max-w-32"
                            />
                        </Field>
                    </div>
                    <div className={!data.tab_detection_enabled ? 'pointer-events-none opacity-50' : undefined}>
                        <Toggle
                            id="auto_submit_on_flag"
                            checked={data.auto_submit_on_flag}
                            onChange={(v) => setData('auto_submit_on_flag', v)}
                            label="Automatic submission"
                            description="Submit the quiz automatically when the maximum is reached. Off: the learner keeps going and the attempt is only flagged."
                        />
                    </div>
                    <Toggle id="randomize_questions" checked={data.randomize_questions} onChange={(v) => setData('randomize_questions', v)} label="Randomize questions" description="Each attempt gets its own question order, kept for the whole attempt." />
                    <Toggle id="randomize_choices" checked={data.randomize_choices} onChange={(v) => setData('randomize_choices', v)} label="Randomize choices" description="Shuffle the four answer choices. Scoring is unaffected." />
                </div>
            </Card>

            {attemptsCount > 0 && (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    {attemptsCount} attempt(s) have already been recorded for this quiz. Changing its questions does not change those saved results.
                </p>
            )}

            <QuestionPicker
                bank={bank}
                selected={data.question_ids}
                onChange={(ids) => setData('question_ids', ids)}
                categories={categories}
                difficulties={difficulties}
                errors={questionErrors}
            />

            <div className="sticky bottom-0 z-20 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-2xl sm:border sm:px-4">
                <Link href={cancelHref} className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 font-semibold text-slate-600 hover:bg-slate-100">
                    Cancel
                </Link>
                <Button type="submit" size="lg" loading={processing} icon={Save}>
                    {processing ? 'Saving…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}

function QuestionPicker({ bank, selected, onChange, categories, difficulties, errors }) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [difficulty, setDifficulty] = useState('');

    const byId = useMemo(() => Object.fromEntries(bank.map((q) => [q.id, q])), [bank]);
    const selectedSet = new Set(selected);

    const available = bank.filter((q) => {
        if (selectedSet.has(q.id)) return false;
        if (category && q.category !== category) return false;
        if (difficulty && q.difficulty !== difficulty) return false;
        if (search) {
            const s = search.toLowerCase();
            return [q.contextual_sentence, q.target_word, q.question_text].some((t) => t.toLowerCase().includes(s));
        }
        return true;
    });

    const add = (id) => !selectedSet.has(id) && onChange([...selected, id]);
    const remove = (id) => onChange(selected.filter((x) => x !== id));
    const move = (index, delta) => {
        const next = [...selected];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <div id="questions" className="grid scroll-mt-20 gap-6 lg:grid-cols-2">
            <Card className="flex flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-bold text-slate-900">Quiz questions</h2>
                        <p className="text-sm text-slate-500">Use the arrows to set the order.</p>
                    </div>
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white tabular-nums">{selected.length} selected</span>
                </div>
                {errors.length > 0 && (
                    <div className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm font-medium text-rose-700">
                        {errors.map((e, i) => (
                            <p key={i}>{e}</p>
                        ))}
                    </div>
                )}
                {selected.length === 0 ? (
                    <EmptyState icon={ListPlus} title="No questions selected." description="Add questions from the question bank." />
                ) : (
                    <ol className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                        {selected.map((id, index) => {
                            const q = byId[id];
                            if (!q) return null;
                            return (
                                <li key={id} className="flex items-center gap-3 px-4 py-3">
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">{index + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-slate-800">
                                            <HighlightedSentence sentence={q.contextual_sentence} word={q.target_word} />
                                        </p>
                                        <div className="mt-1 flex gap-1.5">
                                            <CategoryBadge category={q.category} />
                                            <DifficultyBadge difficulty={q.difficulty} />
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                        <IconBtn label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                                            <ArrowUp className="size-4" />
                                        </IconBtn>
                                        <IconBtn label="Move down" onClick={() => move(index, 1)} disabled={index === selected.length - 1}>
                                            <ArrowDown className="size-4" />
                                        </IconBtn>
                                        <IconBtn label="Remove from quiz" onClick={() => remove(id)} danger>
                                            <X className="size-4" />
                                        </IconBtn>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Card>

            <Card className="flex flex-col">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-slate-900">Question bank</h2>
                            <p className="text-sm text-slate-500">{available.length} available</p>
                        </div>
                        {available.length > 0 && (
                            <Button variant="soft" size="sm" icon={Plus} onClick={() => onChange([...selected, ...available.map((q) => q.id)])}>
                                Add all shown
                            </Button>
                        )}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input type="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search question bank" />
                        </div>
                        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                            <option value="">All categories</option>
                            {categories.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </Select>
                        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
                            <option value="">All levels</option>
                            {difficulties.map((d) => (
                                <option key={d}>{d}</option>
                            ))}
                        </Select>
                    </div>
                </div>
                {bank.length === 0 ? (
                    <EmptyState
                        icon={BookMarked}
                        title="No questions found."
                        description="Your question bank is empty."
                        action={
                            <Link href="/admin/questions/create" className="font-semibold text-indigo-600">
                                Add a question
                            </Link>
                        }
                    />
                ) : available.length === 0 ? (
                    <EmptyState icon={Search} title="No matching questions." description="All matching questions are already in this quiz." />
                ) : (
                    <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                        {available.map((q) => (
                            <li key={q.id}>
                                <button type="button" onClick={() => add(q.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-slate-800">
                                            <HighlightedSentence sentence={q.contextual_sentence} word={q.target_word} />
                                        </p>
                                        <div className="mt-1 flex gap-1.5">
                                            <CategoryBadge category={q.category} />
                                            <DifficultyBadge difficulty={q.difficulty} />
                                        </div>
                                    </div>
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white" aria-label="Add to quiz">
                                        <Plus className="size-4" />
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

function IconBtn({ children, label, danger, ...props }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={cx(
                'grid size-10 place-items-center rounded-lg transition disabled:opacity-30',
                danger ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-500 hover:bg-slate-100',
            )}
            {...props}
        >
            {children}
        </button>
    );
}
