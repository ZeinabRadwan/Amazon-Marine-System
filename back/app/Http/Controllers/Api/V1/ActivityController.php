<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class ActivityController extends Controller
{
    /**
     * @return class-string
     */
    private static function resolveSubjectModelClass(string $subjectType): string
    {
        $map = [
            'shipment' => Shipment::class,
        ];

        if (isset($map[$subjectType])) {
            return $map[$subjectType];
        }

        if (class_exists($subjectType)) {
            return $subjectType;
        }

        abort(422, __('Invalid subject_type.'));
    }

    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $query = Activity::query()->orderByDesc('created_at');

        $subjectTypeRaw = $request->query('subject_type');
        $subjectIdRaw = $request->query('subject_id');
        $subjectMode = $subjectTypeRaw !== null && $subjectTypeRaw !== ''
            && $subjectIdRaw !== null && $subjectIdRaw !== '';

        if ($subjectMode) {
            abort_unless(
                $viewer?->can('financial.view') || $viewer?->can('accounting.view'),
                403,
                __('You do not have permission to view activities for this subject.')
            );

            $subjectClass = self::resolveSubjectModelClass((string) $subjectTypeRaw);
            $query->where('subject_type', $subjectClass)
                ->where('subject_id', (int) $subjectIdRaw);
        } else {
            $isAdmin = $viewer?->can('reports.view') ?? false;
            $globalScope = $request->has('global') ? (bool) $request->boolean('global') : $isAdmin;

            if ($globalScope) {
                if (! $isAdmin) {
                    abort(403, __('You do not have permission to view all activities.'));
                }
            } else {
                $targetUserId = (int) ($request->query('user_id') ?: $viewer->id);

                if ($targetUserId !== (int) $viewer->id && ! $isAdmin) {
                    abort(403, __('You do not have permission to view other users activities.'));
                }

                $query->where('causer_type', User::class)
                    ->where('causer_id', $targetUserId);
            }
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($event = $request->query('event')) {
            $query->where('event', $event);
        }

        if ($search = $request->query('query')) {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('description', 'like', $like)
                    ->orWhere('event', 'like', $like);
            });
        }

        if (! $subjectMode) {
            if ($subjectTypeRaw = $request->query('subject_type')) {
                $query->where('subject_type', $subjectTypeRaw);
            }

            if ($subjectIdRaw = $request->query('subject_id')) {
                $query->where('subject_id', $subjectIdRaw);
            }
        }

        $perPage = (int) $request->query('per_page', 25);
        if ($perPage < 1) {
            $perPage = 1;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (Activity $a) => [
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
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
