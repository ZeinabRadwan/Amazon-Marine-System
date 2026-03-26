<?php

namespace App\Http\Middleware;

use App\Services\PagePermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPagePermission
{
    public function __construct(
        private readonly PagePermissionService $pagePermissionService,
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $page, string $action): Response
    {
        if (! config('permissions.verification_enabled')) {
            return $next($request);
        }

        $user = $request->user();

        if ($user === null || ! $this->pagePermissionService->can($user, $page, $action)) {
            abort(403, __('You do not have permission to perform this action.'));
        }

        return $next($request);
    }
}
