import { useForm, usePage } from '@inertiajs/react';
import { KeyRound, Save, UserCircle2 } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { Button, Card, CardHeader, Field, Input, PageHeader } from '../../components/ui';

export default function Edit() {
    const { auth } = usePage().props;

    const profile = useForm({ name: auth.user.name, email: auth.user.email });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });

    const saveProfile = (e) => {
        e.preventDefault();
        profile.put('/profile', { preserveScroll: true });
    };

    const savePassword = (e) => {
        e.preventDefault();
        password.put('/profile/password', {
            preserveScroll: true,
            onSuccess: () => password.reset(),
            onError: () => password.reset('current_password'),
        });
    };

    return (
        <AppLayout title="Profile">
            <PageHeader title="My profile" description={auth.user.role === 'admin' ? 'Teacher / Admin account' : 'Learner account'} />

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Account details" icon={UserCircle2} />
                    <form onSubmit={saveProfile} className="space-y-5 p-5" noValidate>
                        <Field label="Full name" htmlFor="name" error={profile.errors.name} required>
                            <Input id="name" value={profile.data.name} onChange={(e) => profile.setData('name', e.target.value)} error={profile.errors.name} />
                        </Field>
                        <Field label="Email address" htmlFor="email" error={profile.errors.email} required>
                            <Input id="email" type="email" value={profile.data.email} onChange={(e) => profile.setData('email', e.target.value)} error={profile.errors.email} />
                        </Field>
                        <Button type="submit" loading={profile.processing} icon={Save}>
                            Save changes
                        </Button>
                    </form>
                </Card>

                <Card>
                    <CardHeader title="Change password" icon={KeyRound} />
                    <form onSubmit={savePassword} className="space-y-5 p-5" noValidate>
                        <Field label="Current password" htmlFor="current_password" error={password.errors.current_password} required>
                            <Input
                                id="current_password"
                                type="password"
                                autoComplete="current-password"
                                value={password.data.current_password}
                                onChange={(e) => password.setData('current_password', e.target.value)}
                                error={password.errors.current_password}
                            />
                        </Field>
                        <Field label="New password" htmlFor="password" error={password.errors.password} hint="At least 8 characters, with letters and numbers." required>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={password.data.password}
                                onChange={(e) => password.setData('password', e.target.value)}
                                error={password.errors.password}
                            />
                        </Field>
                        <Field label="Confirm new password" htmlFor="password_confirmation" error={password.errors.password_confirmation} required>
                            <Input
                                id="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={password.data.password_confirmation}
                                onChange={(e) => password.setData('password_confirmation', e.target.value)}
                            />
                        </Field>
                        <Button type="submit" loading={password.processing} icon={KeyRound}>
                            Update password
                        </Button>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
