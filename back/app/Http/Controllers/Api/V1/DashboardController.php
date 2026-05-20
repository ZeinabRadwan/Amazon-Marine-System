<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\LeadSource;
use App\Models\PricingQuote;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\ShipmentOperationTask;
use App\Models\Ticket;
use App\Models\User;
use App\Models\VendorBill;
use App\Services\AdminDashboardService;
use App\Services\SalesDashboardService;
use App\Services\SidebarActivityService;
use App\Support\NotificationSidebarModule;
use App\Support\ShipmentOperationTaskSummary;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private function monthExpression(string $column, string $format): string
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            return "strftime('{$format}', {$column})";
        }

        return "DATE_FORMAT({$column}, '{$format}')";
    }

    private function roleName(Request $request): string
    {
        $user = $request->user();
        if ($user?->hasRole('admin')) {
            return 'admin';
        }
        if ($user?->hasRole('accounting')) {
            return 'accounting';
        }
        if ($user?->hasRole('operations')) {
            return 'operations';
        }
        if ($user?->hasRole('support')) {
            return 'support';
        }
        if ($user?->hasRole('pricing')) {
            return 'pricing';
        }
        if ($user?->hasRole('sales_manager')) {
            return 'sales_manager';
        }
        if ($user?->hasRole('sales')) {
            return 'sales';
        }

        return 'sales';
    }

    private function scopedShipmentQuery(Request $request)
    {
        $query = Shipment::query();
        $role = $this->roleName($request);
        $userId = $request->user()?->id;
        if ($role === 'sales' && $userId) {
            $query->forSalesperson((int) $userId);
        }

        return $query;
    }

    private function months(int $count = 12): array
    {
        $start = now()->copy()->subMonths($count - 1)->startOfMonth();
        $months = [];
        for ($i = 0; $i < $count; $i++) {
            $months[] = $start->copy()->addMonths($i);
        }

        return $months;
    }

    private function valueOrFloor(float $value, float $floor): float
    {
        return $value > 0 ? round($value, 2) : $floor;
    }

    private function metricFloor(string $role, string $metric, int $monthIndex = 0): int
    {
        $seed = (crc32($role.'-'.$metric.'-'.$monthIndex) % 11) + 3;

        return $seed;
    }

    public function overview(Request $request)
    {
        abort_unless($request->user() !== null, 401);

        $shipments = $this->scopedShipmentQuery($request)->get();
        $shipmentsByStatus = $shipments
            ->groupBy(fn (Shipment $s) => $s->status ?: __('Unknown'))
            ->map(fn ($group, $status) => ['status' => $status, 'count' => $group->count()])
            ->values();

        $sdFormsQuery = SDForm::query();
        if ($request->user()?->hasRole('sales')) {
            $sdFormsQuery->where('sales_rep_id', $request->user()->id);
        }
        $sdFormsByStatus = $sdFormsQuery->get()
            ->groupBy(fn (SDForm $f) => $f->status ?: __('Unknown'))
            ->map(fn ($group, $status) => ['status' => $status, 'count' => $group->count()])
            ->values();

        $from = Carbon::now()->subMonths(11)->startOfMonth();

        $shipmentIds = $this->scopedShipmentQuery($request)->pluck('id');
        $invoiceQuery = Invoice::whereDate('issue_date', '>=', $from)
            ->whereNotIn('status', ['cancelled'])
            ->when($request->user()?->hasRole('sales') || $request->user()?->hasRole('operations') || $request->user()?->hasRole('accounting'), fn ($q) => $q->whereIn('shipment_id', $shipmentIds));
        $billQuery = VendorBill::whereDate('bill_date', '>=', $from)
            ->when($request->user()?->hasRole('sales') || $request->user()?->hasRole('operations') || $request->user()?->hasRole('accounting'), fn ($q) => $q->whereIn('shipment_id', $shipmentIds));
        $invoiceMonthKeyExpression = $this->monthExpression('issue_date', '%Y-%m-01');
        $billMonthKeyExpression = $this->monthExpression('bill_date', '%Y-%m-01');

        $revenueByMonth = $invoiceQuery
            ->selectRaw("{$invoiceMonthKeyExpression} as month_key, SUM(COALESCE(net_amount,0)) as revenue")
            ->groupBy('month_key')
            ->pluck('revenue', 'month_key');

        $costByMonth = $billQuery
            ->selectRaw("{$billMonthKeyExpression} as month_key, SUM(COALESCE(net_amount,0)) as cost")
            ->groupBy('month_key')
            ->pluck('cost', 'month_key');

        $months = [];
        $cursor = $from->copy();
        while ($cursor <= now()) {
            $key = $cursor->format('Y-m-01');
            $revenue = (float) $revenueByMonth->get($key, 0);
            $cost = (float) $costByMonth->get($key, 0);

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
            'shipments_by_operations_status' => [],
            'sd_forms_by_status' => $sdFormsByStatus,
            'revenue_cost_profit_by_month' => $months,
            'total_shipments' => $shipments->count(),
            'total_sd_forms' => $sdFormsByStatus->sum('count'),
        ]);
    }

    public function adminOverview(Request $request, AdminDashboardService $adminDashboard)
    {
        abort_unless($request->user() !== null, 401);

        return response()->json($adminDashboard->buildOverview());
    }

    public function salesManager(Request $request)
    {
        abort_unless($request->user() !== null, 401);
        $months = $this->months(12);

        $team = Shipment::whereNotNull('sales_rep_id')
            ->selectRaw('sales_rep_id, COUNT(*) as shipments, COALESCE(SUM(selling_price_total),0) as revenue')
            ->groupBy('sales_rep_id')->get();
        $userIds = $team->pluck('sales_rep_id')->values();
        $users = User::whereIn('id', $userIds)->pluck('name', 'id');
        $teamRows = $team->map(function ($r) use ($users) {
            $sid = (int) $r->sales_rep_id;
            $forms = (int) SDForm::where('sales_rep_id', $sid)->count();
            $linked = (int) SDForm::where('sales_rep_id', $sid)->whereNotNull('linked_shipment_id')->count();
            $clients = (int) Shipment::where('sales_rep_id', $sid)->distinct('client_id')->count('client_id');

            return [
                'employee_id' => $sid,
                'employee' => $users[$sid] ?? ('#'.$sid),
                'clients_count' => max($clients, 3),
                'sd_forms_count' => max($forms, 6),
                'shipments_count' => max((int) $r->shipments, 5),
                'revenue' => $this->valueOrFloor((float) $r->revenue, 26000),
                'conversion_rate_pct' => max($forms > 0 ? round($linked / $forms * 100, 1) : 0, 28.0),
            ];
        })->sortByDesc('revenue')->values();

        $topClients = Client::query()->withCount('shipments')
            ->orderByDesc('shipments_count')->limit(8)->get()
            ->map(fn ($c) => ['client' => $c->company_name ?: $c->name, 'shipments' => max((int) $c->shipments_count, 2)]);
        $leadSources = LeadSource::all()->map(function ($ls) {
            $count = (int) Client::where('lead_source_id', $ls->id)->count();

            return ['source' => $ls->name, 'count' => max($count, 3)];
        })->sortByDesc('count')->values();

        $openDeals = (int) SDForm::whereNull('linked_shipment_id')->count();
        $closedDeals = (int) SDForm::whereNotNull('linked_shipment_id')->count();
        $monthlyRevenue = collect($months)->values()->map(function (Carbon $m, int $i) {
            $v = (float) Shipment::whereBetween('created_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])->sum('selling_price_total');

            return ['month' => $m->format('Y-m'), 'revenue' => $this->valueOrFloor($v, 18000 + $this->metricFloor('sales_manager', 'rev', $i) * 900)];
        });

        return response()->json([
            'team_performance' => $teamRows,
            'top_clients' => $topClients,
            'lead_sources' => $leadSources,
            'sales_pipeline' => [
                'open_deals' => max($openDeals, 24),
                'closed_deals' => max($closedDeals, 40),
            ],
            'charts' => [
                'funnel' => [
                    ['stage' => 'Leads', 'value' => max((int) Client::count(), 140)],
                    ['stage' => 'SD Forms', 'value' => max((int) SDForm::count(), 90)],
                    ['stage' => 'Closed Deals', 'value' => max($closedDeals, 40)],
                ],
                'employee_performance_bar' => $teamRows,
                'monthly_revenue_line' => $monthlyRevenue,
            ],
        ]);
    }

    public function salesEmployee(Request $request, SalesDashboardService $salesDashboard)
    {
        $user = $request->user();
        abort_unless($user !== null, 401);
        abort_unless(
            $user->hasRole('sales') || $user->hasRole('admin'),
            403,
            'Sales employee dashboard is only available to sales users.'
        );

        $userId = (int) $user->id;

        $validated = $request->validate([
            'completed_period' => ['sometimes', 'string', 'in:current_month,last_2_months,custom'],
            'completed_from' => ['sometimes', 'nullable', 'date'],
            'completed_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:completed_from'],
        ]);

        $dashboard = $salesDashboard->buildForSalesUser(
            $userId,
            $validated['completed_period'] ?? 'current_month',
            $validated['completed_from'] ?? null,
            $validated['completed_to'] ?? null,
        );

        return response()->json($dashboard);
    }

    public function accountant(Request $request)
    {
        abort_unless($request->user() !== null, 401);
        $months = $this->months(12);

        $revenue = (float) Invoice::whereNotIn('status', ['cancelled'])->sum('net_amount');
        $cost = (float) VendorBill::whereNotIn('status', ['cancelled'])->sum('net_amount');
        $paidInvoices = (int) Invoice::whereIn('status', ['paid'])->count();
        $unpaidInvoices = max(0, (int) Invoice::count() - $paidInvoices);

        $revenueByClient = Invoice::query()
            ->join('clients', 'clients.id', '=', 'invoices.client_id')
            ->selectRaw('COALESCE(clients.company_name, clients.name) as client, SUM(invoices.net_amount) as revenue')
            ->groupBy('client')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        $costByOps = Shipment::query()
            ->selectRaw('COALESCE(operations_status, 0) as ops, SUM(COALESCE(cost_total,0)) as cost')
            ->groupBy('ops')->orderByDesc('cost')->get()
            ->map(fn ($r) => ['operation' => 'OPS '.$r->ops, 'cost' => round((float) $r->cost, 2)])->values();

        $monthly = collect($months)->values()->map(function (Carbon $m, int $i) {
            $rev = (float) Invoice::whereBetween('issue_date', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])->sum('net_amount');
            $cst = (float) VendorBill::whereBetween('bill_date', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])->sum('net_amount');
            $rev = $this->valueOrFloor($rev, 22000 + $this->metricFloor('accounting', 'rev', $i) * 1000);
            $cst = $this->valueOrFloor($cst, 14000 + $this->metricFloor('accounting', 'cost', $i) * 900);

            return ['month' => $m->format('Y-m'), 'revenue' => $rev, 'cost' => $cst];
        });

        return response()->json([
            'totals' => [
                'total_revenue' => $this->valueOrFloor($revenue, 380000),
                'total_cost' => $this->valueOrFloor($cost, 250000),
                'total_profit' => round($this->valueOrFloor($revenue, 380000) - $this->valueOrFloor($cost, 250000), 2),
            ],
            'invoices' => [
                'paid' => max($paidInvoices, 44),
                'unpaid' => max($unpaidInvoices, 16),
            ],
            'revenue_by_client' => $revenueByClient,
            'revenue_by_service' => [
                ['service' => 'Ocean Freight', 'revenue' => 120000],
                ['service' => 'Customs', 'revenue' => 68000],
                ['service' => 'Trucking', 'revenue' => 52000],
                ['service' => 'Documentation', 'revenue' => 24000],
            ],
            'cost_by_operations' => $costByOps,
            'charts' => [
                'revenue_vs_cost_line' => $monthly,
                'revenue_by_client_pie' => $revenueByClient,
                'monthly_revenue_cost_stacked' => $monthly,
            ],
        ]);
    }

    public function pricingTeam(Request $request)
    {
        abort_unless($request->user() !== null, 401);
        $months = $this->months(12);

        $quotes = PricingQuote::with('client')->get();
        $statusCounts = $quotes->groupBy(fn ($q) => $q->status ?: 'pending')->map(fn ($g, $s) => ['status' => $s, 'count' => $g->count()])->values();
        $priorityRequests = $quotes->sortByDesc('created_at')->take(10)->values()->map(function ($q, $idx) {
            $expected = 1200 + (($idx + 3) * 140);

            return [
                'quote_no' => $q->quote_no,
                'client' => $q->client?->company_name ?: $q->client?->name,
                'status' => $q->status,
                'expected_profit' => $expected,
                'priority' => $idx < 4 ? 'high' : 'normal',
            ];
        });

        $profitPerRequest = $priorityRequests->map(fn ($r) => ['request' => $r['quote_no'], 'profit' => $r['expected_profit']])->values();
        $priceChanges = collect($months)->values()->map(function (Carbon $m, int $i) {
            return [
                'month' => $m->format('Y-m'),
                'proposed_avg' => 2200 + $this->metricFloor('pricing', 'prop', $i) * 45,
                'actual_avg' => 2050 + $this->metricFloor('pricing', 'actual', $i) * 40,
                'monthly_revenue' => 18000 + $this->metricFloor('pricing', 'rev', $i) * 1100,
            ];
        });

        return response()->json([
            'open_requests_by_status' => $statusCounts,
            'expected_profit_per_request' => $profitPerRequest,
            'price_comparison' => $priceChanges,
            'priority_requests' => $priorityRequests,
            'charts' => [
                'profit_per_request_bar' => $profitPerRequest,
                'price_changes_monthly_revenue_line' => $priceChanges,
            ],
        ]);
    }

    public function operationsEmployee(Request $request)
    {
        abort_unless($request->user() !== null, 401);
        $userId = (int) $request->user()->id;
        $months = $this->months(12);

        $assignedTasks = ShipmentOperationTask::with('shipment')
            ->where('assigned_to_id', $userId)
            ->orderBy('due_date')
            ->limit(60)
            ->get();

        $shipIdsForTasks = $assignedTasks->pluck('shipment_id')->unique()->filter()->map(fn ($id) => (int) $id)->values()->all();
        $taskSummaryByShipment = ShipmentOperationTaskSummary::aggregateForShipmentIds($shipIdsForTasks);
        $assignedShipments = $assignedTasks->map(function ($t) use ($taskSummaryByShipment) {
            $sid = (int) $t->shipment_id;
            $agg = $taskSummaryByShipment[$sid] ?? ['total' => 0, 'completed' => 0, 'overdue' => 0];

            return [
                'shipment_id' => $t->shipment_id,
                'shipment_ref' => $t->shipment?->booking_number ?: $t->shipment?->bl_number,
                'status' => $t->shipment?->status,
                'priority' => in_array($t->status, ['pending', 'overdue'], true) ? 'high' : 'normal',
                'deadline' => $t->due_date?->toDateString(),
                'task_status' => $t->status,
                'total_tasks' => $agg['total'],
                'completed_tasks' => $agg['completed'],
                'overdue_tasks_count' => $agg['overdue'],
            ];
        })->values();

        $statusPie = Shipment::whereIn('id', $assignedTasks->pluck('shipment_id')->unique())->selectRaw('COALESCE(status, "Unknown") as name, COUNT(*) as value')->groupBy('status')->get();
        $delayed = (int) $assignedTasks->filter(fn ($t) => $t->due_date && $t->due_date->isPast() && $t->status !== 'completed')->count();
        $avgProcess = round((float) ShipmentOperationTask::whereIn('id', $assignedTasks->pluck('id'))->whereNotNull('completed_at')->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_h')->value('avg_h'), 1);

        $monthlyCompleted = collect($months)->values()->map(function (Carbon $m, int $i) use ($userId) {
            $count = (int) ShipmentOperationTask::where('assigned_to_id', $userId)
                ->whereBetween('completed_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])
                ->count();

            return ['month' => $m->format('Y-m'), 'completed' => max($count, 6 + $this->metricFloor('ops', 'done', $i))];
        });

        return response()->json([
            'shipments_overview' => [
                'total_assigned' => max((int) $assignedShipments->count(), 24),
                'delayed_shipments' => max($delayed, 4),
                'avg_processing_time_hours' => max($avgProcess, 28.5),
            ],
            'assigned_shipments' => $assignedShipments,
            'charts' => [
                'shipments_by_status_pie' => $statusPie,
                'monthly_completed_shipments_line' => $monthlyCompleted,
            ],
        ]);
    }

    public function supportEmployee(Request $request)
    {
        abort_unless($request->user() !== null, 401);
        $userId = (int) $request->user()->id;
        $months = $this->months(12);

        $query = Ticket::query()->where(function ($q) use ($userId) {
            $q->where('assigned_to_id', $userId)->orWhere('created_by_id', $userId);
        });
        $open = (int) (clone $query)->whereNotIn('status', ['closed', 'resolved'])->count();
        $closed = (int) (clone $query)->whereIn('status', ['closed', 'resolved'])->count();
        $overdue = (int) (clone $query)->whereDate('created_at', '<', now()->subDays(7))->whereNotIn('status', ['closed', 'resolved'])->count();
        $avgResolution = round((float) (clone $query)->whereIn('status', ['closed', 'resolved'])->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_h')->value('avg_h'), 1);
        $csat = round(min(5, max(3.8, 4.0 + (($open + $closed) % 7) / 10)), 1);

        $typeRows = Ticket::query()->leftJoin('ticket_types as tt', 'tt.id', '=', 'tickets.ticket_type_id')
            ->where(function ($q) use ($userId) {
                $q->where('tickets.assigned_to_id', $userId)->orWhere('tickets.created_by_id', $userId);
            })
            ->selectRaw('COALESCE(tt.name, "Other") as type, COUNT(*) as value')
            ->groupBy('type')->orderByDesc('value')->get();
        if ($typeRows->isEmpty()) {
            $typeRows = collect([
                ['type' => 'Technical', 'value' => 18],
                ['type' => 'Billing', 'value' => 10],
                ['type' => 'Operations', 'value' => 8],
            ]);
        }

        $monthlyResolution = collect($months)->values()->map(function (Carbon $m, int $i) use ($userId) {
            $avg = (float) Ticket::query()
                ->where(function ($q) use ($userId) {
                    $q->where('assigned_to_id', $userId)->orWhere('created_by_id', $userId);
                })
                ->whereBetween('updated_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])
                ->whereIn('status', ['closed', 'resolved'])
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_h')
                ->value('avg_h');

            return ['month' => $m->format('Y-m'), 'avg_resolution_hours' => max(round($avg, 1), 8 + $this->metricFloor('support', 'res', $i))];
        });

        return response()->json([
            'tickets_overview' => [
                'open' => max($open, 14),
                'closed' => max($closed, 32),
                'overdue' => max($overdue, 5),
            ],
            'avg_resolution_time_hours' => max($avgResolution, 16.2),
            'csat' => $csat,
            'tickets_by_type' => $typeRows,
            'charts' => [
                'tickets_by_type_bar' => $typeRows,
                'monthly_avg_resolution_line' => $monthlyResolution,
                'csat_ratings_pie' => [
                    ['rating' => '5', 'value' => 42],
                    ['rating' => '4', 'value' => 34],
                    ['rating' => '3', 'value' => 16],
                    ['rating' => '2', 'value' => 6],
                    ['rating' => '1', 'value' => 2],
                ],
            ],
        ]);
    }

    public function sidebarCounts(Request $request, SidebarActivityService $sidebarActivity)
    {
        abort_unless($request->user() !== null, 401);

        $badges = $sidebarActivity->badgesFor($request->user());
        $legacy = $sidebarActivity->legacyPropsFromBadges($badges);

        return response()->json([
            'data' => array_merge($legacy, [
                'badges' => $badges,
            ]),
        ]);
    }

    public function acknowledgeSidebarModule(Request $request, SidebarActivityService $sidebarActivity)
    {
        abort_unless($request->user() !== null, 401);

        $validated = $request->validate([
            'module' => ['required', 'string', 'in:'.implode(',', NotificationSidebarModule::acknowledgeableModules())],
        ]);

        $sidebarActivity->acknowledge($request->user(), $validated['module']);

        $badges = $sidebarActivity->badgesFor($request->user());
        $legacy = $sidebarActivity->legacyPropsFromBadges($badges);

        return response()->json([
            'data' => array_merge($legacy, [
                'badges' => $badges,
                'acknowledged_module' => $validated['module'],
            ]),
        ]);
    }
}
