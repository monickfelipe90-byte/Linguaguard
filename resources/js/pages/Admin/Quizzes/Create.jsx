import { useForm } from '@inertiajs/react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, PageHeader } from '../../../components/ui';
import QuizForm from '../../../components/QuizForm';

export default function Create({ bank, categories, difficulties }) {
    const form = useForm({
        title: '',
        description: '',
        instructions: 'Read each sentence carefully.\nLook at the highlighted word and decide how it is used in the sentence.\nChoose the best answer from the four choices.',
        time_limit: 15,
        passing_score: 75,
        is_active: false,
        randomize_questions: false,
        randomize_choices: false,
        allow_retry: true,
        question_ids: [],
    });

    const submit = (e) => {
        e.preventDefault();
        form.post('/admin/quizzes', { preserveScroll: true });
    };

    return (
        <AppLayout title="Create Quiz">
            <PageHeader
                title="Create quiz"
                description="A unique quiz code is generated automatically when you save."
                back={<BackLink href="/admin/quizzes">Quizzes</BackLink>}
            />
            <QuizForm form={form} onSubmit={submit} bank={bank} categories={categories} difficulties={difficulties} submitLabel="Create quiz" cancelHref="/admin/quizzes" />
        </AppLayout>
    );
}
