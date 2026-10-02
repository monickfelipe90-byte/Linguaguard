import { useForm } from '@inertiajs/react';
import AppLayout from '../../../layouts/AppLayout';
import { BackLink, PageHeader } from '../../../components/ui';
import QuestionForm from '../../../components/QuestionForm';

export default function Edit({ question, categories, difficulties }) {
    const form = useForm({
        contextual_sentence: question.contextual_sentence,
        target_word: question.target_word,
        question_text: question.question_text,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_answer: question.correct_answer,
        explanation: question.explanation ?? '',
        category: question.category,
        difficulty: question.difficulty,
    });

    const submit = (e) => {
        e.preventDefault();
        form.put(`/admin/questions/${question.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout title="Edit Question">
            <PageHeader title="Edit question" back={<BackLink href={`/admin/questions/${question.id}`}>Back to question</BackLink>} />
            <QuestionForm
                form={form}
                onSubmit={submit}
                categories={categories}
                difficulties={difficulties}
                submitLabel="Save changes"
                cancelHref={`/admin/questions/${question.id}`}
            />
        </AppLayout>
    );
}
