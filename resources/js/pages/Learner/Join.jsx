import { useForm } from '@inertiajs/react';
import { ArrowRight, KeyRound } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { Button, Card } from '../../components/ui';

export default function Join({ code }) {
    const form = useForm({ code: code || '' });

    const submit = (e) => {
        e.preventDefault();
        form.post('/join');
    };

    return (
        <AppLayout title="Join Quiz">
            <div className="mx-auto flex max-w-lg flex-col items-center py-6 sm:py-12">
                <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
                    <KeyRound className="size-8" />
                </span>
                <h1 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-slate-900">Join a quiz</h1>
                <p className="mt-2 text-center text-slate-500">Enter the quiz code your teacher shared with you.</p>

                <Card className="mt-8 w-full p-5 sm:p-8">
                    <form onSubmit={submit} noValidate>
                        <label htmlFor="code" className="block text-center text-sm font-semibold text-slate-600">
                            Quiz code
                        </label>
                        <input
                            id="code"
                            value={form.data.code}
                            onChange={(e) => form.setData('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                            maxLength={20}
                            autoFocus
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            placeholder="LG8K42"
                            aria-invalid={form.errors.code ? true : undefined}
                            aria-describedby={form.errors.code ? 'code-error' : undefined}
                            className={`mt-2 block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-center font-mono text-3xl font-extrabold tracking-[0.3em] text-slate-900 uppercase ring-2 ring-inset placeholder:text-slate-300 focus:bg-white focus:ring-indigo-600 sm:text-4xl ${
                                form.errors.code ? 'animate-shake ring-rose-400' : 'ring-slate-200'
                            }`}
                        />
                        {form.errors.code && (
                            <p id="code-error" className="mt-3 text-center text-sm font-semibold text-rose-600" role="alert">
                                {form.errors.code}
                            </p>
                        )}
                        <Button type="submit" size="xl" className="mt-6 w-full" loading={form.processing} disabled={!form.data.code}>
                            {form.processing ? 'Finding quiz…' : 'Continue'} {!form.processing && <ArrowRight className="size-5" />}
                        </Button>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
