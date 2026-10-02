import { useForm } from '@inertiajs/react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, PageHeader } from '../../../components/ui';
import QuizForm from '../../../components/QuizForm';

export default function Edit({ quiz, selectedIds, bank, categories, difficulties, attemptsCount }) {
    const form = useForm({
        title: quiz.title,
        description: quiz.description ?? '',
        instructions: quiz.instructions ?? '',
        time_limit: quiz.time_limit,
        passing_score: quiz.passing_score,
        is_active: quiz.is_active,
        randomize_questions: quiz.randomize_questions,
        randomize_choices: quiz.randomize_choices,
        allow_retry: quiz.allow_retry,
        question_ids: selectedIds,
    });

    const submit = (e) => {
        e.preventDefault();
        form.put(`/admin/quizzes/${quiz.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout title="Edit Quiz">
            <PageHeader
                title="Edit quiz"
                description={
                    <>
                        Quiz code <span className="font-mono font-bold text-violet-700">{quiz.quiz_code}</span>
                    </>
                }
                back={<BackLink href={`/admin/quizzes/${quiz.id}`}>Back to quiz</BackLink>}
            />
            <QuizForm
                form={form}
                onSubmit={submit}
                bank={bank}
                categories={categories}
                difficulties={difficulties}
                submitLabel="Save quiz"
                cancelHref={`/admin/quizzes/${quiz.id}`}
                attemptsCount={attemptsCount}
            />
        </AppLayout>
    );
}
