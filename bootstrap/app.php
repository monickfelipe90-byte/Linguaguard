<?php

use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        // Hosts like Railway terminate HTTPS at a proxy; trust it so URLs and assets use https.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(fn (Request $request) => route($request->user()->homeRoute()));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Friendly Inertia error pages instead of raw framework errors.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();

            if ($status === 419) {
                return back()->with('error', 'Your session expired. Please try again.');
            }

            $friendly = [403, 404, 503];
            if (! app()->hasDebugModeEnabled()) {
                $friendly[] = 500;
            }

            if (in_array($status, $friendly, true) && ! $request->expectsJson()) {
                $message = $status === 403 && $e->getMessage() !== '' && ! str_starts_with($e->getMessage(), 'This action')
                    ? $e->getMessage()
                    : null;

                return Inertia::render('Error', ['status' => $status, 'message' => $message])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
