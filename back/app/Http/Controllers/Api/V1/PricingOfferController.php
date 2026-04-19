<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PricingOffer;
use App\Models\PricingOfferItem;
use App\Models\PricingOfferSailingDate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PricingOfferController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', PricingOffer::class);

        $query = PricingOffer::query()
            ->with(['items', 'sailingDates']);

        if ($type = $request->query('pricing_type')) {
            $query->where('pricing_type', $type);
        }

        if ($region = $request->query('region')) {
            $query->where('region', $region);
        }

        if ($pod = $request->query('pod')) {
            $query->where('pod', $pod);
        }

        if ($shippingLine = $request->query('shipping_line')) {
            $query->where('shipping_line', $shippingLine);
        }

        if ($inlandPort = $request->query('inland_port')) {
            $query->where('inland_port', $inlandPort);
        }

        if ($destination = $request->query('destination')) {
            $query->where('destination', $destination);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($from = $request->query('valid_from')) {
            $query->whereDate('valid_to', '>=', $from);
        }

        if ($to = $request->query('valid_to')) {
            $query->whereDate('valid_to', '<=', $to);
        }

        if ($q = $request->query('q')) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('region', 'like', '%'.$q.'%')
                    ->orWhere('pod', 'like', '%'.$q.'%')
                    ->orWhere('shipping_line', 'like', '%'.$q.'%')
                    ->orWhere('inland_port', 'like', '%'.$q.'%')
                    ->orWhere('destination', 'like', '%'.$q.'%');
            });
        }

        $query->orderBy('region')
            ->orderBy('pod')
            ->orderBy('shipping_line')
            ->orderBy('inland_port');

        $perPage = $request->integer('per_page', 20);
        $paginator = $query->paginate($perPage);

        $rows = $paginator->getCollection()
            ->map(fn (PricingOffer $offer): array => $this->transformOffer($offer))
            ->values();

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

    public function show(PricingOffer $offer)
    {
        $this->authorize('view', $offer);

        $offer->load(['items', 'sailingDates']);

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', PricingOffer::class);

        $validated = $request->validate([
            'pricing_type' => ['required', 'string', 'in:sea,inland'],
            'container_type' => ['nullable', 'string', 'in:Dry,Reefer'],
            'container_size' => ['nullable', 'string', 'in:20,40'],
            'container_height' => ['nullable', 'string', 'in:Standard,HQ'],
            'region' => ['required', 'string', 'max:255'],
            'pod' => ['required', 'string', 'max:255'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:draft,active,archived'],
            'notes' => ['nullable', 'string'],
            'other_charges' => ['nullable', 'string', 'max:255'],
            'shipping_line' => ['required_if:pricing_type,sea', 'nullable', 'string', 'max:255'],
            'pol' => ['required_if:pricing_type,sea', 'nullable', 'string', 'max:255'],
            'dnd' => ['nullable', 'string', 'max:255'],
            'transit_time' => ['nullable', 'string', 'max:255'],
            'free_time' => ['nullable', 'string', 'max:255'],
            'inland_port' => ['required_if:pricing_type,inland', 'nullable', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'inland_gov' => ['nullable', 'string', 'max:255'],
            'inland_city' => ['nullable', 'string', 'max:255'],
            'available_sailing_days' => ['sometimes', 'array'],
            'available_sailing_days.*' => ['string'],
            'weekly_sailings' => ['nullable', 'integer'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'pricing' => ['required', 'array'],
            'pricing.*.name' => ['nullable', 'string', 'max:120'],
            'pricing.*.description' => ['nullable', 'string'],
            'pricing.*.price' => ['nullable', 'numeric', 'min:0'],
            'pricing.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $offer = DB::transaction(function () use ($validated) {
            $offer = new PricingOffer();
            $offer->pricing_type = $validated['pricing_type'];
            $offer->container_type = $validated['container_type'] ?? null;
            $offer->container_size = $validated['container_size'] ?? null;
            $offer->container_height = $validated['container_height'] ?? null;
            $offer->region = $validated['region'];
            $offer->pod = $validated['pod'];
            $offer->shipping_line = $validated['shipping_line'] ?? null;
            $offer->pol = $validated['pol'] ?? null;
            $offer->dnd = $validated['dnd'] ?? null;
            $offer->transit_time = $validated['transit_time'] ?? null;
            $offer->free_time = $validated['free_time'] ?? null;
            $offer->inland_port = $validated['inland_port'] ?? null;
            $offer->destination = $validated['destination'] ?? null;
            $offer->inland_gov = $validated['inland_gov'] ?? null;
            $offer->inland_city = $validated['inland_city'] ?? null;
            $offer->valid_from = $validated['valid_from'] ?? null;
            $offer->valid_to = $validated['valid_to'] ?? null;
            $offer->status = $validated['status'] ?? 'draft';
            $offer->other_charges = $validated['other_charges'] ?? null;
            $offer->available_sailing_days = $validated['available_sailing_days'] ?? null;
            $offer->weekly_sailings = $validated['weekly_sailings'] ?? null;
            $offer->notes = $validated['notes'] ?? null;
            $offer->save();

            $this->syncSailingDates($offer, $validated['sailing_dates'] ?? []);
            $this->syncPricingItems($offer, $validated['pricing']);

            return $offer;
        });

        $offer->load(['items', 'sailingDates']);

        return response()->json([
            'data' => $this->transformOffer($offer),
        ], 201);
    }

    public function update(Request $request, PricingOffer $offer)
    {
        $this->authorize('update', $offer);

        $validated = $request->validate([
            'container_type' => ['sometimes', 'nullable', 'string', 'in:Dry,Reefer'],
            'container_size' => ['sometimes', 'nullable', 'string', 'in:20,40'],
            'container_height' => ['sometimes', 'nullable', 'string', 'in:Standard,HQ'],
            'region' => ['sometimes', 'string', 'max:255'],
            'pod' => ['sometimes', 'string', 'max:255'],
            'valid_from' => ['sometimes', 'nullable', 'date'],
            'valid_to' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:draft,active,archived'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'other_charges' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pol' => ['sometimes', 'nullable', 'string', 'max:255'],
            'dnd' => ['sometimes', 'nullable', 'string', 'max:255'],
            'transit_time' => ['sometimes', 'nullable', 'string', 'max:255'],
            'free_time' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_port' => ['sometimes', 'nullable', 'string', 'max:255'],
            'destination' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_gov' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'available_sailing_days' => ['sometimes', 'nullable', 'array'],
            'weekly_sailings' => ['sometimes', 'nullable', 'integer'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'pricing' => ['sometimes', 'array'],
            'pricing.*.name' => ['nullable', 'string', 'max:120'],
            'pricing.*.description' => ['nullable', 'string'],
            'pricing.*.price' => ['nullable', 'numeric', 'min:0'],
            'pricing.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        DB::transaction(function () use ($offer, $validated): void {
            $offer->fill($validated);
            $offer->save();

            if (array_key_exists('sailing_dates', $validated)) {
                $this->syncSailingDates($offer, $validated['sailing_dates'] ?? []);
            }

            if (array_key_exists('pricing', $validated)) {
                $this->syncPricingItems($offer, $validated['pricing'] ?? []);
            }
        });

        $offer->load(['items', 'sailingDates']);

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    public function activate(PricingOffer $offer)
    {
        $this->authorize('activate', $offer);

        $offer->status = 'active';
        $offer->save();

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    public function archive(PricingOffer $offer)
    {
        $this->authorize('archive', $offer);

        $offer->status = 'archived';
        $offer->save();

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    /**
     * @param array<int, string> $dates
     */
    protected function syncSailingDates(PricingOffer $offer, array $dates): void
    {
        PricingOfferSailingDate::where('pricing_offer_id', $offer->id)->delete();

        foreach ($dates as $date) {
            PricingOfferSailingDate::create([
                'pricing_offer_id' => $offer->id,
                'sailing_date' => $date,
            ]);
        }
    }

    /**
     * @param array<string, array{price: mixed, currency: mixed}|null> $pricing
     */
    protected function syncPricingItems(PricingOffer $offer, array $pricing): void
    {
        PricingOfferItem::where('pricing_offer_id', $offer->id)->delete();

        foreach ($pricing as $code => $item) {
            if (! $item || ! array_key_exists('price', $item)) {
                continue;
            }

            // Global Rule: If Container Type = Dry, skip Power items
            if ($offer->container_type === 'Dry' && (strtolower($code) === 'power' || strtolower($code) === 'powerday')) {
                continue;
            }

            $price = $item['price'];
            if ($price === null || $price === '' || ! is_numeric($price)) {
                continue;
            }

            PricingOfferItem::create([
                'pricing_offer_id' => $offer->id,
                'code' => (string) $code,
                'name' => (string) ($item['name'] ?? ''),
                'description' => (string) ($item['description'] ?? ''),
                'price' => (float) $price,
                'currency_code' => (string) ($item['currency'] ?? 'USD'),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformOffer(PricingOffer $offer): array
    {
        $pricing = [];
        foreach ($offer->items as $item) {
            $pricing[$item->code] = [
                'name' => $item->name,
                'description' => $item->description,
                'price' => (float) $item->price,
                'currency' => $item->currency_code,
            ];
        }

        return [
            'id' => $offer->id,
            'pricing_type' => $offer->pricing_type,
            'container_type' => $offer->container_type,
            'container_size' => $offer->container_size,
            'container_height' => $offer->container_height,
            'region' => $offer->region,
            'pod' => $offer->pod,
            'shipping_line' => $offer->shipping_line,
            'pol' => $offer->pol,
            'dnd' => $offer->dnd,
            'transit_time' => $offer->transit_time,
            'free_time' => $offer->free_time,
            'inland_port' => $offer->inland_port,
            'destination' => $offer->destination,
            'inland_gov' => $offer->inland_gov,
            'inland_city' => $offer->inland_city,
            'valid_from' => $offer->valid_from?->toDateString(),
            'valid_to' => $offer->valid_to?->toDateString(),
            'status' => $offer->status,
            'other_charges' => $offer->other_charges,
            'available_sailing_days' => $offer->available_sailing_days,
            'weekly_sailings' => $offer->weekly_sailings,
            'notes' => $offer->notes,
            'sailing_dates' => $offer->sailingDates->pluck('sailing_date')->map(
                static fn ($d) => $d?->toDateString()
            )->filter()->values(),
            'pricing' => $pricing,
        ];
    }
}

