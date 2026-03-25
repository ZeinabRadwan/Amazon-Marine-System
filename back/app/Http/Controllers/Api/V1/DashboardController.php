<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\VendorBill;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function overview(Request $request)
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view the dashboard.'));
        }

        $shipmentsByStatus = Shipment::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $shipmentsByOpsStatus = Shipment::selectRaw('operations_status, COUNT(*) as count')
            ->whereNotNull('operations_status')
            ->groupBy('operations_status')
            ->get();

        $sdFormsByStatus = SDForm::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $from = Carbon::now()->subMonths(11)->startOfMonth();

        $revenueByMonth = Invoice::whereDate('issue_date', '>=', $from)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->groupBy(fn ($inv) => $inv->issue_date?->format('Y-m-01'))
            ->map(fn ($group) => (object) ['revenue' => $group->sum('net_amount')]);

        $costByMonth = VendorBill::whereDate('bill_date', '>=', $from)
            ->get()
            ->groupBy(fn ($bill) => $bill->bill_date?->format('Y-m-01'))
            ->map(fn ($group) => (object) ['cost' => $group->sum('net_amount')]);

        $months = [];
        $cursor = $from->copy();
        while ($cursor <= now()) {
            $key = $cursor->format('Y-m-01');
            $revenue = (float) ($revenueByMonth[$key]->revenue ?? 0);
            $cost = (float) ($costByMonth[$key]->cost ?? 0);

            $months[] = [
                'month' => $key,
                'revenue' => $revenue,
                'cost' => $cost,
                'profit' => $revenue - $cost,
            ];

            $cursor->addMonth();
        }

        return response()->json([
            'shipments_by_status' => $shipmentsByStatus,
            'shipments_by_operations_status' => $shipmentsByOpsStatus,
            'sd_forms_by_status' => $sdFormsByStatus,
            'revenue_cost_profit_by_month' => $months,
        ]);
    }
}

