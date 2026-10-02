import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Button, Field, Input } from '../../components/ui';

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm({ email: '', password: '', remember: false });

    const submit = (e) => {
        e.preventDefault();
        form.post('/login', { onFinish: () => form.reset('password') });
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Log in to continue to LINGUAGUARD.">
            <Head title="Login" />
            <form onSubmit={submit} className="space-y-5" noValidate>
                <Field label="Email address" htmlFor="email" error={form.errors.email}>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        error={form.errors.email}
                        placeholder="you@school.edu"
                    />
                </Field>

                <Field label="Password" htmlFor="password" error={form.errors.password}>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            error={form.errors.password}
                            className="pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                    </div>
                </Field>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                        type="checkbox"
                        checked={form.data.remember}
                        onChange={(e) => form.setData('remember', e.target.checked)}
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Remember me
                </label>

                <Button type="submit" size="lg" className="w-full" loading={form.processing} icon={LogIn}>
                    {form.processing ? 'Logging in…' : 'Log in'}
                </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
                New learner?{' '}
                <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Create an account
                </Link>
            </p>
        </AuthLayout>
    );
}
