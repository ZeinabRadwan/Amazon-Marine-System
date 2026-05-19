<?php

use App\Http\Middleware\CheckPagePermission;
use App\Http\Middleware\SetApiLocale;
use App\Http\Middleware\TrackUserSessionActivity;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            SetApiLocale::class,
        ]);

        $middleware->alias([
            'page_permission' => CheckPagePermission::class,
            'track_session' => TrackUserSessionActivity::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);

        $middleware->redirectGuestsTo(function ($request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->is('api')) {
                return null;
            }

            return '/login';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (AuthenticationException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->is('api')) {
                return response()->json([
                    'message' => $e->getMessage() ?: __('Unauthenticated.'),
                ], 401);
            }
        });

        $exceptions->shouldRenderJsonWhen(function ($request, $e) {
            return $request->expectsJson() || $request->is('api/*') || $request->is('api');
        });

        $exceptions->renderable(function (AuthorizationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $e->getMessage() ?: __('You are not authorized to perform this action.'),
                ], 403);
            }
        });

        $exceptions->renderable(function (HttpExceptionInterface $e, $request) {
            if ($e->getStatusCode() === 403 && $request->expectsJson()) {
                return response()->json([
                    'message' => $e->getMessage() ?: __('You do not have permission to access this resource.'),
                ], 403);
            }
        });

        $exceptions->renderable(function (NotFoundHttpException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->is('api')) {
                return response()->json([
                    'message' => __('The requested API route could not be found.'),
                ], 404);
            }
        });
    })->create();
