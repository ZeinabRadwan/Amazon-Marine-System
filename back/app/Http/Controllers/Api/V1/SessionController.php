<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDailySession;
use App\Services\AppSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SessionController extends Controller
{
    public function __construct(
        private readonly AppSettings $settings,
    ) {}

    public function today(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $targetUserId = (int) ($request->query('user_id') ?: $viewer->id);

        if ($targetUserId !== (int) $viewer->id && ! $viewer?->can('reports.view')) {
            abort(403, 'You do not have permission to view other users sessions.');
        }

        $resetHour = $this->settings->getInt(AppSettings::KEY_SESSIONS_RESET_HOUR, 0);
        $sessionDate = $this->resolveSessionDate(now(), $resetHour);

        $row = UserDailySession::query()
            ->where('user_id', $targetUserId)
            ->whereDate('session_date', $sessionDate)
            ->first();

        $user = $targetUserId === (int) $viewer->id ? $viewer : User::query()->find($targetUserId);

        return response()->json([
            'data' => [
                'session_date' => $sessionDate,
                'user_id' => $targetUserId,
                'user_name' => $user?->name,
                'first_seen_at' => $row?->first_seen_at?->toIso8601String(),
                'last_seen_at' => $row?->last_seen_at?->toIso8601String(),
                'total_active_seconds' => (int) ($row?->total_active_seconds ?? 0),
                'total_active_minutes' => (int) floor(((int) ($row?->total_active_seconds ?? 0)) / 60),
            ],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $targetUserId = (int) ($request->query('user_id') ?: $viewer->id);

        if ($targetUserId !== (int) $viewer->id && ! $viewer?->can('reports.view')) {
            abort(403, 'You do not have permission to view other users sessions.');
        }

        $query = UserDailySession::query()->where('user_id', $targetUserId);

        if ($from = $request->query('from')) {
            $query->whereDate('session_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('session_date', '<=', $to);
        }

        $rows = $query->orderByDesc('session_date')->limit(500)->get();

        return response()->json([
            'data' => $rows->map(fn (UserDailySession $r) => [
                'id' => $r->id,
                'user_id' => $r->user_id,
                'session_date' => $r->session_date?->toDateString(),
                'first_seen_at' => $r->first_seen_at?->toIso8601String(),
                'last_seen_at' => $r->last_seen_at?->toIso8601String(),
                'total_active_seconds' => (int) $r->total_active_seconds,
                'total_active_minutes' => (int) floor($r->total_active_seconds / 60),
            ]),
        ]);
    }

    public function logoutOthers(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $currentToken = $user->currentAccessToken();

        if (! $currentToken) {
            return response()->json([
                'message' => 'No current session token found.',
            ], 422);
        }

        $deleted = $user->tokens()->where('id', '!=', $currentToken->id)->delete();

        return response()->json([
            'message' => 'Other sessions logged out.',
            'deleted_tokens' => $deleted,
        ]);
    }

    private function resolveSessionDate(Carbon $now, int $resetHour): string
    {
        $resetHour = max(0, min(23, $resetHour));

        if ((int) $now->hour < $resetHour) {
            return $now->copy()->subDay()->toDateString();
        }

        return $now->toDateString();
    }
}
