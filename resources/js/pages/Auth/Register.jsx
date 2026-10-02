import { Head, Link, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Button, Field, Input } from '../../components/ui';

export default function Register() {
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '' });

    const submit = (e) => {
        e.preventDefault();
        form.post('/register', { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <AuthLayout title="Create your learner account" subtitle="Join quizzes from your teacher and track your progress.">
            <Head title="Register" />
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Full name" htmlFor="name" error={form.errors.name} required>
                    <Input id="name" autoComplete="name" autoFocus value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                </Field>
                <Field label="Email address" htmlFor="email" error={form.errors.email} required>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        error={form.errors.email}
                    />
                </Field>
                <Field label="Password" htmlFor="password" error={form.errors.password} hint="At least 8 characters, with letters and numbers." required>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        error={form.errors.password}
                    />
                </Field>
                <Field label="Confirm password" htmlFor="password_confirmation" error={form.errors.password_confirmation} required>
                    <Input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                        error={form.errors.password_confirmation}
                    />
                </Field>

                <Button type="submit" size="lg" className="w-full" loading={form.processing} icon={UserPlus}>
                    {form.processing ? 'Creating account…' : 'Create account'}
                </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Log in
                </Link>
            </p>
        </AuthLayout>
    );
}
