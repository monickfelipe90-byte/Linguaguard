import { Head } from '@inertiajs/react';
import { BookOpenCheck, GraduationCap, HelpCircle, ListChecks } from 'lucide-react';
import PublicLayout from '../layouts/PublicLayout';
import { LinkButton } from '../components/ui';

const sections = [
    {
        icon: HelpCircle,
        title: 'What is LINGUAGUARD?',
        body: (
            <p>
                LINGUAGUARD is a web-based quiz tool for practicing the parts of speech. Instead of memorizing word lists, learners read a complete
                sentence and decide how one highlighted word is used in that sentence — because the same word can be a noun in one sentence and a verb in
                another.
            </p>
        ),
    },
    {
        icon: GraduationCap,
        title: 'Who is it for?',
        body: (
            <ul className="list-disc space-y-1 pl-5">
                <li>
                    <strong>Grade 8 learners</strong> who join quizzes, answer questions and review their results.
                </li>
                <li>
                    <strong>Teachers (admins)</strong> who write questions, build quizzes, share quiz codes and monitor scores.
                </li>
            </ul>
        ),
    },
    {
        icon: BookOpenCheck,
        title: 'What does it teach?',
        body: (
            <p>
                Contextual identification of the eight parts of speech: noun, pronoun, verb, adjective, adverb, preposition, conjunction and interjection.
                Every question includes an explanation, so learners understand <em>why</em> an answer is correct.
            </p>
        ),
    },
    {
        icon: ListChecks,
        title: 'How does the quiz work?',
        body: (
            <ol className="list-decimal space-y-1 pl-5">
                <li>Log in and enter the quiz code your teacher gives you.</li>
                <li>Read the quiz details and instructions, then press Start Quiz. The timer starts on the server.</li>
                <li>For each question, read the sentence, look at the highlighted word and choose one of four answers.</li>
                <li>You see right away whether you were correct, along with the explanation.</li>
                <li>Submit when you finish — or the quiz submits automatically when time runs out.</li>
                <li>Review your score, percentage, and every answer. Past attempts stay in your Quiz History.</li>
            </ol>
        ),
    },
];

export default function About() {
    return (
        <PublicLayout>
            <Head title="About" />
            <section className="bg-gradient-to-b from-indigo-50 to-white">
                <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">About LINGUAGUARD</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">An online quiz platform for practicing parts of speech in context.</p>
                </div>
            </section>
            <section className="mx-auto max-w-4xl space-y-5 px-4 pb-16 sm:px-6">
                {sections.map((s) => (
                    <article key={s.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
                        <div className="flex items-center gap-3">
                            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                                <s.icon className="size-5" />
                            </span>
                            <h2 className="text-xl font-bold text-slate-900">{s.title}</h2>
                        </div>
                        <div className="mt-4 leading-relaxed text-slate-600">{s.body}</div>
                    </article>
                ))}
                <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
                    <LinkButton href="/join" size="lg">
                        Join a Quiz
                    </LinkButton>
                    <LinkButton href="/register" size="lg" variant="secondary">
                        Create an account
                    </LinkButton>
                </div>
            </section>
        </PublicLayout>
    );
}
