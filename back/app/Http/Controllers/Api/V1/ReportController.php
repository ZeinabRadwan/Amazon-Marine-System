<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\LeadSource;
use App\Models\Payment;
use App\Models\Port;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorBill;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    private const ROLE_ADMIN = 'admin';
    private const ROLE_SALES = 'sales';
    private const ROLE_OPERATIONS = 'operations';
    private const ROLE_FINANCE = 'accounting';

    private function authorizeReports(Request $request): void
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view reports.'));
        }
    }

    private function resolveRoleBucket(Request $request): string
    {
        $user = $request->user();
        if (! $user) {
            return self::ROLE_SALES;
        }
        if ($user->hasRole('admin')) {
            return self::ROLE_ADMIN;
        }
        if ($user->hasRole('accounting')) {
            return self::ROLE_FINANCE;
        }
        if ($user->hasRole('operations')) {
            return self::ROLE_OPERATIONS;
        }
        if ($user->hasRole('sales')) {
            return self::ROLE_SALES;
        }

        return self::ROLE_SALES;
    }

    private function scopedShipmentQuery(Request $request, ?Carbon $from = null, ?Carbon $to = null)
    {
        $query = Shipment::query();
        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to]);
        }

        $role = $this->resolveRoleBucket($request);
        $userId = $request->user()?->id;
        if ($role === self::ROLE_SALES && $userId) {
            $query->where('sales_rep_id', $userId);
        } elseif ($role === self::ROLE_OPERATIONS) {
            $query->whereNotNull('operations_status');
        }

        return $query;
    }

    private function defaultRange(Request $request): array
    {
        $from = $request->query('from')
            ? Carbon::parse($request->query('from'))->startOfDay()
            : now()->copy()->subMonths(5)->startOfMonth();
        $to = $request->query('to')
            ? Carbon::parse($request->query('to'))->endOfDay()
            : now()->copy()->endOfMonth();

        return [$from, $to];
    }

    public function shipments(Request $request)
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);
        $shipments = $this->scopedShipmentQuery($request, $from, $to)->get();

        $byDirection = $shipments
            ->groupBy(fn (Shipment $s) => $s->shipment_direction ?: __('Unknown'))
            ->map(fn ($group, $name) => ['name' => $name, 'count' => $group->count()])
            ->values();

        $vendorIds = $shipments->pluck('line_vendor_id')->filter()->unique()->values();
        $vendorNames = Vendor::query()->whereIn('id', $vendorIds)->pluck('name', 'id');
        $byLine = $shipments
            ->whereNotNull('line_vendor_id')
            ->groupBy('line_vendor_id')
            ->map(function ($group, $vendorId) use ($vendorNames) {
                return [
                    'vendor_id' => (int) $vendorId,
                    'name' => $vendorNames[(int) $vendorId] ?? __('Unknown'),
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('count')
            ->values();

        $portIds = $shipments->pluck('origin_port_id')->filter()->unique()->values();
        $portNames = Port::query()->whereIn('id', $portIds)->pluck('name', 'id');
        $byOrigin = $shipments
            ->whereNotNull('origin_port_id')
            ->groupBy('origin_port_id')
            ->map(function ($group, $portId) use ($portNames) {
                return [
                    'port_id' => (int) $portId,
                    'name' => $portNames[(int) $portId] ?? __('Unknown'),
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('count')
            ->values();

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'by_direction' => $byDirection,
            'by_line_vendor' => $byLine,
            'by_origin_port' => $byOrigin,
            'total_shipments' => $shipments->count(),
        ]);
    }

    public function finance(Request $request)
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);
        $role = $this->resolveRoleBucket($request);
        $shipmentIds = $this->scopedShipmentQuery($request, $from, $to)->pluck('id');

        $invoiceQuery = Invoice::query()
            ->whereNotIn('status', ['cancelled'])
            ->whereBetween('issue_date', [$from->toDateString(), $to->toDateString()]);
        $billQuery = VendorBill::query()
            ->whereNotIn('status', ['cancelled'])
            ->whereBetween('bill_date', [$from->toDateString(), $to->toDateString()]);

        if ($role === self::ROLE_SALES || $role === self::ROLE_OPERATIONS) {
            $invoiceQuery->whereIn('shipment_id', $shipmentIds);
            $billQuery->whereIn('shipment_id', $shipmentIds);
        }

        $totalRevenue = (float) $invoiceQuery->sum('net_amount');
        $totalCost = (float) $billQuery->sum('net_amount');

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_revenue' => $totalRevenue,
            'total_cost' => $totalCost,
            'total_profit' => $totalRevenue - $totalCost,
            'invoices_count' => (clone $invoiceQuery)->count(),
            'vendor_bills_count' => (clone $billQuery)->count(),
        ]);
    }

    public function salesPerformance(Request $request)
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);

        $userIds = $this->scopedShipmentQuery($request, $from, $to)
            ->whereNotNull('sales_rep_id')
            ->distinct()
            ->pluck('sales_rep_id')
            ->unique()
            ->filter()
            ->values();

        $users = User::whereIn('id', $userIds)->get()->keyBy('id');

        $data = $userIds->map(function ($userId) use ($users, $from, $to) {
            $user = $users->get($userId);
            $shipmentsInPeriod = Shipment::where('sales_rep_id', $userId)
                ->whereBetween('created_at', [$from, $to]);
            $shipmentsCount = (int) (clone $shipmentsInPeriod)->count();
            $totalSales = (float) (clone $shipmentsInPeriod)->sum('selling_price_total');
            $netProfit = (float) (clone $shipmentsInPeriod)->sum('profit_total');
            $avgDeal = $shipmentsCount > 0 ? $totalSales / $shipmentsCount : 0;

            return [
                'user_id' => $userId,
                'name' => $user?->name ?? '',
                'initials' => $user?->initials ?? '',
                'shipments_count' => $shipmentsCount,
                'total_sales' => round($totalSales, 2),
                'net_profit' => round($netProfit, 2),
                'avg_deal_size' => round($avgDeal, 2),
            ];
        })->values()->all();

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'data' => $data,
        ]);
    }

    public function teamPerformance(Request $request)
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);
        $search = $request->query('search');
        $sort = $request->query('sort', 'revenue');

        $userIds = $this->scopedShipmentQuery($request, $from, $to)
            ->whereNotNull('sales_rep_id')
            ->distinct()
            ->pluck('sales_rep_id')
            ->merge(Visit::whereBetween('visit_date', [$from, $to])->whereNotNull('user_id')->distinct()->pluck('user_id'))
            ->merge(SDForm::whereBetween('created_at', [$from, $to])->whereNotNull('sales_rep_id')->distinct()->pluck('sales_rep_id'))
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
            $avgRevenuePerShipment = $shipmentsCount > 0 ? round($revenue / $shipmentsCount, 2) : 0;

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
                'avg_revenue_per_shipment' => $avgRevenuePerShipment,
            ];
        })->filter()->values();

        if ($sort === 'revenue') {
            $data = $data->sortByDesc('revenue')->values();
        } elseif ($sort === 'conversion') {
            $data = $data->sortByDesc('conversion_rate_pct')->values();
        } elseif ($sort === 'visits') {
            $data = $data->sortByDesc('visits_count')->values();
        }

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'data' => $data,
        ]);
    }

    public function teamPerformanceExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);
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
            fputcsv($out, ['name', 'clients_count', 'sd_forms_count', 'shipments_count', 'revenue', 'avg_revenue_per_shipment', 'conversion_rate_pct', 'visits_count']);
            foreach ($rows as $row) {
                $r = (array) $row;
                fputcsv($out, [
                    $r['name'] ?? '',
                    $r['clients_count'] ?? 0,
                    $r['sd_forms_count'] ?? 0,
                    $r['shipments_count'] ?? 0,
                    $r['revenue'] ?? 0,
                    $r['avg_revenue_per_shipment'] ?? 0,
                    $r['conversion_rate_pct'] ?? 0,
                    $r['visits_count'] ?? 0,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    public function clients(Request $request)
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);
        $role = $this->resolveRoleBucket($request);
        $userId = $request->user()?->id;

        $clientQuery = Client::query();
        if ($role === self::ROLE_SALES && $userId) {
            $clientQuery->whereHas('shipments', fn ($q) => $q->where('sales_rep_id', $userId));
        }
        $totalClients = (int) (clone $clientQuery)->count();
        $newClientsInPeriod = (int) (clone $clientQuery)->whereBetween('created_at', [$from, $to])->count();

        $sdQuery = SDForm::query()->whereBetween('created_at', [$from, $to]);
        if ($role === self::ROLE_SALES && $userId) {
            $sdQuery->where('sales_rep_id', $userId);
        }
        $sdFormsCount = (int) (clone $sdQuery)->count();
        $sdFormsLinked = (int) (clone $sdQuery)->whereNotNull('linked_shipment_id')->count();
        $conversionRate = $sdFormsCount > 0 ? round($sdFormsLinked / $sdFormsCount * 100, 1) : 0.0;

        $topLead = Client::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereNotNull('lead_source_id')
            ->selectRaw('lead_source_id, COUNT(*) as count')
            ->groupBy('lead_source_id')
            ->orderByDesc('count')
            ->first();

        $topLeadSourceId = $topLead?->lead_source_id;
        $topLeadSourceName = null;
        if ($topLeadSourceId) {
            $topLeadSourceName = LeadSource::query()->whereKey($topLeadSourceId)->value('name');
        }

        $rows = (clone $clientQuery)
            ->with(['shipments' => function ($q) use ($from, $to) {
                $q->whereBetween('created_at', [$from, $to]);
            }])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(function (Client $client) {
                $shipmentsCount = (int) $client->shipments->count();
                $revenue = (float) $client->shipments->sum('selling_price_total');
                return [
                    'client_id' => $client->id,
                    'client_name' => $client->company_name ?: $client->name,
                    'shipments_count' => $shipmentsCount,
                    'revenue' => round($revenue, 2),
                    'created_at' => $client->created_at?->toDateString(),
                ];
            })->values();

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_clients' => $totalClients,
            'new_clients_in_period' => $newClientsInPeriod,
            'conversion_rate_pct' => $conversionRate,
            'top_lead_source' => $topLeadSourceName,
            'top_lead_source_count' => (int) ($topLead?->count ?? 0),
            'rows' => $rows,
        ]);
    }

    public function clientsExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);

        $clients = Client::query()
            ->with('leadSource')
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at', 'desc')
            ->limit(5000)
            ->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="clients-report-'.date('Y-m-d').'.csv"',
        ];

        return new StreamedResponse(function () use ($clients) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'name', 'company_name', 'created_at', 'lead_source', 'shipments_count', 'sales_rep_count']);
            foreach ($clients as $c) {
                $shipmentsCount = Shipment::query()->where('client_id', $c->id)->count();
                $salesRepCount = Shipment::query()->where('client_id', $c->id)->whereNotNull('sales_rep_id')->distinct('sales_rep_id')->count('sales_rep_id');
                fputcsv($out, [
                    $c->id,
                    $c->name,
                    $c->company_name,
                    $c->created_at?->format('d/m/Y'),
                    $c->leadSource?->name,
                    $shipmentsCount,
                    $salesRepCount,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    public function partnerStatements(Request $request)
    {
        $this->authorizeReports($request);

        $currency = $request->query('currency');

        $vendors = Vendor::query()->orderBy('name')->get();

        $rows = $vendors->map(function (Vendor $vendor) use ($currency) {
            $billsQuery = VendorBill::query()->where('vendor_id', $vendor->id);
            $paymentsQuery = Payment::query()->where('vendor_id', $vendor->id);

            if ($currency) {
                $billsQuery->where('currency_code', $currency);
                $paymentsQuery->where('currency_code', $currency);
            }

            $bills = $billsQuery->get();
            $payments = $paymentsQuery->get();

            $totalDue = (float) $bills->sum('total_amount');
            $paid = (float) $payments->sum('amount');
            $balance = $totalDue - $paid;

            return [
                'partner_id' => $vendor->id,
                'partner_name' => $vendor->name,
                'currency' => $currency ?: ($bills->first()->currency_code ?? null),
                'total_due' => round($totalDue, 2),
                'paid' => round($paid, 2),
                'balance' => round($balance, 2),
                'bills_count' => $bills->count(),
                'payments_count' => $payments->count(),
            ];
        })->filter(fn (array $r) => (float) ($r['balance'] ?? 0) !== 0.0)->sortByDesc('balance')->values();

        return response()->json([
            'currency' => $currency,
            'rows' => $rows,
            'top_partners' => $rows->take(6)->values(),
        ]);
    }

    public function partnerStatementsExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        $currency = $request->query('currency');
        $json = $this->partnerStatements($request)->getData(true);
        $rows = $json['rows'] ?? [];

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="partner-statements-'.date('Y-m-d').'.csv"',
        ];

        return new StreamedResponse(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['partner_name', 'currency', 'total_due', 'paid', 'balance', 'bills_count', 'payments_count']);
            foreach ($rows as $row) {
                $r = (array) $row;
                fputcsv($out, [
                    $r['partner_name'] ?? '',
                    $r['currency'] ?? '',
                    $r['total_due'] ?? 0,
                    $r['paid'] ?? 0,
                    $r['balance'] ?? 0,
                    $r['bills_count'] ?? 0,
                    $r['payments_count'] ?? 0,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    public function attendance(Request $request)
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);

        $activeEmployees = (int) User::query()->where('status', 'active')->count();

        $days = max(1, (int) $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1);
        $presentCount = (int) AttendanceRecord::query()
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->whereNotNull('check_in_at')
            ->count();
        $lateCount = (int) AttendanceRecord::query()
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->where(function ($q) {
                $q->where('status', AttendanceRecord::STATUS_LATE)->orWhere('is_late', true);
            })
            ->count();

        $totalSlots = $activeEmployees * $days;
        $absentCount = max(0, $totalSlots - $presentCount);
        $avgAttendancePct = $totalSlots > 0 ? round($presentCount / $totalSlots * 100, 1) : 0.0;

        $daily = AttendanceRecord::query()
            ->selectRaw('date, COUNT(*) as total_records, SUM(CASE WHEN check_in_at IS NOT NULL THEN 1 ELSE 0 END) as present_count, SUM(CASE WHEN status = ? OR is_late = 1 THEN 1 ELSE 0 END) as late_count', [AttendanceRecord::STATUS_LATE])
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => $r->date,
                'present' => (int) $r->present_count,
                'late' => (int) $r->late_count,
                'absent' => max(0, $activeEmployees - (int) $r->present_count),
            ])
            ->values();

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_employees' => $activeEmployees,
            'avg_attendance_pct' => $avgAttendancePct,
            'avg_attendance' => $avgAttendancePct,
            'late_count' => $lateCount,
            'absent_count' => $absentCount,
            'days' => $days,
            'attendance_trends' => $daily,
        ]);
    }

    public function attendanceExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        [$from, $to] = $this->defaultRange($request);

        $records = AttendanceRecord::query()
            ->with('user')
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('date', 'desc')
            ->limit(10000)
            ->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="attendance-report-'.date('Y-m-d').'.csv"',
        ];

        return new StreamedResponse(function () use ($records) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['date', 'employee', 'status', 'check_in_at', 'check_out_at', 'is_late', 'worked_minutes']);
            foreach ($records as $r) {
                fputcsv($out, [
                    $r->date?->format('d/m/Y'),
                    $r->user?->name,
                    $r->status,
                    $r->check_in_at?->format('d/m/Y H:i:s'),
                    $r->check_out_at?->format('d/m/Y H:i:s'),
                    $r->is_late ? 1 : 0,
                    $r->worked_minutes,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }
}
