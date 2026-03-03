<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Shipment;
use App\Models\VendorBill;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function shipments(Request $request)
    {
        abort_unless($request->user()?->can('reports.view'), 403);

        $byDirection = Shipment::selectRaw('shipment_direction, COUNT(*) as count')
            ->groupBy('shipment_direction')
            ->get();

        $byLine = Shipment::selectRaw('line_vendor_id, COUNT(*) as count')
            ->groupBy('line_vendor_id')
            ->get();

        $byOrigin = Shipment::selectRaw('origin_port_id, COUNT(*) as count')
            ->groupBy('origin_port_id')
            ->get();

        return response()->json([
            'by_direction' => $byDirection,
            'by_line_vendor' => $byLine,
            'by_origin_port' => $byOrigin,
        ]);
    }

    public function finance(Request $request)
    {
        abort_unless($request->user()?->can('reports.view'), 403);

        $totalRevenue = (float) Invoice::whereNotIn('status', ['cancelled'])->sum('net_amount');
        $totalCost = (float) VendorBill::whereNotIn('status', ['cancelled'])->sum('net_amount');

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_cost' => $totalCost,
            'total_profit' => $totalRevenue - $totalCost,
        ]);
    }
}

