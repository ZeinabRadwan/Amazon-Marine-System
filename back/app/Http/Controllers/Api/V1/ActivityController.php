<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $targetUserId = (int) ($request->query('user_id') ?: $viewer->id);

        if ($targetUserId !== (int) $viewer->id && ! $viewer?->can('reports.view')) {
            abort(403, 'You do not have permission to view other users activities.');
        }

        $query = Activity::query()->orderByDesc('created_at');

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($event = $request->query('event')) {
            $query->where('event', $event);
        }

        if ($subjectType = $request->query('subject_type')) {
            $query->where('subject_type', $subjectType);
        }

        if ($subjectId = $request->query('subject_id')) {
            $query->where('subject_id', $subjectId);
        }

        $query->where('causer_type', User::class)->where('causer_id', $targetUserId);

        $rows = $query->limit(500)->get();

        return response()->json([
            'data' => $rows->map(fn (Activity $a) => [
                'id' => $a->id,
                'event' => $a->event,
                'description' => $a->description,
                'log_name' => $a->log_name,
                'subject_type' => $a->subject_type,
                'subject_id' => $a->subject_id,
                'causer_id' => $a->causer_id,
                'properties' => $a->properties,
                'created_at' => $a->created_at?->toIso8601String(),
            ]),
        ]);
    }
}
