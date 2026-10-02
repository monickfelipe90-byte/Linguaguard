import { useForm } from '@inertiajs/react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, PageHeader } from '../../../components/ui';
import QuestionForm from '../../../components/QuestionForm';

export default function Create({ categories, difficulties }) {
    const form = useForm({
        contextual_sentence: '',
        target_word: '',
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
        explanation: '',
        category: '',
        difficulty: 'Easy',
    });

    const submit = (e) => {
        e.preventDefault();
        form.post('/admin/questions', { preserveScroll: true });
    };

    return (
        <AppLayout title="Add Question">
            <PageHeader title="Add question" back={<BackLink href="/admin/questions">Question bank</BackLink>} />
            <QuestionForm form={form} onSubmit={submit} categories={categories} difficulties={difficulties} submitLabel="Save question" cancelHref="/admin/questions" />
        </AppLayout>
    );
}
