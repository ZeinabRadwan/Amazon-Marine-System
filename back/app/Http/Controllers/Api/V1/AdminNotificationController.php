<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = NotificationLog::query()->orderByDesc('created_at');

        if ($event = $request->query('event_key')) {
            $query->where('event_key', $event);
        }

        if ($channel = $request->query('channel')) {
            $query->where('channel', $channel);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($recipientId = $request->query('user_id')) {
            $query->where('recipient_id', (int) $recipientId);
        }

        if ($causerId = $request->query('causer_id')) {
            $query->where('causer_id', (int) $causerId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($entityType = $request->query('entity_type')) {
            $query->where('notifiable_type', $entityType);
        }

        if ($entityId = $request->query('entity_id')) {
            $query->where('notifiable_id', (int) $entityId);
        }

        $perPage = (int) $request->query('per_page', 25);
        if ($perPage < 1) {
            $perPage = 1;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $paginator = $query->with(['causer', 'recipient'])->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()->map(function (NotificationLog $log) {
                return [
                    'id' => $log->id,
                    'event_key' => $log->event_key,
                    'channel' => $log->channel,
                    'status' => $log->status,
                    'error_message' => $log->error_message,
                    'payload' => $log->payload,
                    'causer_id' => $log->causer_id,
                    'causer_name' => $log->causer?->name,
                    'recipient_id' => $log->recipient_id,
                    'recipient_name' => $log->recipient?->name,
                    'notifiable_type' => $log->notifiable_type,
                    'notifiable_id' => $log->notifiable_id,
                    'sent_at' => $log->sent_at?->toIso8601String(),
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            }),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(NotificationLog $notificationLog): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $log = $notificationLog->load(['causer', 'recipient']);

        return response()->json([
            'data' => [
                'id' => $log->id,
                'event_key' => $log->event_key,
                'channel' => $log->channel,
                'status' => $log->status,
                'error_message' => $log->error_message,
                'payload' => $log->payload,
                'causer_id' => $log->causer_id,
                'causer_name' => $log->causer?->name,
                'recipient_id' => $log->recipient_id,
                'recipient_name' => $log->recipient?->name,
                'notifiable_type' => $log->notifiable_type,
                'notifiable_id' => $log->notifiable_id,
                'sent_at' => $log->sent_at?->toIso8601String(),
                'created_at' => $log->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = NotificationLog::query();

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $byEvent = (clone $query)
            ->selectRaw('event_key, COUNT(*) as count')
            ->groupBy('event_key')
            ->orderByDesc('count')
            ->get();

        $byChannel = (clone $query)
            ->selectRaw('channel, COUNT(*) as count')
            ->groupBy('channel')
            ->get();

        $byStatus = (clone $query)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $total = (clone $query)->count();

        return response()->json([
            'data' => [
                'total' => $total,
                'by_event' => $byEvent->map(fn ($row) => [
                    'event_key' => $row->event_key,
                    'count' => (int) $row->count,
                ]),
                'by_channel' => $byChannel->map(fn ($row) => [
                    'channel' => $row->channel,
                    'count' => (int) $row->count,
                ]),
                'by_status' => $byStatus->map(fn ($row) => [
                    'status' => $row->status,
                    'count' => (int) $row->count,
                ]),
            ],
        ]);
    }
}

