<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use App\Models\User;

class ActivityLogger
{
    /**
     * Log a domain activity using the Spatie activitylog package.
     *
     * @param  string  $actionKey  A machine-readable action key, e.g. 'sd_form.created'
     * @param  \Illuminate\Database\Eloquent\Model|null  $entity  The main entity this action relates to
     * @param  array<string, mixed>  $properties  Extra context (before/after, etc.)
     */
    public static function log(string $actionKey, ?Model $entity = null, array $properties = [], ?User $causer = null): void
    {
        $authUser = Auth::user();
        if ($causer === null && $authUser instanceof User) {
            $causer = $authUser;
        }

        $request = Request::instance();
        if ($request) {
            $properties = array_merge([
                'request' => [
                    'ip' => $request->ip(),
                    'method' => $request->getMethod(),
                    'path' => $request->path(),
                    'user_agent' => $request->userAgent(),
                ],
            ], $properties);
        }

        $activity = activity()
            ->event($actionKey)
            ->withProperties($properties);

        if ($causer) {
            $activity->causedBy($causer);
        }

        if ($entity) {
            $activity->performedOn($entity);
        }

        $activity->log($actionKey);
    }

    /**
     * Log a model change with before/after snapshot.
     *
     * @param  array<int, string>  $only  Optional list of attributes to include in the diff
     */
    public static function logModelChange(string $actionKey, Model $before, Model $after, array $only = []): void
    {
        $beforeData = $before->getAttributes();
        $afterData = $after->getAttributes();

        if ($only !== []) {
            $beforeData = Arr::only($beforeData, $only);
            $afterData = Arr::only($afterData, $only);
        }

        $changes = [];
        foreach ($afterData as $key => $newValue) {
            $oldValue = $beforeData[$key] ?? null;
            if ($oldValue !== $newValue) {
                $changes[$key] = [
                    'from' => $oldValue,
                    'to' => $newValue,
                ];
            }
        }

        self::log($actionKey, $after, [
            'before' => $beforeData,
            'after' => $afterData,
            'changes' => $changes,
        ]);
    }
}

