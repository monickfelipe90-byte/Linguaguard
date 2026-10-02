<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('linguaguard:set-password {email}', function (string $email) {
    $user = \App\Models\User::where('email', $email)->first();

    if (! $user) {
        $this->error("No user found with email {$email}.");

        return 1;
    }

    $password = $this->secret("New password for {$user->name} ({$user->role})");

    if (strlen((string) $password) < 8) {
        $this->error('The password must be at least 8 characters.');

        return 1;
    }

    $user->password = $password;
    $user->save();
    $this->info('Password updated.');

    return 0;
})->purpose('Set a new password for an existing LINGUAGUARD user');
