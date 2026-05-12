<?php

namespace App\Support;

use App\Models\ShipmentOperationTask;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Single place for shipment operation task totals used by list + dashboard payloads.
 * Mirrors front-end rules in `front/src/pages/Shipments/shipmentOperationTaskUi.js` (completed / overdue).
 */
final class ShipmentOperationTaskSummary
{
    public static function isCompleted(ShipmentOperationTask $t): bool
    {
        $s = strtolower(trim((string) ($t->status ?? '')));

        return $s === 'completed' || $s === 'done';
    }

    /**
     * Overdue: not completed, has effective calendar day from execution_at (date) or due_date, strictly before today.
     */
    public static function isOverdue(ShipmentOperationTask $t, CarbonInterface $todayStart): bool
    {
        if (self::isCompleted($t)) {
            return false;
        }

        $eff = self::effectiveDayStart($t);
        if ($eff === null) {
            return false;
        }

        return $eff->lt($todayStart);
    }

    private static function effectiveDayStart(ShipmentOperationTask $t): ?Carbon
    {
        if ($t->execution_at) {
            return $t->execution_at->copy()->startOfDay();
        }
        if ($t->due_date) {
            return $t->due_date instanceof Carbon
                ? $t->due_date->copy()->startOfDay()
                : Carbon::parse($t->due_date)->startOfDay();
        }

        return null;
    }

    /**
     * @return array{total: int, completed: int, overdue: int}
     */
    public static function forShipmentId(int $shipmentId): array
    {
        $map = self::aggregateForShipmentIds([$shipmentId]);

        return $map[$shipmentId] ?? ['total' => 0, 'completed' => 0, 'overdue' => 0];
    }

    /**
     * @param  list<int>  $shipmentIds
     * @return array<int, array{total: int, completed: int, overdue: int}>
     */
    public static function aggregateForShipmentIds(array $shipmentIds): array
    {
        $shipmentIds = array_values(array_unique(array_filter(array_map('intval', $shipmentIds))));
        if ($shipmentIds === []) {
            return [];
        }

        $today = Carbon::today()->startOfDay();

        $rows = ShipmentOperationTask::query()
            ->whereIn('shipment_id', $shipmentIds)
            ->get(['shipment_id', 'status', 'due_date', 'execution_at']);

        $byShipment = [];
        foreach ($rows as $t) {
            $sid = (int) $t->shipment_id;
            $byShipment[$sid][] = $t;
        }

        $out = [];
        foreach ($shipmentIds as $sid) {
            $list = $byShipment[$sid] ?? [];
            $total = count($list);
            $completed = 0;
            $overdue = 0;
            foreach ($list as $task) {
                if (self::isCompleted($task)) {
                    $completed++;
                } elseif (self::isOverdue($task, $today)) {
                    $overdue++;
                }
            }
            $out[$sid] = [
                'total' => $total,
                'completed' => $completed,
                'overdue' => $overdue,
            ];
        }

        return $out;
    }
}
