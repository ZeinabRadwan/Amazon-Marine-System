<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'page_permission' => \App\Http\Middleware\CheckPagePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (AuthorizationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'You are not authorized to perform this action.',
                ], 403);
            }
        });

        $exceptions->renderable(function (HttpExceptionInterface $e, $request) {
            if ($e->getStatusCode() === 403 && $request->expectsJson()) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'You do not have permission to access this resource.',
                ], 403);
            }
        });
    })->create();
