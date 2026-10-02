import { Head, usePage } from '@inertiajs/react';
import { FileQuestion, Lock, ServerCrash, Wrench } from 'lucide-react';
import Logo from '../components/Logo';
import { LinkButton } from '../components/ui';

const content = {
    403: { icon: Lock, title: 'Access denied', text: 'You do not have permission to access this page.' },
    404: { icon: FileQuestion, title: 'Page not found', text: 'The page you are looking for does not exist or may have been moved.' },
    500: { icon: ServerCrash, title: 'Something went wrong', text: 'An unexpected error occurred on our side. Please try again in a moment.' },
    503: { icon: Wrench, title: 'Under maintenance', text: 'LINGUAGUARD is being updated. Please check back shortly.' },
};

export default function Error({ status, message }) {
    const { auth } = usePage().props;
    const c = content[status] ?? content[500];

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
            <Head title={c.title} />
            <Logo className="mb-10" />
            <span className="grid size-16 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
                <c.icon className="size-8" />
            </span>
            <p className="mt-6 text-sm font-bold tracking-widest text-violet-600">ERROR {status}</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{c.title}</h1>
            <p className="mt-3 max-w-md text-slate-600">{message || c.text}</p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                <LinkButton href={auth?.user ? '/dashboard' : '/'}>{auth?.user ? 'Back to my dashboard' : 'Go to home page'}</LinkButton>
            </div>
        </div>
    );
}
