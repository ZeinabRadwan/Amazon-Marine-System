<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\SeaPricingDisplayOrder;
use App\Models\PricingOffer;
use App\Models\PricingOfferItem;
use App\Models\PricingOfferSailingDate;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PricingOfferController extends Controller
{
    public function index(Request $request)
    {
        $this->ensureCanViewOffers($request->user());
        $this->authorize('viewAny', PricingOffer::class);

        $query = PricingOffer::query()
            ->with(['items', 'sailingDates']);

        if ($type = $request->query('pricing_type')) {
            $query->where('pricing_type', $type);
        }

        if ($direction = $request->query('pricing_direction')) {
            $query->where('pricing_direction', $direction);
        } elseif ($request->query('pricing_type') === 'sea') {
            $this->applySeaDirectionScopeForUser($query, $request->user());
        }

        if ($region = $request->query('region')) {
            $query->where('region', $region);
        }

        if ($pod = $request->query('pod')) {
            $query->where('pod', $pod);
        }

        if ($pol = $request->query('pol')) {
            $query->where('pol', $pol);
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

        if ($request->boolean('quotable')) {
            $query->where('status', 'active')
                ->where(function ($sub): void {
                    $sub->whereNull('valid_to')
                        ->orWhereDate('valid_to', '>=', now()->toDateString());
                });
        } elseif ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $user = $request->user();
        if (
            ! $request->boolean('quotable')
            && $user
            && ($user->hasRole('sales') || $user->hasRole('sales_manager'))
            && ! $user->hasRole('admin')
        ) {
            $query->where('status', '!=', 'draft');
        }

        if ($itemCode = $request->query('pricing_item_code')) {
            $query->whereHas('items', fn ($q) => $q->where('code', $itemCode));
        }

        if ($from = $request->query('valid_from')) {
            $query->whereDate('valid_to', '>=', $from);
        }

        if ($to = $request->query('valid_to')) {
            $query->whereDate('valid_to', '<=', $to);
        }

        // Text search is AND-combined with pol/pod/container filters above — narrows results further.
        if ($q = $request->query('q')) {
            $like = '%'.$q.'%';
            $query->where(function ($sub) use ($like): void {
                $sub->where('region', 'like', $like)
                    ->orWhere('pod', 'like', $like)
                    ->orWhere('pol', 'like', $like)
                    ->orWhere('shipping_line', 'like', $like)
                    ->orWhere('inland_port', 'like', $like)
                    ->orWhere('destination', 'like', $like)
                    ->orWhere('notes', 'like', $like);
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

    /**
     * Distinct non-empty region values from sea offers (for pricing form AsyncSelect + inline create).
     */
    public function seaRegions(Request $request)
    {
        $this->ensureCanViewOffers($request->user());
        $this->authorize('viewAny', PricingOffer::class);

        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $q = isset($validated['q']) ? trim((string) $validated['q']) : '';

        $query = PricingOffer::query()
            ->where('pricing_type', 'sea')
            ->whereNotNull('region')
            ->where('region', '!=', '');

        if ($q !== '') {
            $query->where('region', 'like', '%'.$q.'%');
        }

        $regions = $query
            ->select('region')
            ->distinct()
            ->orderBy('region')
            ->limit(100)
            ->pluck('region')
            ->values();

        return response()->json([
            'data' => $regions,
        ]);
    }

    public function show(PricingOffer $offer)
    {
        $this->ensureCanViewOffers(request()->user());
        $this->authorize('view', $offer);

        $offer->load(['items', 'sailingDates']);

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    public function store(Request $request)
    {
        $this->ensureCanManageOffers($request->user());
        $this->authorize('create', PricingOffer::class);

        $validated = $request->validate([
            'pricing_type' => ['required', 'string', 'in:sea,inland'],
            'pricing_direction' => ['nullable', 'string', 'in:export,import'],
            'region' => ['required', 'string', 'max:255'],
            'pod' => ['required', 'string', 'max:255'],
            'valid_from' => ['nullable', 'date'],
            'weekly_sailing_days' => ['nullable', 'string', 'max:255'],
            'valid_to' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:draft,active,archived'],
            'notes' => ['nullable', 'string'],
            'ows_data' => ['nullable', 'array'],
            'other_charges' => ['nullable', 'string', 'max:255'],
            'shipping_line' => ['required_if:pricing_type,sea', 'nullable', 'string', 'max:255'],
            'pol' => ['required_if:pricing_type,sea', 'nullable', 'string', 'max:255'],
            'dnd' => ['nullable', 'string', 'max:255'],
            'transit_time' => ['nullable', 'string', 'max:255'],
            'inland_port' => ['required_if:pricing_type,inland', 'nullable', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'inland_gov' => ['nullable', 'string', 'max:255'],
            'inland_city' => ['nullable', 'string', 'max:255'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'pricing' => ['required', 'array'],
            'pricing.*.price' => ['nullable', 'numeric', 'min:0'],
            'pricing.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $direction = $validated['pricing_type'] === 'sea'
            ? ($validated['pricing_direction'] ?? 'export')
            : 'export';
        $this->ensureCanManageSeaDirection($request->user(), $direction);

        $offer = DB::transaction(function () use ($validated, $direction) {
            $offer = new PricingOffer;
            $offer->pricing_type = $validated['pricing_type'];
            $offer->pricing_direction = $direction;
            $offer->region = $validated['region'];
            $offer->pod = $validated['pod'];
            $offer->shipping_line = $validated['shipping_line'] ?? null;
            $offer->pol = $validated['pol'] ?? null;
            $offer->dnd = $validated['dnd'] ?? null;
            $offer->transit_time = $validated['transit_time'] ?? null;
            $offer->inland_port = $validated['inland_port'] ?? null;
            $offer->destination = $validated['destination'] ?? null;
            $offer->inland_gov = $validated['inland_gov'] ?? null;
            $offer->inland_city = $validated['inland_city'] ?? null;
            $offer->valid_from = $validated['valid_from'] ?? null;
            $offer->weekly_sailing_days = $validated['weekly_sailing_days'] ?? null;
            $offer->valid_to = $validated['valid_to'] ?? null;
            $offer->status = $validated['status'] ?? 'active';
            $offer->other_charges = $validated['other_charges'] ?? null;
            [$offer->notes, $offer->ows_data] = $this->resolveNotesAndOwsData(
                $validated['notes'] ?? null,
                $validated['ows_data'] ?? null,
                $direction
            );
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
        $this->ensureCanManageOffers($request->user());
        $this->authorize('update', $offer);

        $validated = $request->validate([
            'pricing_direction' => ['sometimes', 'string', 'in:export,import'],
            'region' => ['sometimes', 'string', 'max:255'],
            'pod' => ['sometimes', 'string', 'max:255'],
            'valid_from' => ['sometimes', 'nullable', 'date'],
            'weekly_sailing_days' => ['sometimes', 'nullable', 'string', 'max:255'],
            'valid_to' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:draft,active,archived'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'ows_data' => ['sometimes', 'nullable', 'array'],
            'other_charges' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pol' => ['sometimes', 'nullable', 'string', 'max:255'],
            'dnd' => ['sometimes', 'nullable', 'string', 'max:255'],
            'transit_time' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_port' => ['sometimes', 'nullable', 'string', 'max:255'],
            'destination' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_gov' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'pricing' => ['sometimes', 'array'],
            'pricing.*.price' => ['nullable', 'numeric', 'min:0'],
            'pricing.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $nextDirection = $validated['pricing_direction'] ?? $offer->pricing_direction ?? 'export';
        if ($offer->pricing_type === 'sea') {
            $this->ensureCanManageSeaDirection($request->user(), $nextDirection);
        }

        DB::transaction(function () use ($offer, $validated): void {
            if (array_key_exists('notes', $validated) || array_key_exists('ows_data', $validated)) {
                $direction = $validated['pricing_direction'] ?? $offer->pricing_direction ?? 'export';
                [$notes, $owsData] = $this->resolveNotesAndOwsData(
                    array_key_exists('notes', $validated) ? $validated['notes'] : $offer->notes,
                    array_key_exists('ows_data', $validated) ? $validated['ows_data'] : $offer->ows_data,
                    $direction
                );
                $validated['notes'] = $notes;
                $validated['ows_data'] = $owsData;
            }
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
        $this->ensureCanManageOffers(request()->user());
        $this->authorize('activate', $offer);

        $offer->status = 'active';
        $offer->save();

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    public function archive(PricingOffer $offer)
    {
        $this->ensureCanManageOffers(request()->user());
        $this->authorize('archive', $offer);

        $offer->status = 'archived';
        $offer->save();

        return response()->json([
            'data' => $this->transformOffer($offer),
        ]);
    }

    public function destroy(PricingOffer $offer)
    {
        $this->ensureCanManageOffers(request()->user());
        $this->authorize('delete', $offer);

        if ($offer->status !== 'archived') {
            abort(409, 'Only archived pricing offers can be deleted.');
        }

        $offer->delete();

        return response()->json([
            'message' => 'Pricing offer deleted.',
        ]);
    }

    protected function ensureCanViewOffers(?User $user): void
    {
        if (! $user || (! $user->hasRole('admin') && ! $user->hasPermissionTo('pricing.view_offers'))) {
            throw new AuthorizationException;
        }
    }

    protected function ensureCanManageOffers(?User $user): void
    {
        if (! $user) {
            throw new AuthorizationException;
        }

        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasAnyRole(['sales', 'sales_manager'])) {
            throw new AuthorizationException;
        }

        if (
            ! $user->hasRole('pricing')
            && ! $user->hasPermissionTo('pricing.manage_offers')
            && ! $user->hasPermissionTo('pricing.manage_export_offers')
            && ! $user->hasPermissionTo('pricing.manage_import_offers')
        ) {
            throw new AuthorizationException;
        }
    }

    protected function ensureCanManageSeaDirection(?User $user, string $direction): void
    {
        if (! $user) {
            throw new AuthorizationException;
        }

        if ($user->hasRole('admin') || $user->hasPermissionTo('pricing.manage_offers')) {
            return;
        }

        $direction = $direction === 'import' ? 'import' : 'export';

        if ($direction === 'export' && $user->hasPermissionTo('pricing.manage_export_offers')) {
            return;
        }

        if ($direction === 'import' && $user->hasPermissionTo('pricing.manage_import_offers')) {
            return;
        }

        throw new AuthorizationException;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<PricingOffer>  $query
     */
    protected function applySeaDirectionScopeForUser($query, ?User $user): void
    {
        if (! $user || $user->hasRole('admin') || $user->hasPermissionTo('pricing.manage_offers')) {
            return;
        }

        $canExport = $user->hasPermissionTo('pricing.manage_export_offers');
        $canImport = $user->hasPermissionTo('pricing.manage_import_offers');

        if ($canExport && ! $canImport) {
            $query->where('pricing_direction', 'export');
        } elseif ($canImport && ! $canExport) {
            $query->where('pricing_direction', 'import');
        }
    }

    /**
     * @param  array<int, string>  $dates
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
     * @param  array<string, array{price: mixed, currency: mixed}|null>  $pricing
     */
    protected function syncPricingItems(PricingOffer $offer, array $pricing): void
    {
        PricingOfferItem::where('pricing_offer_id', $offer->id)->delete();

        foreach ($pricing as $code => $item) {
            if (! $item || ! array_key_exists('price', $item)) {
                continue;
            }

            $price = $item['price'];
            if ($price === null || $price === '' || ! is_numeric($price)) {
                continue;
            }

            PricingOfferItem::create([
                'pricing_offer_id' => $offer->id,
                'code' => (string) $code,
                'price' => (float) $price,
                'currency_code' => (string) ($item['currency'] ?? 'USD'),
            ]);
        }
    }

    /**
     * @return array{0: ?string, 1: ?array<string, mixed>}
     */
    protected function resolveNotesAndOwsData(?string $notes, mixed $owsData, string $direction): array
    {
        $cleanNotes = self::stripOwsFromNotes($notes);
        $normalizedOws = $direction === 'import' ? self::normalizeOwsData($owsData) : null;

        if ($normalizedOws === null && $direction === 'import') {
            $legacy = self::parseOwsFromNotes($notes);
            $normalizedOws = self::normalizeOwsData($legacy);
        }

        return [$cleanNotes, $normalizedOws];
    }

    protected static function stripOwsFromNotes(?string $notes): ?string
    {
        if ($notes === null || trim($notes) === '') {
            return null;
        }

        $s = preg_replace('/\n\n__OWS_DATA_B64__=[\s\S]*?__/s', '', $notes) ?? $notes;
        $s = preg_replace('/^__OWS_DATA_B64__=[\s\S]*?__(\n\n|\n)?/m', '', $s) ?? $s;
        $s = trim($s);

        return $s !== '' ? $s : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    protected static function parseOwsFromNotes(?string $notes): ?array
    {
        if ($notes === null || ! preg_match('/__OWS_DATA_B64__=(.+?)__/s', $notes, $matches)) {
            return null;
        }

        try {
            $json = base64_decode($matches[1], true);
            if ($json === false) {
                return null;
            }
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

            return is_array($data) ? $data : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    protected static function normalizeOwsData(mixed $raw): ?array
    {
        if (! is_array($raw) || empty($raw['enabled'])) {
            return null;
        }

        return $raw;
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformOffer(PricingOffer $offer): array
    {
        $pricing = [];
        $pricingItems = [];
        foreach ($offer->items as $item) {
            $pricing[$item->code] = [
                'price' => (float) $item->price,
                'currency' => $item->currency_code,
            ];
            $pricingItems[] = [
                'id' => $item->id,
                'code' => $item->code,
                'price' => (float) $item->price,
                'currency' => $item->currency_code,
            ];
        }

        if ($offer->pricing_type === 'sea' && count($pricingItems) > 1) {
            usort($pricingItems, static function (array $a, array $b): int {
                return SeaPricingDisplayOrder::compare((string) ($a['code'] ?? ''), (string) ($b['code'] ?? ''));
            });
        }

        return [
            'id' => $offer->id,
            'pricing_type' => $offer->pricing_type,
            'pricing_direction' => $offer->pricing_direction ?? 'export',
            'region' => $offer->region,
            'pod' => $offer->pod,
            'shipping_line' => $offer->shipping_line,
            'pol' => $offer->pol,
            'dnd' => $offer->dnd,
            'transit_time' => $offer->transit_time,
            'valid_from' => $offer->valid_from?->toDateString(),
            'weekly_sailing_days' => $offer->weekly_sailing_days,
            'inland_port' => $offer->inland_port,
            'destination' => $offer->destination,
            'inland_gov' => $offer->inland_gov,
            'inland_city' => $offer->inland_city,
            'valid_to' => $offer->valid_to?->toDateString(),
            'status' => $offer->status,
            'display_status' => $offer->displayStatus(),
            'is_quotable' => $offer->isQuotable(),
            'other_charges' => $offer->other_charges,
            'notes' => self::stripOwsFromNotes($offer->notes),
            'ows_data' => $offer->ows_data ?? self::normalizeOwsData(self::parseOwsFromNotes($offer->notes)),
            'sailing_dates' => $offer->sailingDates->pluck('sailing_date')->map(
                static fn ($d) => $d?->toDateString()
            )->filter()->values(),
            'pricing' => $pricing,
            'pricing_items' => $pricingItems,
        ];
    }
}
