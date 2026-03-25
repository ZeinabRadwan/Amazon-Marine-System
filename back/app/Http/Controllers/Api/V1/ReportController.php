<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use App\Models\VendorBill;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function shipments(Request $request)
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view reports.'));
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
            abort(403, __('You do not have permission to view reports.'));
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
            abort(403, __('You do not have permission to view reports.'));
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

    public function teamPerformance(Request $request)
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view reports.'));
        }

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();
        $search = $request->query('search');
        $sort = $request->query('sort', 'revenue');

        $userIds = Shipment::whereNotNull('sales_rep_id')->whereBetween('created_at', [$from, $to])->distinct()->pluck('sales_rep_id')
            ->merge(Visit::whereBetween('visit_date', [$from, $to])->whereNotNull('user_id')->distinct()->pluck('user_id'))
            ->merge(SDForm::whereNotNull('sales_rep_id')->distinct()->pluck('sales_rep_id'))
            ->unique()->filter()->values();

        $users = User::whereIn('id', $userIds)->get()->keyBy('id');
        if ($search) {
            $users = $users->filter(fn (User $u) => stripos($u->name ?? '', $search) !== false);
            $userIds = $users->keys();
        }

        $data = $userIds->map(function ($userId) use ($users, $from, $to) {
            $user = $users->get($userId);
            if (! $user) {
                return null;
            }
            $shipmentsInPeriod = Shipment::where('sales_rep_id', $userId)->whereBetween('created_at', [$from, $to]);
            $shipmentsCount = (int) (clone $shipmentsInPeriod)->count();
            $revenue = (float) (clone $shipmentsInPeriod)->sum('selling_price_total');
            $clientsCount = (int) (clone $shipmentsInPeriod)->distinct('client_id')->count('client_id');
            $sdFormsCount = (int) SDForm::where('sales_rep_id', $userId)->whereBetween('created_at', [$from, $to])->count();
            $sdFormsLinked = (int) SDForm::where('sales_rep_id', $userId)->whereNotNull('linked_shipment_id')->whereBetween('created_at', [$from, $to])->count();
            $conversionRate = $sdFormsCount > 0 ? round($sdFormsLinked / $sdFormsCount * 100, 1) : 0;
            $visitsCount = (int) Visit::where('user_id', $userId)->whereBetween('visit_date', [$from, $to])->count();

            return [
                'user_id' => $userId,
                'name' => $user->name ?? '',
                'initials' => $user->initials ?? '',
                'clients_count' => $clientsCount,
                'sd_forms_count' => $sdFormsCount,
                'shipments_count' => $shipmentsCount,
                'revenue' => round($revenue, 2),
                'conversion_rate_pct' => $conversionRate,
                'visits_count' => $visitsCount,
                'avg_response_time_hours' => null,
            ];
        })->filter()->values();

        if ($sort === 'revenue') {
            $data = $data->sortByDesc('revenue')->values();
        } elseif ($sort === 'conversion') {
            $data = $data->sortByDesc('conversion_rate_pct')->values();
        } elseif ($sort === 'visits') {
            $data = $data->sortByDesc('visits_count')->values();
        }

        return response()->json(['data' => $data]);
    }

    public function teamPerformanceExport(Request $request): StreamedResponse
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view reports.'));
        }

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();
        $search = $request->query('search');
        $sort = $request->query('sort', 'revenue');

        $request->merge(['from' => $from->toDateString(), 'to' => $to->toDateString()]);
        $response = $this->teamPerformance($request);
        $json = $response->getData(true);
        $rows = $json['data'] ?? [];

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="team-performance-'.date('Y-m-d').'.csv"',
        ];

        return new StreamedResponse(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['name', 'clients_count', 'sd_forms_count', 'shipments_count', 'revenue', 'conversion_rate_pct', 'visits_count']);
            foreach ($rows as $row) {
                $r = (array) $row;
                fputcsv($out, [
                    $r['name'] ?? '',
                    $r['clients_count'] ?? 0,
                    $r['sd_forms_count'] ?? 0,
                    $r['shipments_count'] ?? 0,
                    $r['revenue'] ?? 0,
                    $r['conversion_rate_pct'] ?? 0,
                    $r['visits_count'] ?? 0,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }
}
