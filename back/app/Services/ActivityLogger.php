<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

class ActivityLogger
{
    /**
     * Log a domain activity using the Spatie activitylog package.
     *
     * @param  string  $actionKey  A machine-readable action key, e.g. 'sd_form.created'
     * @param  \Illuminate\Database\Eloquent\Model|null  $entity  The main entity this action relates to
     * @param  array<string, mixed>  $properties  Extra context (before/after, etc.)
     */
    public static function log(string $actionKey, ?Model $entity = null, array $properties = []): void
    {
        $causer = auth()->user();

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
}

