<?php

namespace App\Http\Middleware;

use App\Models\UserDailySession;
use App\Services\AppSettings;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class TrackUserSessionActivity
{
    public function __construct(
        private readonly AppSettings $settings,
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $token = $user->currentAccessToken();

        $now = now();
        $resetHour = $this->settings->getInt(AppSettings::KEY_SESSIONS_RESET_HOUR, 0);
        $idleLogoutMinutes = $this->settings->getInt(AppSettings::KEY_SESSIONS_IDLE_LOGOUT_MINUTES, 30);
        $idleLogoutSeconds = max(1, $idleLogoutMinutes) * 60;

        $sessionDate = $this->resolveSessionDate($now, $resetHour);

        $shouldLogout = false;

        DB::transaction(function () use ($user, $token, $now, $sessionDate, $idleLogoutSeconds, &$shouldLogout): void {
            $row = UserDailySession::query()
                ->where('user_id', $user->id)
                ->whereDate('session_date', $sessionDate)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                $row = UserDailySession::query()->create([
                    'user_id' => $user->id,
                    'session_date' => $sessionDate,
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                    'total_active_seconds' => 0,
                ]);

                return;
            }

            if ($row->first_seen_at === null) {
                $row->first_seen_at = $now;
            }

            if ($row->last_seen_at !== null) {
                $deltaSeconds = $row->last_seen_at->diffInSeconds($now);

                if ($deltaSeconds > $idleLogoutSeconds) {
                    // If this is a *new* Sanctum token created after the last activity,
                    // reset the daily session instead of expiring immediately.
                    if ($token && $token->created_at && $row->last_seen_at && $token->created_at->gt($row->last_seen_at)) {
                        $row->first_seen_at = $now;
                        $row->last_seen_at = $now;
                        $row->total_active_seconds = 0;
                        $row->save();

                        return;
                    }

                    $shouldLogout = true;

                    return;
                }

                $row->total_active_seconds = (int) $row->total_active_seconds + $deltaSeconds;
            }

            $row->last_seen_at = $now;
            $row->save();
        });

        if ($shouldLogout) {
            $token = $user->currentAccessToken();
            if ($token) {
                $user->tokens()->whereKey($token->id)->delete();
            }

            return response()->json([
                'message' => 'Session expired due to inactivity.',
            ], 401);
        }

        return $next($request);
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
