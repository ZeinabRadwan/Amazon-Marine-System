<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\LeadSource;
use App\Models\Payment;
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
    private function authorizeReports(Request $request): void
    {
        if (! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view reports.'));
        }
    }

    public function shipments(Request $request)
    {
        $this->authorizeReports($request);

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
        $this->authorizeReports($request);

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
        $this->authorizeReports($request);

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
        $this->authorizeReports($request);

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
        $this->authorizeReports($request);

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

    public function clients(Request $request)
    {
        $this->authorizeReports($request);

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

        $totalClients = (int) Client::query()->count();
        $newClientsInPeriod = (int) Client::query()->whereBetween('created_at', [$from, $to])->count();

        $sdFormsCount = (int) SDForm::query()->whereBetween('created_at', [$from, $to])->count();
        $sdFormsLinked = (int) SDForm::query()->whereNotNull('linked_shipment_id')->whereBetween('created_at', [$from, $to])->count();
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

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_clients' => $totalClients,
            'new_clients_in_period' => $newClientsInPeriod,
            'conversion_rate_pct' => $conversionRate,
            'top_lead_source' => $topLeadSourceName,
            'top_lead_source_count' => (int) ($topLead?->count ?? 0),
        ]);
    }

    public function clientsExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

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
            fputcsv($out, ['id', 'name', 'company_name', 'created_at', 'lead_source']);
            foreach ($clients as $c) {
                fputcsv($out, [
                    $c->id,
                    $c->name,
                    $c->company_name,
                    $c->created_at?->toDateString(),
                    $c->leadSource?->name,
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
            ];
        })->filter(fn (array $r) => (float) ($r['balance'] ?? 0) !== 0.0)->sortByDesc('balance')->values();

        return response()->json([
            'currency' => $currency,
            'top_partners' => $rows->take(6)->values(),
        ]);
    }

    public function partnerStatementsExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        $currency = $request->query('currency');
        $json = $this->partnerStatements($request)->getData(true);
        $rows = $json['top_partners'] ?? [];

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="partner-statements-'.date('Y-m-d').'.csv"',
        ];

        return new StreamedResponse(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['partner_name', 'currency', 'total_due', 'paid', 'balance']);
            foreach ($rows as $row) {
                $r = (array) $row;
                fputcsv($out, [
                    $r['partner_name'] ?? '',
                    $r['currency'] ?? '',
                    $r['total_due'] ?? 0,
                    $r['paid'] ?? 0,
                    $r['balance'] ?? 0,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }

    public function attendance(Request $request)
    {
        $this->authorizeReports($request);

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

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

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_employees' => $activeEmployees,
            'avg_attendance_pct' => $avgAttendancePct,
            'late_count' => $lateCount,
            'absent_count' => $absentCount,
            'days' => $days,
        ]);
    }

    public function attendanceExport(Request $request): StreamedResponse
    {
        $this->authorizeReports($request);

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

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
                    $r->date?->toDateString(),
                    $r->user?->name,
                    $r->status,
                    $r->check_in_at?->toDateTimeString(),
                    $r->check_out_at?->toDateTimeString(),
                    $r->is_late ? 1 : 0,
                    $r->worked_minutes,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }
}
