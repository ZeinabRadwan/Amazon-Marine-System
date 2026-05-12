<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentOperationTask;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class OperationsDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasAnyRole(['admin', 'operations']), 403);

        $validated = $request->validate([
            'upcoming_window' => ['nullable', 'string', Rule::in(['tomorrow', '3_days', 'week', 'month'])],
        ]);

        $window = $validated['upcoming_window'] ?? 'week';
        $user = $request->user();

        $taskBase = ShipmentOperationTask::query()
            ->whereNull('completed_at')
            ->where(function ($q) {
                $q->whereNotNull('due_date')->orWhereNotNull('execution_at');
            });

        $this->scopeTasksForUser($taskBase, $user);

        $eff = 'COALESCE(shipment_operation_tasks.due_date, DATE(shipment_operation_tasks.execution_at))';

        $overdueQuery = (clone $taskBase)->whereRaw("$eff < ?", [Carbon::today()->toDateString()]);
        $todayQuery = (clone $taskBase)->whereRaw("$eff = ?", [Carbon::today()->toDateString()]);
        $todayStr = Carbon::today()->toDateString();
        $upcomingQuery = (clone $taskBase)->whereRaw("$eff > ?", [$todayStr]);
        $this->applyUpcomingWindow($upcomingQuery, $eff, $window);

        $overdueCount = (clone $overdueQuery)->count();
        $todayCount = (clone $todayQuery)->count();
        $upcomingCount = (clone $upcomingQuery)->count();

        $shipmentBase = Shipment::query();
        $this->scopeShipmentsForUser($shipmentBase, $user);
        $activeShipments = (clone $shipmentBase)
            ->where(function ($q) {
                $q->whereNull('status')
                    ->orWhere(function ($inner) {
                        $inner->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%deliver%'])
                            ->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%تسليم%'])
                            ->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%cancel%']);
                    });
            })
            ->count();

        return response()->json([
            'data' => [
                'stats' => [
                    'overdue_tasks' => $overdueCount,
                    'today_tasks' => $todayCount,
                    'upcoming_tasks' => $upcomingCount,
                    'upcoming_window' => $window,
                    'active_shipments' => $activeShipments,
                ],
                'tables' => [
                    'overdue' => $this->serializeTasks($overdueQuery->clone()->orderByRaw("$eff ASC")->limit(150)->get()),
                    'today' => $this->serializeTasks($todayQuery->clone()->orderByRaw("$eff ASC")->limit(150)->get()),
                    'upcoming' => $this->serializeTasks($upcomingQuery->clone()->orderByRaw("$eff ASC")->limit(150)->get()),
                ],
            ],
        ]);
    }

    /**
     * Compact KPI counts for the Shipments page (operations role only, not admin).
     * Uses `shipment_operation_tasks`: effective calendar day = DATE(execution_at) or due_date;
     * open tasks = status != completed and completed_at is null; visibility = unassigned pool or assigned to current user.
     */
    public function shipmentPageKpis(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->hasRole('operations') && ! $user->hasRole('admin'), 403);

        $today = Carbon::today()->toDateString();
        $uid = $user->id;

        $eff = 'COALESCE(DATE(shipment_operation_tasks.execution_at), shipment_operation_tasks.due_date)';

        $base = ShipmentOperationTask::query()
            ->where(function ($q) {
                $q->whereNull('shipment_operation_tasks.status')
                    ->orWhere('shipment_operation_tasks.status', '!=', 'completed');
            })
            ->whereNull('shipment_operation_tasks.completed_at')
            ->whereRaw("{$eff} IS NOT NULL")
            ->where(function ($q) use ($uid) {
                $q->whereNull('shipment_operation_tasks.assigned_to_id')
                    ->orWhere('shipment_operation_tasks.assigned_to_id', $uid);
            });

        $this->scopeTasksForUser($base, $user);

        $todayCount = (clone $base)->whereRaw("{$eff} = ?", [$today])->count();
        $overdueCount = (clone $base)->whereRaw("{$eff} < ?", [$today])->count();

        return response()->json([
            'data' => [
                'today_tasks' => $todayCount,
                'overdue_tasks' => $overdueCount,
            ],
        ]);
    }

    /**
     * @param  Builder<ShipmentOperationTask>  $query
     */
    private function scopeTasksForUser($query, User $user): void
    {
        if ($user->hasRole('operations') && ! $user->hasRole('admin')) {
            $query->whereHas('shipment', function ($q) {
                $q->whereHas('sdForm', function ($s) {
                    $s->where('status', 'sent_to_operations');
                });
            });
        }
    }

    /**
     * @param  Builder<Shipment>  $query
     */
    private function scopeShipmentsForUser($query, User $user): void
    {
        if ($user->hasRole('operations') && ! $user->hasRole('admin')) {
            $query->whereHas('sdForm', function ($s) {
                $s->where('status', 'sent_to_operations');
            });
        }
    }

    /**
     * @param  Builder<ShipmentOperationTask>  $query
     */
    private function applyUpcomingWindow($query, string $eff, string $window): void
    {
        if ($window === 'tomorrow') {
            $d = Carbon::tomorrow()->toDateString();
            $query->whereRaw("$eff = ?", [$d]);

            return;
        }

        $end = match ($window) {
            '3_days' => Carbon::today()->addDays(3)->toDateString(),
            'month' => Carbon::today()->addDays(30)->toDateString(),
            default => Carbon::today()->addDays(7)->toDateString(),
        };

        $query->whereRaw("$eff <= ?", [$end]);
    }

    /**
     * @param  Collection<int, ShipmentOperationTask>  $rows
     * @return list<array<string, mixed>>
     */
    private function serializeTasks($rows): array
    {
        $rows->loadMissing(['shipment:id,booking_number,bl_number,status', 'assignedTo:id,name']);

        return $rows->map(function (ShipmentOperationTask $t) {
            $ship = $t->shipment;
            $ref = $ship?->booking_number ?: $ship?->bl_number;
            if (! $ref) {
                $ref = $ship ? '#'.$ship->id : '—';
            }
            $due = $t->due_date?->toDateString();
            if (! $due && $t->execution_at) {
                $due = $t->execution_at->toDateString();
            }

            return [
                'id' => $t->id,
                'name' => $t->name,
                'shipment_id' => $t->shipment_id,
                'shipment_ref' => $ref,
                'due_date' => $due,
                'execution_at' => $t->execution_at?->toIso8601String(),
                'priority' => $t->priority ?? 'medium',
                'status' => $t->status ?? 'pending',
                'completed_at' => $t->completed_at?->toIso8601String(),
                'assigned_to' => $t->assignedTo ? [
                    'id' => $t->assignedTo->id,
                    'name' => $t->assignedTo->name,
                ] : null,
            ];
        })->values()->all();
    }
}
