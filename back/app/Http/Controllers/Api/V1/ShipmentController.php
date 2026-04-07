<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use App\Notifications\ShipmentSalesFinancialsNotification;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShipmentController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
    ) {
    }
    public function index(Request $request)
    {
        $this->authorize('viewAny', Shipment::class);

        $query = $this->buildShipmentListQuery($request)
            ->with(['client', 'salesRep', 'lineVendor', 'originPort', 'destinationPort', 'sdForm']);

        if (str_contains((string) $request->query('include'), 'latest_tracking_update')) {
            $query->with(['latestTrackingUpdate' => fn ($q) => $q->with('createdBy')]);
        }

        $sort = $request->query('sort', 'created_at');
        $direction = strtolower((string) $request->query('direction', 'desc'));
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }
        if ($sort === 'bl') {
            $query->orderBy('shipments.bl_number', $direction);
        } elseif ($sort === 'client') {
            $query->join('clients', 'shipments.client_id', '=', 'clients.id')
                ->orderBy(DB::raw('COALESCE(clients.company_name, clients.name)'), $direction)
                ->select('shipments.*');
        } elseif ($sort === 'cost') {
            $query->orderBy('shipments.cost_total', $direction);
        } elseif ($sort === 'profit') {
            $query->orderBy('shipments.profit_total', $direction);
        } else {
            $query->orderBy('shipments.created_at', $direction);
        }

        $perPage = $request->integer('per_page', 15);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $validated = $request->validate([
            'sd_form_id' => ['nullable', 'integer', 'exists:s_d_forms,id'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'sales_rep_id' => ['nullable', 'integer', 'exists:users,id'],
            'line_vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'origin_port_id' => ['nullable', 'integer', 'exists:ports,id'],
            'destination_port_id' => ['nullable', 'integer', 'exists:ports,id'],
            'booking_number' => ['nullable', 'string', 'max:255'],
            'booking_date' => ['nullable', 'date'],
            'acid_number' => ['nullable', 'string', 'max:255'],
            'shipment_direction' => ['nullable', 'string', 'in:Export,Import'],
            'mode' => ['nullable', 'string', 'in:Sea,Air,Land'],
            'shipment_type' => ['nullable', 'string', 'in:FCL,LCL'],
            'status' => ['nullable', 'string', 'max:40'],
            'operations_status' => ['nullable', 'integer', 'min:1', 'max:8'],
            'container_count' => ['nullable', 'integer', 'min:1'],
            'container_size' => ['nullable', 'string', 'max:10'],
            'container_type' => ['nullable', 'string', 'max:40'],
            'loading_place' => ['nullable', 'string', 'max:255'],
            'loading_date' => ['nullable', 'date'],
            'cargo_description' => ['nullable', 'string'],
            'is_reefer' => ['nullable', 'boolean'],
            'reefer_temp' => ['nullable', 'string', 'max:50'],
            'reefer_vent' => ['nullable', 'string', 'max:50'],
            'reefer_hum' => ['nullable', 'string', 'max:50'],
        ]);

        $shipment = new Shipment($validated);

        if (! $shipment->client_id && $shipment->sd_form_id) {
            $sd = SDForm::find($shipment->sd_form_id);
            if ($sd) {
                $shipment->client_id = $sd->client_id;
                $shipment->sales_rep_id = $sd->sales_rep_id;
                $shipment->shipment_direction = $sd->shipment_direction;
                $shipment->origin_port_id = $sd->pol_id;
                $shipment->destination_port_id = $sd->pod_id;
                $shipment->container_size = $sd->container_size;
                $shipment->container_type = $sd->container_type;
                $shipment->container_count = $sd->num_containers;
                $shipment->cargo_description = $sd->cargo_description;
            }
        }

        // Auto-assign Sales Rep if the user is a sales rep and no user was explicitly set, 
        // or always force to current user based on RBAC since Sales reps can only create their own shipments.
        // Actually, the requirement says "the backend must automatically assign the currently logged-in user as the Sales Rep"
        // Let's just always set it, or set it if not present. If the user is admin, they might be picking a sales rep.
        if (! $shipment->sales_rep_id && $request->user()) {
            $shipment->sales_rep_id = $request->user()->id;
        }

        $shipment->status = $shipment->status ?? 'جديد';
        $shipment->mode = $shipment->mode ?? 'Sea';
        $shipment->shipment_type = $shipment->shipment_type ?? 'FCL';

        $shipment->save();

        ActivityLogger::log('shipment.created', $shipment, [
            'client_id' => $shipment->client_id,
            'sd_form_id' => $shipment->sd_form_id,
        ]);

        return response()->json([
            'data' => $shipment->fresh(['client', 'salesRep', 'lineVendor', 'originPort', 'destinationPort', 'sdForm']),
        ], 201);
    }

    public function show(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        return response()->json([
            'data' => $shipment->load([
                'client',
                'salesRep',
                'lineVendor',
                'originPort',
                'destinationPort',
                'sdForm',
                'operation',
                'tasks',
            ]),
        ]);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'bl_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'booking_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'booking_date' => ['sometimes', 'nullable', 'date'],
            'acid_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'sd_form_id' => ['sometimes', 'nullable', 'integer', 'exists:s_d_forms,id'],
            'sales_rep_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'line_vendor_id' => ['sometimes', 'nullable', 'integer', 'exists:vendors,id'],
            'origin_port_id' => ['sometimes', 'nullable', 'integer', 'exists:ports,id'],
            'destination_port_id' => ['sometimes', 'nullable', 'integer', 'exists:ports,id'],
            'shipment_direction' => ['sometimes', 'nullable', 'string', 'in:Export,Import'],
            'mode' => ['sometimes', 'nullable', 'string', 'in:Sea,Air,Land'],
            'shipment_type' => ['sometimes', 'nullable', 'string', 'in:FCL,LCL'],
            'container_count' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'container_size' => ['sometimes', 'nullable', 'string', 'max:10'],
            'container_type' => ['sometimes', 'nullable', 'string', 'max:40'],
            'cargo_description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', 'max:40'],
            'operations_status' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:8'],
            'loading_place' => ['sometimes', 'nullable', 'string', 'max:255'],
            'loading_date' => ['sometimes', 'nullable', 'date'],
            'is_reefer' => ['sometimes', 'boolean'],
            'reefer_temp' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reefer_vent' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reefer_hum' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $originalStatus = $shipment->status;
        $originalOpsStatus = $shipment->operations_status;

        $shipment->fill($validated);
        $shipment->save();

        if ($shipment->status !== $originalStatus) {
            ActivityLogger::log('shipment.status_changed', $shipment, [
                'from' => $originalStatus,
                'to' => $shipment->status,
            ]);
        }

        if ($shipment->operations_status !== $originalOpsStatus) {
            ActivityLogger::log('shipment.operations_status_changed', $shipment, [
                'from' => $originalOpsStatus,
                'to' => $shipment->operations_status,
            ]);
        }

        return response()->json([
            'data' => $shipment->fresh(),
        ]);
    }

    public function destroy(Shipment $shipment)
    {
        $this->authorize('delete', $shipment);

        ActivityLogger::log('shipment.deleted', $shipment);
        $shipment->delete();

        return response()->json(['message' => __('Shipment deleted.')]);
    }

    /**
     * Pipeline stats: counts by status for the 4 cards (Booked, In Transit, Customs Clearance, Delivered).
     */
    public function stats(Request $request)
    {
        $this->authorize('viewAny', Shipment::class);

        $byStatus = Shipment::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $normalize = function ($value) {
            if ($value === null || $value === '') {
                return 'unknown';
            }
            $v = strtolower(trim((string) $value));
            if (in_array($v, ['booked', 'تم الحجز'], true) || str_contains($v, 'booked') || str_contains($v, 'حجز')) {
                return 'booked';
            }
            if (in_array($v, ['in_transit', 'في الطريق', 'in transit'], true) || str_contains($v, 'transit') || str_contains($v, 'طريق')) {
                return 'in_transit';
            }
            if (in_array($v, ['customs_clearance', 'تخليص جمركي'], true) || str_contains($v, 'customs') || str_contains($v, 'جمرك')) {
                return 'customs_clearance';
            }
            if (in_array($v, ['delivered', 'تم التسليم'], true) || str_contains($v, 'delivered') || str_contains($v, 'تسليم')) {
                return 'delivered';
            }
            return $value;
        };

        $booked = 0;
        $inTransit = 0;
        $customsClearance = 0;
        $delivered = 0;
        foreach ($byStatus as $status => $row) {
            $n = (int) $row->count;
            $key = $normalize($status);
            if ($key === 'booked') {
                $booked += $n;
            } elseif ($key === 'in_transit') {
                $inTransit += $n;
            } elseif ($key === 'customs_clearance') {
                $customsClearance += $n;
            } elseif ($key === 'delivered') {
                $delivered += $n;
            }
        }

        return response()->json([
            'data' => [
                'booked' => $booked,
                'in_transit' => $inTransit,
                'customs_clearance' => $customsClearance,
                'delivered' => $delivered,
                'by_status' => $byStatus->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count])->values()->all(),
            ],
        ]);
    }

    /**
     * Charts: status distribution and monthly revenue/profit.
     */
    public function charts(Request $request)
    {
        $this->authorize('viewAny', Shipment::class);

        $months = (int) $request->query('months', 6);
        $from = now()->subMonths($months)->startOfMonth();

        $statusDistribution = Shipment::query()
            ->selectRaw('status, COUNT(*) as count')
            ->where('created_at', '>=', $from)
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status ?? 'unknown', 'count' => (int) $row->count]);

        $monthlyRevenueProfit = Shipment::query()
            ->where('created_at', '>=', $from)
            ->get()
            ->groupBy(fn (Shipment $s) => $s->created_at?->format('Y-m-01'))
            ->map(function ($group, $month) {
                $revenue = (float) $group->sum('selling_price_total');
                $profit = (float) $group->sum('profit_total');

                return [
                    'month' => $month,
                    'revenue' => round($revenue, 2),
                    'profit' => round($profit, 2),
                ];
            })
            ->sortKeys()
            ->values();

        return response()->json([
            'data' => [
                'status_distribution' => $statusDistribution,
                'monthly_revenue_profit' => $monthlyRevenueProfit,
            ],
        ]);
    }

    /**
     * Export shipments as CSV (same filters as index, optional ids).
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Shipment::class);

        $query = $this->buildShipmentListQuery($request);

        $ids = $request->query('ids');
        if (is_string($ids) && $ids !== '') {
            $ids = array_filter(array_map('intval', explode(',', $ids)));
            if (count($ids) > 0) {
                $query->whereIn('shipments.id', $ids);
            }
        }

        $shipments = $query->orderByDesc('shipments.created_at')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="shipments-export-'.date('Y-m-d').'.csv"',
        ];

        return response()->stream(function () use ($shipments) {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, ['id', 'bl_number', 'booking_number', 'client_name', 'route_text', 'line_vendor', 'status', 'cost_total', 'selling_price_total', 'profit_total', 'created_at']);
            foreach ($shipments as $s) {
                $client = $s->relationLoaded('client') ? $s->client : $s->client()->first();
                $lineVendor = $s->relationLoaded('lineVendor') ? $s->lineVendor : $s->lineVendor()->first();
                fputcsv($fh, [
                    $s->id,
                    $s->bl_number ?? '',
                    $s->booking_number ?? '',
                    $client ? ($client->company_name ?? $client->name ?? '') : '',
                    $s->route_text ?? '',
                    $lineVendor ? $lineVendor->name ?? '' : '',
                    $s->status ?? '',
                    $s->cost_total ?? '',
                    $s->selling_price_total ?? '',
                    $s->profit_total ?? '',
                    $s->created_at?->format('Y-m-d H:i:s') ?? '',
                ]);
            }
            fclose($fh);
        }, 200, $headers);
    }

    /**
     * Build base query for list/export (filters only, no sort/paginate).
     */
    private function buildShipmentListQuery(Request $request)
    {
        $query = Shipment::query()
            ->with(['client', 'lineVendor'])
            ->select('shipments.*');

        if ($status = $request->query('status')) {
            $query->where('shipments.status', $status);
        }
        if ($opsStatus = $request->query('operations_status')) {
            $query->where('shipments.operations_status', $opsStatus);
        }
        if ($clientId = $request->query('client_id')) {
            $query->where('shipments.client_id', $clientId);
        }
        if ($salesRepId = $request->query('sales_rep_id')) {
            $query->where('shipments.sales_rep_id', $salesRepId);
        }
        if ($lineVendorId = $request->query('line_vendor_id')) {
            $query->where('shipments.line_vendor_id', $lineVendorId);
        }
        if ($month = $request->query('month')) {
            try {
                $date = Carbon::createFromFormat('Y-m', $month);
                $query->whereDate('shipments.created_at', '>=', $date->copy()->startOfMonth())
                    ->whereDate('shipments.created_at', '<=', $date->copy()->endOfMonth());
            } catch (\Exception $e) {
                // ignore invalid month
            }
        }
        if ($from = $request->query('from')) {
            $query->whereDate('shipments.created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('shipments.created_at', '<=', $to);
        }
        if ($sd = $request->query('sd_number')) {
            $query->whereHas('sdForm', function ($q) use ($sd) {
                $q->where('sd_number', 'like', '%'.$sd.'%');
            });
        }
        if ($bl = $request->query('bl_number')) {
            $query->where('shipments.bl_number', 'like', '%'.$bl.'%');
        }
        $search = $request->query('search') ?? $request->query('q');
        if (is_string($search) && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function ($q) use ($term) {
                $q->where('shipments.bl_number', 'like', $term)
                    ->orWhere('shipments.booking_number', 'like', $term)
                    ->orWhereHas('client', function ($q2) use ($term) {
                        $q2->where('name', 'like', $term)->orWhere('company_name', 'like', $term);
                    });
            });
        }

        return $query;
    }

    /**
     * Log that vendor bill / financial documentation is ready for sales follow-up.
     */
    public function notifySalesFinancials(Request $request, Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        $user = $request->user();
        abort_unless(
            $user && (
                $user->can('accounting.manage')
                || $user->can('shipments.manage_ops')
                || $user->can('financial.manage')
            ),
            403,
            __('You do not have permission to notify sales for this shipment.')
        );

        ActivityLogger::log('shipment.notify_sales_financials', $shipment, [
            'bl_number' => $shipment->bl_number,
        ]);

        $recipients = collect();

        if ($shipment->sales_rep_id) {
            $sales = User::query()->find($shipment->sales_rep_id);
            if ($sales) {
                $recipients->push($sales);
            }
        }

        $financeUsers = User::role('accountant')
            ->where('status', 'active')
            ->get();

        $recipients = $recipients->merge($financeUsers)->unique('id');

        if ($recipients->isNotEmpty()) {
            $this->notificationService->sendDatabaseNotification(
                'shipment.notify_sales_financials',
                $shipment,
                $recipients,
                new ShipmentSalesFinancialsNotification($shipment)
            );
        }

        return response()->json([
            'message' => __('Notification recorded.'),
        ]);
    }
}
