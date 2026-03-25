<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanManageAttendanceExcuses
{
    /**
     * Allow excuse review when the user has attendance.excuses.manage or full attendance.admin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if (! $user->can('attendance.excuses.manage') && ! $user->can('attendance.admin')) {
            abort(403, __('You do not have permission to manage attendance excuses.'));
        }

        return $next($request);
    }
}
