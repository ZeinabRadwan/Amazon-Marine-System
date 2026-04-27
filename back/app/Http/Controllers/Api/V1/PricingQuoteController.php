<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PricingOffer;
use App\Models\PricingOfferSnapshot;
use App\Models\PricingQuote;
use App\Models\PricingQuoteItem;
use App\Models\PricingQuoteSailingDate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PricingQuoteController extends Controller
{
    /**
     * Canonical pricing item codes across rate/quotation modules.
     *
     * @var array<int, string>
     */
    private const PRICING_ITEM_CODES = ['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER', 'INLAND', 'OTHER'];

    public function index(Request $request)
    {
        $this->authorize('viewAny', PricingQuote::class);

        $query = PricingQuote::query()->with(['client', 'salesUser', 'items']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', (int) $clientId);
        }

        if ($from = $request->query('valid_from')) {
            $query->whereDate('valid_to', '>=', $from);
        }

        if ($to = $request->query('valid_to')) {
            $query->whereDate('valid_to', '<=', $to);
        }

        if ($q = $request->query('q')) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('quote_no', 'like', '%'.$q.'%')
                    ->orWhere('pol', 'like', '%'.$q.'%')
                    ->orWhere('pod', 'like', '%'.$q.'%')
                    ->orWhere('shipping_line', 'like', '%'.$q.'%');
            });
        }

        $query->orderByDesc('created_at');

        $perPage = $request->integer('per_page', 20);
        $paginator = $query->paginate($perPage);

        $rows = $paginator->getCollection()->map(function (PricingQuote $quote): array {
            $total = (float) $quote->items->sum('amount');

            return [
                'id' => $quote->id,
                'quote_no' => $quote->quote_no,
                'status' => $quote->status,
                'client' => $quote->client ? ['id' => $quote->client->id, 'name' => $quote->client->name] : null,
                'sales_user' => $quote->salesUser ? ['id' => $quote->salesUser->id, 'name' => $quote->salesUser->name] : null,
                'pol' => $quote->pol,
                'pod' => $quote->pod,
                'shipping_line' => $quote->shipping_line,
                'container_type' => $quote->container_type,
                'qty' => $quote->qty,
                'valid_from' => $quote->valid_from?->toDateString(),
                'valid_to' => $quote->valid_to?->toDateString(),
                'total_amount' => $total,
                'items_count' => $quote->items->count(),
                'created_at' => $quote->created_at?->toISOString(),
            ];
        })->values();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(PricingQuote $quote)
    {
        $this->authorize('view', $quote);

        $quote->load(['items', 'sailingDates', 'client', 'salesUser', 'offer', 'originRateSnapshot']);

        return response()->json([
            'data' => $this->transformQuote($quote),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', PricingQuote::class);

        $validated = $request->validate([
            'quote_no' => ['nullable', 'string', 'max:40'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'sales_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'pricing_offer_id' => ['nullable', 'integer', 'exists:pricing_offers,id'],
            'origin_rate_snapshot_id' => ['nullable', 'integer', 'exists:pricing_offer_snapshots,id'],
            'quick_mode' => ['sometimes', 'boolean'],
            'quick_mode_reason' => ['nullable', 'string', 'max:255'],
            'pol' => ['nullable', 'string', 'max:255'],
            'pod' => ['nullable', 'string', 'max:255'],
            'shipping_line' => ['nullable', 'string', 'max:255'],
            'container_type' => ['nullable', 'string', 'max:50'],
            'container_spec' => ['nullable', 'array'],
            'container_spec.type' => ['nullable', 'string', 'in:dry,reefer'],
            'container_spec.size' => ['nullable', 'string', 'in:20,40'],
            'container_spec.height' => ['nullable', 'string', 'in:standard,hq'],
            'qty' => ['nullable', 'integer', 'min:1'],
            'transit_time' => ['nullable', 'string', 'max:255'],
            'free_time' => ['nullable', 'string', 'max:255'],
            'free_time_data' => ['nullable', 'array'],
            'free_time_data.pol' => ['nullable', 'array'],
            'free_time_data.pol.detention' => ['nullable', 'integer', 'min:0'],
            'free_time_data.pol.demurrage' => ['nullable', 'integer', 'min:0'],
            'free_time_data.pod' => ['nullable', 'array'],
            'free_time_data.pod.detention' => ['nullable', 'integer', 'min:0'],
            'free_time_data.pod.demurrage' => ['nullable', 'integer', 'min:0'],
            'schedule_type' => ['nullable', 'string', 'in:fixed,weekly'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:pending,accepted,rejected'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'sailing_weekdays' => ['sometimes', 'array'],
            'sailing_weekdays.*' => ['string', 'in:Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.code' => ['required', 'string', 'in:OF,THC,BL,TELEX,ISPS,PTI,POWER,INLAND,OTHER'],
            'items.*.name' => ['required', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $quote = DB::transaction(function () use ($validated) {
            $quickMode = (bool) ($validated['quick_mode'] ?? false);
            if (! $quickMode && empty($validated['pricing_offer_id'])) {
                abort(422, 'pricing_offer_id is required for standard flow.');
            }
            if ($quickMode && empty($validated['quick_mode_reason'])) {
                abort(422, 'quick_mode_reason is required in quick mode.');
            }

            $originSnapshotId = $validated['origin_rate_snapshot_id'] ?? null;
            if (! $originSnapshotId && ! empty($validated['pricing_offer_id'])) {
                $offer = PricingOffer::query()->with(['items', 'sailingDates'])->find((int) $validated['pricing_offer_id']);
                if ($offer) {
                    $originSnapshotId = $this->createOriginRateSnapshot($offer)->id;
                }
            }
            if (! empty($validated['pricing_offer_id']) && ! empty($originSnapshotId)) {
                $originSnapshot = PricingOfferSnapshot::query()->find((int) $originSnapshotId);
                if (! $originSnapshot || (int) $originSnapshot->pricing_offer_id !== (int) $validated['pricing_offer_id']) {
                    abort(422, 'origin_rate_snapshot_id must belong to the same pricing_offer_id.');
                }
            }
            if (($validated['schedule_type'] ?? null) === 'fixed' && ! empty($validated['sailing_weekdays'])) {
                abort(422, 'sailing_weekdays are not allowed for fixed schedule.');
            }
            if (($validated['schedule_type'] ?? null) === 'weekly' && ! empty($validated['sailing_dates'])) {
                abort(422, 'sailing_dates are not allowed for weekly schedule.');
            }

            $quote = new PricingQuote();
            $quote->quote_no = $validated['quote_no'] ?? $this->generateQuoteNo();
            $quote->client_id = $validated['client_id'] ?? null;
            $quote->sales_user_id = $validated['sales_user_id'] ?? null;
            $quote->pricing_offer_id = $validated['pricing_offer_id'] ?? null;
            $quote->origin_rate_snapshot_id = $originSnapshotId;
            $quote->quick_mode = $quickMode;
            $quote->quick_mode_reason = $validated['quick_mode_reason'] ?? null;
            $quote->pol = $validated['pol'] ?? null;
            $quote->pod = $validated['pod'] ?? null;
            $quote->shipping_line = $validated['shipping_line'] ?? null;
            $quote->container_type = $validated['container_type'] ?? null;
            $quote->container_spec = $validated['container_spec'] ?? null;
            $quote->qty = $validated['qty'] ?? null;
            $quote->transit_time = $validated['transit_time'] ?? null;
            $quote->free_time = $validated['free_time'] ?? null;
            $quote->free_time_data = $validated['free_time_data'] ?? null;
            $quote->schedule_type = $validated['schedule_type'] ?? null;
            $quote->sailing_weekdays = $validated['sailing_weekdays'] ?? null;
            $quote->valid_from = $validated['valid_from'] ?? null;
            $quote->valid_to = $validated['valid_to'] ?? null;
            $quote->notes = $validated['notes'] ?? null;
            $quote->status = $validated['status'] ?? 'pending';
            $quote->save();

            $this->syncQuoteItems($quote, $validated['items'] ?? []);
            $this->syncQuoteSailingDates($quote, $validated['sailing_dates'] ?? []);

            return $quote;
        });

        $quote->load(['items', 'sailingDates', 'client', 'salesUser', 'offer', 'originRateSnapshot']);

        return response()->json([
            'data' => $this->transformQuote($quote),
        ], 201);
    }

    public function update(Request $request, PricingQuote $quote)
    {
        $this->authorize('update', $quote);

        $validated = $request->validate([
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'sales_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'pricing_offer_id' => ['sometimes', 'nullable', 'integer', 'exists:pricing_offers,id'],
            'origin_rate_snapshot_id' => ['sometimes', 'nullable', 'integer', 'exists:pricing_offer_snapshots,id'],
            'quick_mode' => ['sometimes', 'boolean'],
            'quick_mode_reason' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pol' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pod' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'container_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'container_spec' => ['sometimes', 'nullable', 'array'],
            'container_spec.type' => ['nullable', 'string', 'in:dry,reefer'],
            'container_spec.size' => ['nullable', 'string', 'in:20,40'],
            'container_spec.height' => ['nullable', 'string', 'in:standard,hq'],
            'qty' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'transit_time' => ['sometimes', 'nullable', 'string', 'max:255'],
            'free_time' => ['sometimes', 'nullable', 'string', 'max:255'],
            'free_time_data' => ['sometimes', 'nullable', 'array'],
            'free_time_data.pol' => ['nullable', 'array'],
            'free_time_data.pol.detention' => ['nullable', 'integer', 'min:0'],
            'free_time_data.pol.demurrage' => ['nullable', 'integer', 'min:0'],
            'free_time_data.pod' => ['nullable', 'array'],
            'free_time_data.pod.detention' => ['nullable', 'integer', 'min:0'],
            'free_time_data.pod.demurrage' => ['nullable', 'integer', 'min:0'],
            'schedule_type' => ['sometimes', 'nullable', 'string', 'in:fixed,weekly'],
            'valid_from' => ['sometimes', 'nullable', 'date'],
            'valid_to' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:pending,accepted,rejected'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'sailing_weekdays' => ['sometimes', 'array'],
            'sailing_weekdays.*' => ['string', 'in:Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.code' => ['required_with:items', 'string', 'in:OF,THC,BL,TELEX,ISPS,PTI,POWER,INLAND,OTHER'],
            'items.*.name' => ['required_with:items', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        if (
            (array_key_exists('quick_mode', $validated) && ! ((bool) $validated['quick_mode']))
            && array_key_exists('pricing_offer_id', $validated)
            && empty($validated['pricing_offer_id'])
        ) {
            abort(422, 'pricing_offer_id is required for standard flow.');
        }
        if ((($validated['quick_mode'] ?? $quote->quick_mode) === true) && empty($validated['quick_mode_reason'] ?? $quote->quick_mode_reason)) {
            abort(422, 'quick_mode_reason is required in quick mode.');
        }
        if ((($validated['schedule_type'] ?? $quote->schedule_type) === 'fixed') && ! empty($validated['sailing_weekdays'] ?? [])) {
            abort(422, 'sailing_weekdays are not allowed for fixed schedule.');
        }
        if ((($validated['schedule_type'] ?? $quote->schedule_type) === 'weekly') && ! empty($validated['sailing_dates'] ?? [])) {
            abort(422, 'sailing_dates are not allowed for weekly schedule.');
        }
        if (! empty($validated['pricing_offer_id'] ?? $quote->pricing_offer_id) && ! empty($validated['origin_rate_snapshot_id'] ?? $quote->origin_rate_snapshot_id)) {
            $offerId = (int) ($validated['pricing_offer_id'] ?? $quote->pricing_offer_id);
            $snapshotId = (int) ($validated['origin_rate_snapshot_id'] ?? $quote->origin_rate_snapshot_id);
            $snapshot = PricingOfferSnapshot::query()->find($snapshotId);
            if (! $snapshot || (int) $snapshot->pricing_offer_id !== $offerId) {
                abort(422, 'origin_rate_snapshot_id must belong to the same pricing_offer_id.');
            }
        }

        DB::transaction(function () use ($quote, $validated): void {
            $quote->fill($validated);
            if (
                (array_key_exists('pricing_offer_id', $validated) && ! array_key_exists('origin_rate_snapshot_id', $validated))
                && ! empty($validated['pricing_offer_id'])
            ) {
                $offer = PricingOffer::query()->with(['items', 'sailingDates'])->find((int) $validated['pricing_offer_id']);
                if ($offer) {
                    $quote->origin_rate_snapshot_id = $this->createOriginRateSnapshot($offer)->id;
                }
            }
            $quote->save();

            if (array_key_exists('items', $validated)) {
                $this->syncQuoteItems($quote, $validated['items'] ?? []);
            }

            if (array_key_exists('sailing_dates', $validated)) {
                $this->syncQuoteSailingDates($quote, $validated['sailing_dates'] ?? []);
            }
        });

        $quote->load(['items', 'sailingDates', 'client', 'salesUser', 'offer', 'originRateSnapshot']);

        return response()->json([
            'data' => $this->transformQuote($quote),
        ]);
    }

    public function accept(PricingQuote $quote)
    {
        $this->authorize('accept', $quote);

        $quote->status = 'accepted';
        $quote->save();

        $quote->load(['items', 'sailingDates', 'client', 'salesUser', 'offer', 'originRateSnapshot']);

        return response()->json([
            'data' => $this->transformQuote($quote),
        ]);
    }

    public function reject(PricingQuote $quote)
    {
        $this->authorize('reject', $quote);

        $quote->status = 'rejected';
        $quote->save();

        $quote->load(['items', 'sailingDates', 'client', 'salesUser', 'offer']);

        return response()->json([
            'data' => $this->transformQuote($quote),
        ]);
    }

    protected function generateQuoteNo(): string
    {
        $year = now()->format('Y');
        $rand = Str::upper(Str::random(6));

        return 'Q-'.$year.'-'.$rand;
    }

    /**
     * @param array<int, array{code?: mixed, name: mixed, description?: mixed, amount: mixed, currency?: mixed}> $items
     */
    protected function syncQuoteItems(PricingQuote $quote, array $items): void
    {
        PricingQuoteItem::where('pricing_quote_id', $quote->id)->delete();

        $i = 0;
        foreach ($items as $item) {
            $name = (string) ($item['name'] ?? '');
            if ($name === '') {
                continue;
            }

            $amount = $item['amount'] ?? 0;
            if ($amount === null || $amount === '' || ! is_numeric($amount)) {
                continue;
            }

            PricingQuoteItem::create([
                'pricing_quote_id' => $quote->id,
                'code' => array_key_exists('code', $item) ? (string) ($item['code'] ?? '') : null,
                'name' => $name,
                'description' => array_key_exists('description', $item) ? (string) ($item['description'] ?? '') : null,
                'amount' => (float) $amount,
                'currency_code' => (string) ($item['currency'] ?? 'USD'),
                'sort_order' => $i++,
            ]);
        }
    }

    /**
     * @param array<int, string> $dates
     */
    protected function syncQuoteSailingDates(PricingQuote $quote, array $dates): void
    {
        PricingQuoteSailingDate::where('pricing_quote_id', $quote->id)->delete();

        foreach ($dates as $date) {
            PricingQuoteSailingDate::create([
                'pricing_quote_id' => $quote->id,
                'sailing_date' => $date,
            ]);
        }
    }

    protected function createOriginRateSnapshot(PricingOffer $offer): PricingOfferSnapshot
    {
        $pricing = [];
        foreach ($offer->items as $item) {
            $pricing[] = [
                'code' => $item->code,
                'price' => (float) $item->price,
                'currency' => $item->currency_code,
            ];
        }

        $snapshotData = [
            'offer_id' => $offer->id,
            'pricing_type' => $offer->pricing_type,
            'route' => [
                'pol' => $offer->pol,
                'pod' => $offer->pod,
                'shipping_line' => $offer->shipping_line,
            ],
            'transit_time' => $offer->transit_time,
            'free_time' => $offer->dnd,
            'valid_to' => $offer->valid_to?->toDateString(),
            'sailing_dates' => $offer->sailingDates
                ->pluck('sailing_date')
                ->map(static fn ($d) => $d?->toDateString())
                ->filter()
                ->values()
                ->all(),
            'pricing' => $pricing,
        ];

        return PricingOfferSnapshot::query()->create([
            'pricing_offer_id' => $offer->id,
            'snapshot_data' => $snapshotData,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformQuote(PricingQuote $quote): array
    {
        $items = $quote->items->sortBy('sort_order')->values()->map(fn (PricingQuoteItem $i): array => [
            'id' => $i->id,
            'code' => $i->code,
            'name' => $i->name,
            'description' => $i->description,
            'amount' => (float) $i->amount,
            'currency' => $i->currency_code,
        ]);

        return [
            'id' => $quote->id,
            'quote_no' => $quote->quote_no,
            'status' => $quote->status,
            'client' => $quote->client ? ['id' => $quote->client->id, 'name' => $quote->client->name] : null,
            'sales_user' => $quote->salesUser ? ['id' => $quote->salesUser->id, 'name' => $quote->salesUser->name] : null,
            'pricing_offer_id' => $quote->pricing_offer_id,
            'origin_rate_snapshot_id' => $quote->origin_rate_snapshot_id,
            'origin_rate_snapshot' => $quote->originRateSnapshot?->snapshot_data,
            'quick_mode' => (bool) $quote->quick_mode,
            'quick_mode_reason' => $quote->quick_mode_reason,
            'pol' => $quote->pol,
            'pod' => $quote->pod,
            'shipping_line' => $quote->shipping_line,
            'container_type' => $quote->container_type,
            'container_spec' => $quote->container_spec,
            'qty' => $quote->qty,
            'transit_time' => $quote->transit_time,
            'free_time' => $quote->free_time,
            'free_time_data' => $quote->free_time_data,
            'schedule_type' => $quote->schedule_type,
            'sailing_weekdays' => $quote->sailing_weekdays,
            'valid_from' => $quote->valid_from?->toDateString(),
            'valid_to' => $quote->valid_to?->toDateString(),
            'notes' => $quote->notes,
            'sailing_dates' => $quote->sailingDates->pluck('sailing_date')->map(
                static fn ($d) => $d?->toDateString()
            )->filter()->values(),
            'items' => $items,
            'created_at' => $quote->created_at?->toISOString(),
        ];
    }
}

