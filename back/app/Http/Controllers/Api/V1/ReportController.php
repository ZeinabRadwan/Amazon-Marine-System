<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Shipment;
use App\Models\User;
use App\Models\VendorBill;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function shipments(Request $request)
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, 'You do not have permission to view reports.');
        }

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
        if (! $request->user()?->can('reports.view')) {
            abort(403, 'You do not have permission to view reports.');
        }

        $totalRevenue = (float) Invoice::whereNotIn('status', ['cancelled'])->sum('net_amount');
        $totalCost = (float) VendorBill::whereNotIn('status', ['cancelled'])->sum('net_amount');

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_cost' => $totalCost,
            'total_profit' => $totalRevenue - $totalCost,
        ]);
    }

    public function salesPerformance(Request $request)
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, 'You do not have permission to view reports.');
        }

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

        $userIds = collect();
        $userIds = Shipment::whereNotNull('sales_rep_id')->distinct()->pluck('sales_rep_id')->unique()->filter()->values();

        $users = User::whereIn('id', $userIds)->get()->keyBy('id');

        $data = $userIds->map(function ($userId) use ($users, $from, $to) {
            $user = $users->get($userId);
            $shipmentsInPeriod = Shipment::where('sales_rep_id', $userId)
                ->whereBetween('created_at', [$from, $to]);
            $shipmentsCount = (int) (clone $shipmentsInPeriod)->count();
            $totalSales = (float) (clone $shipmentsInPeriod)->sum('selling_price_total');
            $netProfit = (float) (clone $shipmentsInPeriod)->sum('profit_total');

            return [
                'user_id' => $userId,
                'name' => $user?->name ?? '',
                'initials' => $user?->initials ?? '',
                'shipments_count' => $shipmentsCount,
                'total_sales' => round($totalSales, 2),
                'net_profit' => round($netProfit, 2),
            ];
        })->values()->all();

        return response()->json(['data' => $data]);
    }
}
