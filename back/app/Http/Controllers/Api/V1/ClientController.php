<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\LeadSource;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ClientController extends Controller
{
    protected function clientWith(): array
    {
        return [
            'companyType',
            'preferredCommMethod',
            'interestLevel',
            'decisionMakerTitle',
            'leadSource',
            'clientStatus',
        ];
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::query()->with($this->clientWith());

        $search = $request->query('q', $request->query('search'));

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', '%'.$search.'%')
                    ->orWhere('name', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        if ($sourceId = $request->query('lead_source_id')) {
            $query->where('lead_source_id', $sourceId);
        }

        if ($statusParam = $request->query('status')) {
            if (is_numeric($statusParam)) {
                $query->where('status_id', (int) $statusParam);
            } else {
                $query->whereHas('clientStatus', fn ($q) => $q->where('name', $statusParam));
            }
        }

        $sort = $request->query('sort', 'client');
        $direction = strtolower($request->query('direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        $sortColumn = match ($sort) {
            'client' => 'name',
            'company' => 'company_name',
            'shipments' => 'shipments_count',
            'profit' => 'total_profit',
            'last_contact' => 'last_contact_at',
            default => 'name',
        };

        $query->orderBy($sortColumn, $direction);

        $perPage = $request->integer('per_page', 15);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (Client $client) => $this->transformClient($client)),
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

    public function store(StoreClientRequest $request)
    {
        $this->authorize('create', Client::class);

        $client = Client::create($request->validated());

        return response()->json([
            'data' => $this->transformClient($client->fresh($this->clientWith())),
        ], 201);
    }

    public function show(Client $client)
    {
        $this->authorize('view', $client);

        $client->load(array_merge($this->clientWith(), ['contacts']));

        return response()->json([
            'data' => $this->transformClientDetail($client),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $this->authorize('update', $client);

        $client->fill($request->validated());
        $client->save();

        return response()->json([
            'data' => $this->transformClient($client->fresh($this->clientWith())),
        ]);
    }

    public function destroy(Client $client)
    {
        $this->authorize('delete', $client);

        $client->delete();

        return response()->json([
            'message' => 'Client deleted.',
        ]);
    }

    public function export(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::query()->with($this->clientWith());
        $ids = $request->query('ids');
        if (is_array($ids) && count($ids) > 0) {
            $query->whereIn('id', $ids);
        } elseif (is_string($ids)) {
            $ids = array_filter(array_map('intval', explode(',', $ids)));
            if (count($ids) > 0) {
                $query->whereIn('id', $ids);
            }
        }

        $clients = $query->orderBy('name')->get();
        $rows = $clients->map(fn (Client $c) => $this->transformClient($c));

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="clients-export-'.date('Y-m-d').'.csv"',
        ];
        $callback = function () use ($rows) {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, ['id', 'name', 'company_name', 'phone', 'email', 'lead_source', 'status', 'shipments', 'profit', 'last_contact_at']);
            foreach ($rows as $r) {
                fputcsv($fh, [
                    $r['id'] ?? '',
                    $r['name'] ?? '',
                    $r['company_name'] ?? '',
                    $r['phone'] ?? '',
                    $r['email'] ?? '',
                    $r['lead_source'] ?? '',
                    $r['status'] ?? '',
                    $r['shipments'] ?? '',
                    $r['profit'] ?? '',
                    isset($r['last_contact_at']) ? ($r['last_contact_at'] instanceof \DateTimeInterface ? $r['last_contact_at']->format('Y-m-d') : $r['last_contact_at']) : '',
                ]);
            }
            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function stats(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $now = Carbon::now();
        $startThisMonth = $now->copy()->startOfMonth();
        $startLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endLastMonth = $now->copy()->subMonth()->endOfMonth();

        $totalClients = Client::count();
        $totalClientsEndLastMonth = Client::where('created_at', '<=', $endLastMonth)->count();
        $totalClientsTrend = $this->computeTrend($totalClientsEndLastMonth, $totalClients, true);

        $activeClients = Client::whereHas('clientStatus', fn ($q) => $q->where('name', 'Active'))->count();
        $activeClientsLastMonth = Client::whereHas('clientStatus', fn ($q) => $q->where('name', 'Active'))
            ->where('created_at', '<=', $endLastMonth)
            ->count();
        $activeClientsTrend = $this->computeTrend($activeClientsLastMonth, $activeClients, true);

        $newClientsThisMonth = Client::whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();
        $newClientsLastMonth = Client::whereMonth('created_at', $startLastMonth->month)
            ->whereYear('created_at', $startLastMonth->year)
            ->count();
        $newClientsTrend = $this->computeTrend($newClientsLastMonth, $newClientsThisMonth, false);

        $totalRevenueFromClients = (float) Invoice::whereNotIn('status', ['cancelled'])->sum('net_amount');
        $revenueThisMonth = (float) Invoice::whereNotIn('status', ['cancelled'])
            ->whereBetween('issue_date', [$startThisMonth, $now])
            ->sum('net_amount');
        $revenueLastMonth = (float) Invoice::whereNotIn('status', ['cancelled'])
            ->whereBetween('issue_date', [$startLastMonth, $endLastMonth])
            ->sum('net_amount');
        $revenueTrend = $this->computeTrend($revenueLastMonth, $revenueThisMonth, true);

        return response()->json([
            'data' => [
                'total_clients' => $totalClients,
                'total_clients_trend_direction' => $totalClientsTrend['direction'],
                'total_clients_trend_value' => $totalClientsTrend['value'],
                'total_clients_trend_pct' => $totalClientsTrend['pct'],
                'active_clients' => $activeClients,
                'active_clients_trend_direction' => $activeClientsTrend['direction'],
                'active_clients_trend_value' => $activeClientsTrend['value'],
                'active_clients_trend_pct' => $activeClientsTrend['pct'],
                'new_clients_this_month' => $newClientsThisMonth,
                'new_clients_trend_direction' => $newClientsTrend['direction'],
                'new_clients_trend_value' => $newClientsTrend['value'],
                'new_clients_trend_pct' => $newClientsTrend['pct'],
                'total_revenue_from_clients' => $totalRevenueFromClients,
                'total_revenue_trend_direction' => $revenueTrend['direction'],
                'total_revenue_trend_value' => $revenueTrend['value'],
                'total_revenue_trend_pct' => $revenueTrend['pct'],
            ],
        ]);
    }

    /**
     * @param  int|float  $previous
     * @param  int|float  $current
     * @return array{ direction: string, value: int|float|null, pct: float|null }
     */
    private function computeTrend($previous, $current, bool $asPercentage): array
    {
        $direction = 'same';
        $value = null;
        $pct = null;

        if ((float) $previous !== 0.0) {
            $diff = $current - $previous;
            $pct = round((float) ($diff / $previous) * 100, 1);
            if ($diff > 0) {
                $direction = 'up';
            } elseif ($diff < 0) {
                $direction = 'down';
            }
            $value = $asPercentage ? $pct : (int) $diff;
        } elseif ((float) $current !== 0.0) {
            $direction = 'up';
            $pct = 100.0;
            $value = $asPercentage ? 100.0 : (int) $current;
        }

        return [
            'direction' => $direction,
            'value' => $value,
            'pct' => $pct,
        ];
    }

    public function charts(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $months = (int) $request->query('months', 6);
        $from = now()->subMonths($months);

        $newClientsByMonth = Client::query()
            ->where('created_at', '>=', $from)
            ->get()
            ->groupBy(fn (Client $c) => $c->created_at?->format('Y-m-01'))
            ->map(fn ($group, $month) => (object) ['month' => $month, 'count' => $group->count()])
            ->sortKeys()
            ->values();

        $byLeadSource = Client::query()
            ->selectRaw('lead_source_id, COUNT(*) as count')
            ->whereNotNull('lead_source_id')
            ->groupBy('lead_source_id')
            ->get();

        $sourceIds = $byLeadSource->pluck('lead_source_id')->unique()->filter()->values()->all();
        $sources = LeadSource::whereIn('id', $sourceIds)->get()->keyBy('id');

        $byLeadSourceFormatted = $byLeadSource->map(function ($row) use ($sources) {
            return [
                'lead_source_id' => $row->lead_source_id,
                'lead_source_name' => $sources->get($row->lead_source_id)?->name ?? '',
                'count' => (int) $row->count,
            ];
        });

        return response()->json([
            'data' => [
                'new_clients_by_month' => $newClientsByMonth->map(fn ($row) => ['month' => $row->month, 'count' => (int) $row->count]),
                'by_lead_source' => $byLeadSourceFormatted,
            ],
        ]);
    }

    public function financialSummary(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $clients = Client::select('id', 'name', 'company_name')->orderBy('name')->get();

        $data = $clients->map(function (Client $client) {
            $totalInvoiced = (float) Invoice::where('client_id', $client->id)
                ->whereNotIn('status', ['cancelled'])
                ->sum('net_amount');
            $totalPaid = (float) Payment::where('client_id', $client->id)->sum('amount');
            $balanceDue = $totalInvoiced - $totalPaid;
            $lastPaymentAt = Payment::where('client_id', $client->id)->max('paid_at');
            $openInvoices = Invoice::where('client_id', $client->id)
                ->whereNotIn('status', ['cancelled'])
                ->with('payments')
                ->get();
            $openInvoicesCount = $openInvoices->filter(function ($inv) {
                $paid = (float) $inv->payments->sum('amount');

                return $inv->net_amount > $paid;
            })->count();

            return [
                'id' => $client->id,
                'name' => $client->name,
                'company_name' => $client->company_name,
                'balance_due' => round($balanceDue, 2),
                'last_payment_at' => $lastPaymentAt,
                'open_invoices_count' => $openInvoicesCount,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function pricingList(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::select('id', 'name', 'company_name', 'pricing_tier', 'pricing_discount_pct', 'pricing_updated_at');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('company_name', 'like', '%'.$search.'%');
            });
        }

        if ($tier = $request->query('pricing_tier')) {
            $query->where('pricing_tier', $tier);
        }

        if ($minDiscount = $request->query('min_discount')) {
            $query->where('pricing_discount_pct', '>=', (float) $minDiscount);
        }

        if ($maxDiscount = $request->query('max_discount')) {
            $query->where('pricing_discount_pct', '<=', (float) $maxDiscount);
        }

        $sort = $request->query('sort', 'name');
        $direction = strtolower($request->query('direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        $allowedSorts = [
            'name' => 'name',
            'company' => 'company_name',
            'tier' => 'pricing_tier',
            'discount' => 'pricing_discount_pct',
            'updated_at' => 'pricing_updated_at',
        ];

        $sortColumn = $allowedSorts[$sort] ?? 'name';

        $clients = $query->orderBy($sortColumn, $direction)->get();

        return response()->json([
            'data' => $clients->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'company_name' => $c->company_name,
                'pricing_tier' => $c->pricing_tier,
                'pricing_discount_pct' => $c->pricing_discount_pct,
                'pricing_updated_at' => $c->pricing_updated_at,
            ]),
        ]);
    }

    public function visits(Client $client)
    {
        $this->authorize('view', $client);

        $visits = Visit::where('client_id', $client->id)
            ->with(['user'])
            ->orderByDesc('visit_date')
            ->get();

        return response()->json([
            'data' => $visits->map(fn (Visit $v) => [
                'id' => $v->id,
                'client_id' => $v->client_id,
                'user_id' => $v->user_id,
                'user_name' => $v->user?->name,
                'subject' => $v->subject,
                'purpose' => $v->purpose,
                'notes' => $v->notes,
                'visit_date' => $v->visit_date,
                'status' => $v->status,
                'created_at' => $v->created_at,
            ]),
        ]);
    }

    public function shipments(Request $request, Client $client)
    {
        $this->authorize('view', $client);

        $perPage = $request->integer('per_page', 10);
        $shipments = Shipment::where('client_id', $client->id)
            ->with(['originPort', 'destinationPort'])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $shipments->getCollection()->map(fn (Shipment $s) => [
                'id' => $s->id,
                'bl_number' => $s->bl_number,
                'booking_number' => $s->booking_number,
                'route_text' => $s->route_text,
                'origin_port' => $s->originPort?->name,
                'destination_port' => $s->destinationPort?->name,
                'status' => $s->status,
                'cost_total' => $s->cost_total,
                'selling_price_total' => $s->selling_price_total,
                'profit_total' => $s->profit_total,
                'created_at' => $s->created_at,
            ]),
            'meta' => [
                'current_page' => $shipments->currentPage(),
                'last_page' => $shipments->lastPage(),
                'per_page' => $shipments->perPage(),
                'total' => $shipments->total(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformClient(Client $client): array
    {
        $lastContactAt = $client->last_contact_at;
        $lastContactAgeDays = null;

        if ($lastContactAt instanceof Carbon) {
            $lastContactAgeDays = $lastContactAt->diffInDays(Carbon::now());
        }

        return [
            'id' => $client->id,
            'name' => $client->name,
            'company_name' => $client->company_name,
            'company_type_id' => $client->company_type_id,
            'company_type' => $client->companyType?->name,
            'business_activity' => $client->business_activity,
            'target_markets' => $client->target_markets,
            'shipping_problems' => $client->shipping_problems,
            'preferred_comm_method_id' => $client->preferred_comm_method_id,
            'preferred_comm_method' => $client->preferredCommMethod?->name,
            'phone' => $client->phone,
            'email' => $client->email,
            'interest_level_id' => $client->interest_level_id,
            'interest_level' => $client->interestLevel?->name,
            'address' => $client->address,
            'city' => $client->getAttribute('city'),
            'country' => $client->getAttribute('country'),
            'default_payment_terms' => $client->getAttribute('default_payment_terms'),
            'default_currency' => $client->getAttribute('default_currency'),
            'website_url' => $client->website_url,
            'tax_id' => $client->tax_id,
            'facebook_url' => $client->facebook_url,
            'linkedin_url' => $client->linkedin_url,
            'lead_source_id' => $client->lead_source_id,
            'lead_source' => $client->leadSource?->name,
            'status_id' => $client->status_id,
            'status' => $client->clientStatus?->name,
            'shipments' => $client->shipments_count,
            'profit' => $client->total_profit,
            'last_contact_at' => $lastContactAt,
            'last_contact_age_days' => $lastContactAgeDays,
            'pricing_tier' => $client->pricing_tier,
            'pricing_discount_pct' => $client->pricing_discount_pct,
            'pricing_updated_at' => $client->pricing_updated_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformClientDetail(Client $client): array
    {
        $base = $this->transformClient($client);

        $primaryContact = $client->contacts->firstWhere('is_primary', true);
        $contactName = $primaryContact?->name ?? $client->contacts->first()?->name ?? $client->getAttribute('contact_name');

        $details = [
            'contact_name' => $contactName,
            'lead_source_other' => $client->lead_source_other,
            'decision_maker_name' => $client->decision_maker_name,
            'decision_maker_title_id' => $client->decision_maker_title_id,
            'decision_maker_title' => $client->decisionMakerTitle?->name,
            'decision_maker_title_other' => $client->decision_maker_title_other,
            'current_need' => $client->current_need,
            'pain_points' => $client->pain_points,
            'opportunity' => $client->opportunity,
            'special_requirements' => $client->special_requirements,
            'notes' => $client->notes,
            'contacts' => $client->contacts->map(function ($contact) {
                return [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'position' => $contact->position,
                    'email' => $contact->email,
                    'phone' => $contact->phone,
                    'is_primary' => (bool) $contact->is_primary,
                ];
            }),
        ];

        return array_merge($base, $details);
    }
}
