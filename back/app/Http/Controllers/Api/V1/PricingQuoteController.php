<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\PricingOffer;
use App\Models\PricingOfferSnapshot;
use App\Models\PricingQuote;
use App\Models\PricingQuoteItem;
use App\Models\PricingQuoteSailingDate;
use App\Services\AppSettings;
use App\Support\PdfLogo;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Mpdf\Mpdf;

class PricingQuoteController extends Controller
{
    /**
     * Canonical pricing item codes across rate/quotation modules.
     *
     * @var array<int, string>
     */
    private const PRICING_ITEM_CODES = ['OF', 'DTHC', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER', 'INLAND', 'HANDLING', 'OTHER'];

    public function index(Request $request)
    {
        $this->authorize('viewAny', PricingQuote::class);

        $query = PricingQuote::query()->with([
            'client',
            'salesUser',
            'items',
            'offer:id,pricing_type,pricing_direction',
        ]);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', (int) $clientId);
        }

        $user = $request->user();
        if ($user && $user->hasRole('sales') && ! $user->hasRole('admin')) {
            $query->where('sales_user_id', $user->id);
        } elseif ($salesUserId = $request->query('sales_user_id')) {
            $query->where('sales_user_id', (int) $salesUserId);
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
                if (ctype_digit((string) $q)) {
                    $sub->orWhere('id', (int) $q);
                }
            });
        }

        $query->orderByDesc('created_at');

        $perPage = $request->integer('per_page', 20);
        $paginator = $query->paginate($perPage);

        $rows = $paginator->getCollection()->map(function (PricingQuote $quote): array {
            $totalsByCurrency = $this->sumQuoteItemsByCurrency($quote->items);

            return [
                'id' => $quote->id,
                'quote_no' => $quote->quote_no,
                'status' => $quote->status,
                'quick_mode' => (bool) $quote->quick_mode,
                'is_quick_quotation' => (bool) $quote->quick_mode,
                'quick_mode_reason' => $quote->quick_mode_reason,
                'client' => $quote->client ? ['id' => $quote->client->id, 'name' => $quote->client->name] : null,
                'sales_user' => $quote->salesUser ? ['id' => $quote->salesUser->id, 'name' => $quote->salesUser->name] : null,
                'pricing_type' => $this->resolveQuotePricingType($quote),
                'pricing_direction' => $this->resolveQuoteSeaDirection($quote),
                'pol' => $quote->pol,
                'pod' => $quote->pod,
                'inland_port' => $quote->inland_port,
                'inland_address' => $quote->inland_address,
                'shipping_line' => $quote->shipping_line,
                'container_type' => $quote->container_type,
                'qty' => $quote->qty,
                'valid_from' => $quote->valid_from?->toDateString(),
                'valid_to' => $quote->valid_to?->toDateString(),
                'totals_by_currency' => $totalsByCurrency,
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

        $isQuick = $request->boolean('quick_mode') || $request->boolean('is_quick_quotation');

        $validated = $request->validate([
            'quote_no' => ['nullable', 'string', 'max:40'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'sales_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'pricing_offer_id' => [Rule::excludeIf($isQuick), 'nullable', 'integer', 'exists:pricing_offers,id'],
            'pricing_type' => ['sometimes', 'string', 'in:sea,inland'],
            'inland_port' => ['nullable', 'string', 'max:255'],
            'inland_address' => ['nullable', 'string', 'max:500'],
            'origin_rate_snapshot_id' => [Rule::excludeIf($isQuick), 'nullable', 'integer', 'exists:pricing_offer_snapshots,id'],
            'quick_mode' => ['sometimes', 'boolean'],
            'is_quick_quotation' => ['sometimes', 'boolean'],
            'quick_mode_reason' => ['nullable', 'string', 'max:255'],
            'pol' => ['nullable', 'string', 'max:255'],
            'pod' => ['nullable', 'string', 'max:255'],
            'shipping_line' => ['nullable', 'string', 'max:255'],
            'show_carrier_on_pdf' => ['sometimes', 'boolean'],
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
            'free_time_data.reefer' => ['nullable', 'array'],
            'free_time_data.reefer.deferred_power' => ['nullable', 'boolean'],
            'free_time_data.reefer.power_per_day' => ['nullable', 'array'],
            'free_time_data.reefer.power_per_day.amount' => ['nullable', 'numeric', 'min:0'],
            'free_time_data.reefer.power_per_day.currency' => ['nullable', 'string', 'max:10'],
            'free_time_data.reefer.pti' => ['nullable', 'array'],
            'free_time_data.reefer.pti.amount' => ['nullable', 'numeric', 'min:0'],
            'free_time_data.reefer.pti.currency' => ['nullable', 'string', 'max:10'],
            'free_time_data.reefer.free_power_days' => ['nullable', 'integer', 'min:0'],
            'schedule_type' => ['nullable', 'string', 'in:fixed,weekly'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'official_receipts_note' => ['nullable', 'string', 'max:5000'],
            'pricing_team_confirmed' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:pending,accepted,rejected'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'sailing_weekdays' => ['sometimes', 'array'],
            'sailing_weekdays.*' => ['string', 'in:Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.code' => ['required', 'string', Rule::in(self::PRICING_ITEM_CODES)],
            'items.*.name' => ['required', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.cost_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.visible_to_client' => ['sometimes', 'boolean'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $validated = $this->mergeQuickQuotationFlag($validated);

        $quote = DB::transaction(function () use ($validated) {
            $quickMode = (bool) ($validated['quick_mode'] ?? false);

            $quickModeReason = isset($validated['quick_mode_reason']) ? trim((string) $validated['quick_mode_reason']) : '';
            if ($quickMode && $quickModeReason === '') {
                $quickModeReason = 'Quick Quotation';
            }
            if (! $quickMode) {
                $quickModeReason = $validated['quick_mode_reason'] ?? null;
            }

            $originSnapshotId = $validated['origin_rate_snapshot_id'] ?? null;
            if (! $quickMode && ! $originSnapshotId && ! empty($validated['pricing_offer_id'])) {
                $offer = PricingOffer::query()->with(['items', 'sailingDates'])->find((int) $validated['pricing_offer_id']);
                if ($offer) {
                    $this->assertOfferQuotable($offer);
                    $originSnapshotId = $this->createOriginRateSnapshot($offer)->id;
                }
            }
            if (! $quickMode && ! empty($validated['pricing_offer_id']) && ! empty($originSnapshotId)) {
                $originSnapshot = PricingOfferSnapshot::query()->find((int) $originSnapshotId);
                if (! $originSnapshot || (int) $originSnapshot->pricing_offer_id !== (int) $validated['pricing_offer_id']) {
                    abort(422, 'origin_rate_snapshot_id must belong to the same pricing_offer_id.');
                }
            }
            if (($validated['schedule_type'] ?? null) === 'fixed' && ! empty($validated['sailing_weekdays'])) {
                abort(422, 'sailing_weekdays are not allowed for fixed schedule.');
            }
            if (($validated['schedule_type'] ?? null) === 'weekly' && count($validated['sailing_dates'] ?? []) > 1) {
                abort(422, 'At most one sailing date is allowed for weekly schedule.');
            }

            $pricingType = $this->resolveQuotePricingTypeFromPayload($validated, $quickMode);

            $quote = new PricingQuote;
            $quote->quote_no = $validated['quote_no'] ?? $this->generateQuoteNo();
            $quote->client_id = $validated['client_id'] ?? null;
            $quote->sales_user_id = $validated['sales_user_id'] ?? null;
            $quote->pricing_offer_id = $quickMode ? null : ($validated['pricing_offer_id'] ?? null);
            $quote->pricing_type = $pricingType;
            $quote->origin_rate_snapshot_id = $quickMode ? null : $originSnapshotId;
            $quote->quick_mode = $quickMode;
            $quote->quick_mode_reason = $quickModeReason;
            $this->applyQuoteRouteFields($quote, $validated, $pricingType);
            $quote->shipping_line = $pricingType === 'inland' ? null : ($validated['shipping_line'] ?? null);
            $quote->show_carrier_on_pdf = $pricingType === 'inland'
                ? false
                : (bool) ($validated['show_carrier_on_pdf'] ?? true);
            if ($pricingType === 'sea') {
                $quote->container_type = $validated['container_type'] ?? null;
                $quote->container_spec = $validated['container_spec'] ?? null;
                $quote->qty = $validated['qty'] ?? null;
                $quote->transit_time = $validated['transit_time'] ?? null;
                $quote->free_time = $validated['free_time'] ?? null;
                $quote->free_time_data = $validated['free_time_data'] ?? null;
                $quote->schedule_type = $validated['schedule_type'] ?? null;
                $quote->sailing_weekdays = $validated['sailing_weekdays'] ?? null;
            } else {
                $quote->container_type = null;
                $quote->container_spec = null;
                $quote->qty = null;
            }
            $quote->valid_from = $validated['valid_from'] ?? null;
            $quote->valid_to = $validated['valid_to'] ?? null;
            $quote->notes = $validated['notes'] ?? null;
            $quote->municipality = isset($validated['municipality'])
                ? (trim((string) $validated['municipality']) !== '' ? trim((string) $validated['municipality']) : null)
                : null;
            $quote->official_receipts_note = isset($validated['official_receipts_note'])
                ? (trim((string) $validated['official_receipts_note']) !== '' ? trim((string) $validated['official_receipts_note']) : null)
                : null;
            $quote->pricing_team_confirmed = (bool) ($validated['pricing_team_confirmed'] ?? false);
            $quote->status = $validated['status'] ?? 'pending';
            $quote->save();

            $this->syncQuoteItems($quote, $validated['items'] ?? []);
            $this->syncQuoteSailingDates(
                $quote,
                $pricingType === 'sea' ? ($validated['sailing_dates'] ?? []) : []
            );

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

        $isQuick = $request->boolean('quick_mode') || $request->boolean('is_quick_quotation') || $quote->quick_mode;

        $validated = $request->validate([
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'sales_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'pricing_offer_id' => [Rule::excludeIf($isQuick), 'sometimes', 'nullable', 'integer', 'exists:pricing_offers,id'],
            'pricing_type' => ['sometimes', 'string', 'in:sea,inland'],
            'inland_port' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inland_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'origin_rate_snapshot_id' => [Rule::excludeIf($isQuick), 'sometimes', 'nullable', 'integer', 'exists:pricing_offer_snapshots,id'],
            'quick_mode' => ['sometimes', 'boolean'],
            'is_quick_quotation' => ['sometimes', 'boolean'],
            'quick_mode_reason' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pol' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pod' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'show_carrier_on_pdf' => ['sometimes', 'boolean'],
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
            'free_time_data.reefer' => ['nullable', 'array'],
            'free_time_data.reefer.deferred_power' => ['nullable', 'boolean'],
            'free_time_data.reefer.power_per_day' => ['nullable', 'array'],
            'free_time_data.reefer.power_per_day.amount' => ['nullable', 'numeric', 'min:0'],
            'free_time_data.reefer.power_per_day.currency' => ['nullable', 'string', 'max:10'],
            'free_time_data.reefer.pti' => ['nullable', 'array'],
            'free_time_data.reefer.pti.amount' => ['nullable', 'numeric', 'min:0'],
            'free_time_data.reefer.pti.currency' => ['nullable', 'string', 'max:10'],
            'free_time_data.reefer.free_power_days' => ['nullable', 'integer', 'min:0'],
            'schedule_type' => ['sometimes', 'nullable', 'string', 'in:fixed,weekly'],
            'valid_from' => ['sometimes', 'nullable', 'date'],
            'valid_to' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'municipality' => ['sometimes', 'nullable', 'string', 'max:255'],
            'official_receipts_note' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'pricing_team_confirmed' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:pending,accepted,rejected'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'sailing_weekdays' => ['sometimes', 'array'],
            'sailing_weekdays.*' => ['string', 'in:Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.code' => ['required_with:items', 'string', Rule::in(self::PRICING_ITEM_CODES)],
            'items.*.name' => ['required_with:items', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.cost_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.visible_to_client' => ['sometimes', 'boolean'],
            'items.*.amount' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $validated = $this->mergeQuickQuotationFlag($validated);

        $quickMode = (bool) ($quote->quick_mode || ($validated['quick_mode'] ?? false));

        if (array_key_exists('official_receipts_note', $validated)) {
            $trimmed = trim((string) ($validated['official_receipts_note'] ?? ''));
            $validated['official_receipts_note'] = $trimmed !== '' ? $trimmed : null;
        }

        if ((($validated['schedule_type'] ?? $quote->schedule_type) === 'fixed') && ! empty($validated['sailing_weekdays'] ?? [])) {
            abort(422, 'sailing_weekdays are not allowed for fixed schedule.');
        }
        if ((($validated['schedule_type'] ?? $quote->schedule_type) === 'weekly') && count($validated['sailing_dates'] ?? []) > 1) {
            abort(422, 'At most one sailing date is allowed for weekly schedule.');
        }
        if (! $quickMode && ! empty($validated['pricing_offer_id'] ?? $quote->pricing_offer_id) && ! empty($validated['origin_rate_snapshot_id'] ?? $quote->origin_rate_snapshot_id)) {
            $offerId = (int) ($validated['pricing_offer_id'] ?? $quote->pricing_offer_id);
            $snapshotId = (int) ($validated['origin_rate_snapshot_id'] ?? $quote->origin_rate_snapshot_id);
            $snapshot = PricingOfferSnapshot::query()->find($snapshotId);
            if (! $snapshot || (int) $snapshot->pricing_offer_id !== $offerId) {
                abort(422, 'origin_rate_snapshot_id must belong to the same pricing_offer_id.');
            }
        }

        DB::transaction(function () use ($quote, $validated, $quickMode): void {
            $payloadForType = array_merge(
                [
                    'pricing_type' => $quote->pricing_type,
                    'pricing_offer_id' => $quote->pricing_offer_id,
                    'pol' => $quote->pol,
                    'pod' => $quote->pod,
                    'inland_port' => $quote->inland_port,
                    'inland_address' => $quote->inland_address,
                    'municipality' => $quote->municipality,
                ],
                $validated
            );
            if (array_key_exists('items', $validated)) {
                $payloadForType['items'] = $validated['items'];
            }

            $pricingType = $this->resolveQuotePricingTypeFromPayload($payloadForType, $quickMode);

            $quote->fill($validated);
            $quote->pricing_type = $pricingType;
            if ($quickMode) {
                $quote->quick_mode = true;
                $quote->pricing_offer_id = null;
                $quote->origin_rate_snapshot_id = null;
            }
            if ($quote->quick_mode && ($quote->quick_mode_reason === null || trim((string) $quote->quick_mode_reason) === '')) {
                $quote->quick_mode_reason = 'Quick Quotation';
            }
            if (
                ! $quote->quick_mode
                && (array_key_exists('pricing_offer_id', $validated) && ! array_key_exists('origin_rate_snapshot_id', $validated))
                && ! empty($validated['pricing_offer_id'])
            ) {
                $offer = PricingOffer::query()->with(['items', 'sailingDates'])->find((int) $validated['pricing_offer_id']);
                if ($offer) {
                    $this->assertOfferQuotable($offer);
                    $quote->origin_rate_snapshot_id = $this->createOriginRateSnapshot($offer)->id;
                }
            }

            if (
                ! $quote->quick_mode
                && ! empty($validated['pricing_offer_id'] ?? $quote->pricing_offer_id)
            ) {
                $linked = PricingOffer::query()->find((int) ($validated['pricing_offer_id'] ?? $quote->pricing_offer_id));
                if ($linked) {
                    $this->assertOfferQuotable($linked);
                }
            }

            $this->applyQuoteRouteFields($quote, $payloadForType, $pricingType);

            if (array_key_exists('shipping_line', $validated) || $pricingType === 'inland') {
                $quote->shipping_line = $pricingType === 'inland' ? null : ($validated['shipping_line'] ?? $quote->shipping_line);
            }
            if ($pricingType === 'inland') {
                $quote->show_carrier_on_pdf = false;
                $quote->container_type = null;
                $quote->container_spec = null;
                $quote->qty = null;
                $quote->transit_time = null;
                $quote->free_time = null;
                $quote->free_time_data = null;
                $quote->schedule_type = null;
                $quote->sailing_weekdays = null;
            } elseif (array_key_exists('container_type', $validated) || array_key_exists('qty', $validated)) {
                $quote->container_type = $validated['container_type'] ?? $quote->container_type;
                $quote->container_spec = $validated['container_spec'] ?? $quote->container_spec;
                $quote->qty = $validated['qty'] ?? $quote->qty;
                $quote->transit_time = $validated['transit_time'] ?? $quote->transit_time;
                $quote->free_time = $validated['free_time'] ?? $quote->free_time;
                $quote->free_time_data = $validated['free_time_data'] ?? $quote->free_time_data;
                $quote->schedule_type = $validated['schedule_type'] ?? $quote->schedule_type;
                $quote->sailing_weekdays = $validated['sailing_weekdays'] ?? $quote->sailing_weekdays;
            }

            if (array_key_exists('municipality', $validated)) {
                $quote->municipality = trim((string) ($validated['municipality'] ?? '')) !== ''
                    ? trim((string) $validated['municipality'])
                    : null;
            }

            $quote->save();

            if (array_key_exists('items', $validated)) {
                $this->syncQuoteItems($quote, $validated['items'] ?? []);
            }

            if (array_key_exists('sailing_dates', $validated)) {
                $this->syncQuoteSailingDates(
                    $quote,
                    $pricingType === 'sea' ? ($validated['sailing_dates'] ?? []) : []
                );
            } elseif ($pricingType === 'inland') {
                $this->syncQuoteSailingDates($quote, []);
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

    public function destroy(PricingQuote $quote)
    {
        $this->authorize('delete', $quote);

        $quote->delete();

        return response()->json([
            'message' => 'Quotation deleted.',
        ]);
    }

    public function pdf(Request $request, PricingQuote $quote)
    {
        $this->authorize('view', $quote);

        $quote->load(['items', 'sailingDates', 'client', 'salesUser', 'offer.items']);

        $locale = strtolower((string) $request->header('X-App-Locale', 'en')) === 'ar' ? 'ar' : 'en';

        $settings = app(AppSettings::class);
        $companyProfile = $settings->getArray(AppSettings::KEY_COMPANY_PROFILE) ?? [];
        $companyDisplayName = $locale === 'ar'
            ? (string) (($companyProfile['name_ar'] ?? '') !== '' ? $companyProfile['name_ar'] : ($companyProfile['name_en'] ?? ''))
            : (string) (($companyProfile['name_en'] ?? '') !== '' ? $companyProfile['name_en'] : ($companyProfile['name_ar'] ?? ''));

        $clientVisibleItems = $quote->items->filter(
            fn (PricingQuoteItem $i): bool => (bool) ($i->visible_to_client ?? true)
        );
        $clientVisibleItems = $this->excludeDeferredReeferQuoteItems($quote, $clientVisibleItems);
        $partition = $this->partitionQuoteItemsForPdf($quote, $clientVisibleItems);
        $grandTotalsByCurrency = $this->sumQuoteItemsByCurrency($clientVisibleItems);

        $filename = ($quote->quote_no ?: 'Quote-'.$quote->id).'.pdf';

        $labels = $this->quotePdfLabels($locale);
        $labels['brand'] = $companyDisplayName !== '' ? $companyDisplayName : 'Amazon Marine System';
        $labels['brand_tag'] = $locale === 'ar' ? 'الشحن الدولي والملاحة' : 'International Freight Forwarding';
        $labels['brand_contact'] = $this->quotePdfBrandContactLine($companyProfile, $locale);

        $pdfFmtDate = static function ($dt) use ($locale): ?string {
            return $dt
                ? $dt->copy()->timezone(config('app.timezone'))->locale($locale)->isoFormat('L')
                : null;
        };

        $quotePricingType = $this->resolveQuotePricingType($quote);
        $isSeaQuote = $quotePricingType === 'sea';
        $isInlandQuote = $quotePricingType === 'inland';
        $showReeferDeferredPower = $isSeaQuote && $this->quoteShowsDeferredReeferPower($quote);
        $reeferPowerPerDay = $showReeferDeferredPower ? $this->reeferDeferredPowerPerDayForPdf($quote) : null;
        $reeferFreePowerDaysLabel = $showReeferDeferredPower
            ? $this->reeferFreePowerDaysLabelForPdf($quote)
            : null;
        $showOwsDeferred = $isSeaQuote && $this->quoteShowsDeferredOws($quote);
        $owsDeferredLines = $showOwsDeferred ? $this->owsDeferredFootnoteLinesForPdf($quote) : [];

        $html = view('pricing.quote_pdf', [
            'quote' => $quote,
            'lang' => $locale,
            'labels' => $labels,
            'quotePricingType' => $quotePricingType,
            'isSeaQuote' => $isSeaQuote,
            'isInlandQuote' => $isInlandQuote,
            'showCarrier' => $isSeaQuote && (bool) ($quote->show_carrier_on_pdf ?? true),
            'companyProfile' => $companyProfile,
            'companyDisplayName' => $companyDisplayName,
            'pdfLogoSrc' => PdfLogo::imgSrc(),
            'oceanItems' => $partition['ocean'],
            'inlandItems' => $partition['inland'],
            'customsItems' => $partition['customs'],
            'handlingItems' => $partition['handling'],
            'oceanTotalsByCurrency' => $this->sumCollectionByCurrency($partition['ocean']),
            'inlandTotalsByCurrency' => $this->sumCollectionByCurrency($partition['inland']),
            'customsTotalsByCurrency' => $this->sumCollectionByCurrency($partition['customs']),
            'handlingTotalsByCurrency' => $this->sumCollectionByCurrency($partition['handling']),
            'grandTotalsByCurrency' => $grandTotalsByCurrency,
            'sailingDisplay' => $this->sailingScheduleDisplayForPdf($quote),
            'exchangeRateLabel' => $this->quotePdfExchangeRateLabel(),
            'issueDateFormatted' => $quote->created_at ? $pdfFmtDate($quote->created_at) : '—',
            'validUntilFormatted' => $quote->valid_to ? $pdfFmtDate($quote->valid_to) : '—',
            'containerDisplay' => $this->quotePdfContainerDisplay($quote),
            'formatBreakdown' => fn (array $map): string => $this->formatCurrencyBreakdown($map),
            'showReeferDeferredPower' => $showReeferDeferredPower,
            'reeferPowerPerDay' => $reeferPowerPerDay,
            'reeferFreePowerDaysLabel' => $reeferFreePowerDaysLabel,
            'showOwsDeferred' => $showOwsDeferred,
            'owsDeferredLines' => $owsDeferredLines,
        ])->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'default_font' => 'dejavusans',
            'format' => 'A4',
            'margin_top' => 10,
            'margin_bottom' => 15,
            'margin_left' => 10,
            'margin_right' => 10,
        ]);

        $mpdf->WriteHTML($html);

        return response($mpdf->Output($filename, 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /**
     * Single-line contact strip for quotation PDF header (matches SD form style).
     *
     * @param  array<string, mixed>  $companyProfile
     */
    private function quotePdfBrandContactLine(array $companyProfile, string $locale): string
    {
        $phone = trim((string) ($companyProfile['phone'] ?? ''));
        $email = trim((string) ($companyProfile['email'] ?? ''));
        $parts = [];
        if ($phone !== '') {
            $parts[] = ($locale === 'ar' ? 'هاتف: ' : 'Tel: ').$phone;
        }
        if ($email !== '') {
            $parts[] = $email;
        }

        return $parts !== [] ? implode('  |  ', $parts) : ($locale === 'ar' ? 'هاتف: +201200744888  |  info@amazonmarine.com' : 'Tel: +201200744888  |  info@amazonmarine.com');
    }

    /**
     * Bilingual PDF chrome: EN line + AR line (always the same regardless of request locale).
     *
     * @return array<string, string>
     */
    private function quotePdfBilingualLabels(): array
    {
        return [
            'doc_title_en' => 'Price Quotation',
            'doc_title_ar' => 'عرض سعر',
            'quotation_id' => 'Quotation ID',
            'quotation_id_ar' => 'رقم عرض السعر',
            'valid_until' => 'Valid Until',
            'valid_until_ar' => 'صالح حتى',
            'issued_date' => 'Issue Date',
            'issued_date_ar' => 'تاريخ الإصدار',
            'issued_by' => 'From issue by',
            'issued_by_ar' => 'صادر من',
            'billed_to' => 'Sent To',
            'billed_to_ar' => 'مرسلة إلى',
            'available_sailing_en' => 'Available Sailing',
            'available_sailing_ar' => 'مواعيد الإبحار المتاحة',
            'section_handling_fees_en' => 'Handling Fees',
            'section_handling_fees_ar' => 'رسوم الخدمة والمتابعة',
            'containers' => 'Containers',
            'containers_ar' => 'الحاويات',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function quotePdfLabels(string $locale): array
    {
        $bilingual = $this->quotePdfBilingualLabels();

        if ($locale === 'ar') {
            return array_merge($bilingual, [
                'doc_title' => 'عرض سعر',
                'exchange_rate' => 'سعر الصرف',
                'exchange_rate_ar' => 'سعر الصرف',
                'available_sailing' => 'مواعيد الإبحار المتاحة',
                'section_shipping' => 'تفاصيل الشحن',
                'section_shipping_en' => 'Shipping details',
                'quote_no' => 'رقم العرض',
                'date' => 'التاريخ',
                'client' => 'العميل',
                'section_client_company' => '١. العميل / الشركة',
                'company_label' => 'شركتنا',
                'route' => 'المسار',
                'carrier' => 'خط الشحن',
                'container' => 'الحاوية',
                'qty' => 'الكمية',
                'transit_time' => 'Transit Time',
                'free_time' => 'وقت الفراغ',
                'schedule' => 'الجدول',
                'validity' => 'صلاحية العرض',
                'section_route' => '٢. تفاصيل المسار والجدول',
                'section_ocean_freight' => '٣. الشحن البحري',
                'section_inland_transport' => '٤. النقل الداخلي',
                'section_customs' => '٥. الجمارك والرسوم الأخرى',
                'section_handling_fees' => 'رسوم الخدمة والمتابعة',
                'section_totals' => '٧. الإجماليات',
                'section_notes' => '٨. ملاحظات',
                'section_terms' => '٩. الشروط والأحكام',
                'section_prepared_by' => '١٠. أعد بواسطة',
                'items' => 'البنود',
                'description' => 'البيان',
                'amount' => 'المبلغ',
                'currency' => 'العملة',
                'subtotal' => 'المجموع الفرعي',
                'total' => 'الإجمالي',
                'grand_total' => 'الإجمالي الكلي',
                'notes' => 'ملاحظات',
                'sales' => 'مندوب المبيعات',
                'phone' => 'الهاتف',
                'email' => 'البريد الإلكتروني',
                'address' => 'العنوان',
                'pol' => 'ميناء التحميل',
                'pod' => 'ميناء التفريغ',
                'terms_html' => '<p>يجب تأكيد الحجز قبل موعد الشحن بوقت كافٍ. الأسعار المعروضة خاضعة للتوفر وتعديل أسعار الناقل دون إشعار مسبق.</p>'
                    .'<p>أيام السريان والغرامات وفقًا لإعلان الخط الملاحي والمحطة.</p>'
                    .'<p>هذا العرض لا يُعتبر تأكيدًا للحجز حتى يتم إصداره تأكيدًا خطيًا من الشركة.</p>',
                'quick_quotation_badge' => 'عرض سريع',
                'official_receipts_title' => 'الإيصالات الرسمية (معلوماتي — لا يُحتسب في الإجمالي)',
                'reefer_deferred_power' => 'Power',
            ]);
        }

        return array_merge($bilingual, [
            'doc_title' => 'Quotation',
            'exchange_rate' => 'Exchange Rate',
            'exchange_rate_ar' => 'سعر الصرف',
            'available_sailing' => 'Available Sailing',
            'section_shipping' => 'Shipping details',
            'section_shipping_en' => 'Shipping details',
            'section_shipping_ar' => 'تفاصيل الشحن',
            'quote_no' => 'Quote No.',
            'date' => 'Date',
            'client' => 'Client',
            'section_client_company' => '1. Client / Company',
            'company_label' => 'Our company',
            'route' => 'Route',
            'carrier' => 'Shipping line',
            'container' => 'Container',
            'qty' => 'Qty',
            'transit_time' => 'Transit Time',
            'free_time' => 'Free time',
            'schedule' => 'Schedule / sailing',
            'validity' => 'Offer validity',
            'section_route' => '2. Route & schedule details',
            'section_ocean_freight' => '3. Ocean freight',
            'section_inland_transport' => '4. Inland transport',
            'section_customs' => '5. Customs & other charges',
            'section_handling_fees' => 'Handling Fees',
            'section_totals' => '7. Totals',
            'section_notes' => '8. Notes',
            'section_terms' => '9. Terms & conditions',
            'section_prepared_by' => '10. Prepared by',
            'items' => 'Line items',
            'description' => 'Description',
            'amount' => 'Amount',
            'currency' => 'Currency',
            'subtotal' => 'Subtotal',
            'total' => 'Total',
            'grand_total' => 'Grand total',
            'notes' => 'Notes',
            'sales' => 'Sales',
            'phone' => 'Phone',
            'email' => 'Email',
            'address' => 'Address',
            'pol' => 'POL',
            'pod' => 'POD',
            'terms_html' => '<p>Rates are subject to carrier and terminal changes without prior notice. Space and equipment must be confirmed at time of booking.</p>'
                .'<p>Detention/demurrage per carrier and terminal announcements. This quotation does not constitute a firm booking until confirmed in writing.</p>'
                .'<p>Validity and surcharges apply as stated in this offer.</p>',
            'quick_quotation_badge' => 'Quick',
            'official_receipts_title' => 'Official receipts (informational — not included in totals)',
            'reefer_deferred_power' => 'Power',
        ]);
    }

    /**
     * Map API alias is_quick_quotation onto quick_mode (DB column).
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function mergeQuickQuotationFlag(array $validated): array
    {
        if (array_key_exists('is_quick_quotation', $validated)) {
            $validated['quick_mode'] = (bool) $validated['is_quick_quotation'];
        }
        unset($validated['is_quick_quotation']);

        return $validated;
    }

    /**
     * Legacy official-receipts “note only” rows were stored as OTHER line items with amount 0.
     * They must not appear in the customs charges table (shown as quotation note instead).
     */
    private function isLegacyOfficialReceiptsNoteLineItem(PricingQuoteItem $i): bool
    {
        if (strtoupper(trim((string) ($i->code ?? ''))) !== 'OTHER') {
            return false;
        }
        if (abs((float) $i->amount) > 0.00001) {
            return false;
        }
        $name = mb_strtolower(trim((string) ($i->name ?? '')));

        return str_contains($name, 'official receipt');
    }

    private function isHandlingFeeLineItem(PricingQuoteItem $i): bool
    {
        $c = strtoupper(trim((string) ($i->code ?? '')));
        if ($c === 'HANDLING') {
            return true;
        }
        if ($c !== 'OTHER') {
            return false;
        }
        $name = mb_strtolower(trim((string) ($i->name ?? '')));

        return str_contains($name, 'handling')
            || str_contains($name, 'مناولة');
    }

    /**
     * @return array{ocean: Collection<int, PricingQuoteItem>, inland: Collection<int, PricingQuoteItem>, customs: Collection<int, PricingQuoteItem>, handling: Collection<int, PricingQuoteItem>}
     */
    /**
     * Sailing schedule text for PDF — stored values only (ISO dates or weekday names).
     */
    protected function sailingScheduleDisplayForPdf(PricingQuote $quote): string
    {
        if ($quote->sailingDates->isNotEmpty()) {
            return $quote->sailingDates
                ->map(static fn ($row) => $row->sailing_date?->format('Y-m-d') ?? '')
                ->filter()
                ->implode(', ');
        }

        if ($quote->schedule_type === 'weekly' && is_array($quote->sailing_weekdays) && count($quote->sailing_weekdays)) {
            return implode(', ', $quote->sailing_weekdays);
        }

        return '—';
    }

    protected function quotePdfExchangeRateLabel(): string
    {
        $usd = Currency::query()->where('code', 'USD')->where('is_active', true)->first();
        $egp = Currency::query()->where('code', 'EGP')->where('is_active', true)->first();
        if ($usd && $egp && (float) ($egp->exchange_rate ?? 0) > 0) {
            return '1 USD = '.number_format((float) $egp->exchange_rate, 2).' EGP';
        }

        return '—';
    }

    protected function quotePdfContainerDisplay(PricingQuote $quote): string
    {
        if (filled($quote->container_type)) {
            $type = trim((string) $quote->container_type);
            $qty = $quote->qty;
            if ($qty !== null && $qty !== '') {
                return trim((string) $qty.' × '.$type);
            }

            return $type;
        }

        $spec = $quote->container_spec;
        if (! is_array($spec)) {
            return '—';
        }

        $size = (string) ($spec['size'] ?? '40');
        $height = ($spec['height'] ?? '') === 'hq' ? 'HQ ' : '';
        $type = ($spec['type'] ?? '') === 'reefer' ? 'Reefer' : 'Dry';
        $label = trim($size.$height.$type);
        $qty = $quote->qty;
        if ($qty !== null && $qty !== '' && $label !== '') {
            return trim((string) $qty.' × '.$label);
        }

        return $label !== '' ? $label : '—';
    }

    /**
     * @param  array<string, float>  $map
     */
    protected function formatCurrencyBreakdown(array $map): string
    {
        if ($map === []) {
            return '—';
        }
        ksort($map);
        $parts = [];
        foreach ($map as $cur => $amt) {
            $parts[] = number_format((float) $amt, 2).' '.strtoupper((string) $cur);
        }

        return implode(' · ', $parts);
    }

    /**
     * @param  Collection<int, PricingQuoteItem>|null  $itemsSubset  Client-visible items only; defaults to all quote items.
     * @return array{ocean: Collection<int, PricingQuoteItem>, inland: Collection<int, PricingQuoteItem>, customs: Collection<int, PricingQuoteItem>, handling: Collection<int, PricingQuoteItem>}
     */
    protected function partitionQuoteItemsForPdf(PricingQuote $quote, ?Collection $itemsSubset = null): array
    {
        /** @var Collection<int, PricingQuoteItem> $sorted */
        $sorted = ($itemsSubset ?? $quote->items)->sortBy('sort_order')->values();

        $inland = $sorted->filter(function (PricingQuoteItem $i): bool {
            return strtoupper(trim((string) ($i->code ?? ''))) === 'INLAND';
        })->values();

        $handling = $sorted->filter(fn (PricingQuoteItem $i): bool => $this->isHandlingFeeLineItem($i))->values();

        $customs = $sorted->filter(function (PricingQuoteItem $i): bool {
            if (strtoupper(trim((string) ($i->code ?? ''))) !== 'OTHER') {
                return false;
            }
            if ($this->isLegacyOfficialReceiptsNoteLineItem($i) || $this->isHandlingFeeLineItem($i)) {
                return false;
            }

            return true;
        })->values();

        /** Everything except inland, handling, and customs/other charges (OTHER), including ocean codes and legacy rows */
        $ocean = $sorted->filter(function (PricingQuoteItem $i) use ($quote): bool {
            $c = strtoupper(trim((string) ($i->code ?? '')));
            if ($c === 'INLAND' || $c === 'OTHER' || $c === 'HANDLING') {
                return false;
            }
            if ($this->quoteIsReeferContainer($quote) && $c === 'POWER') {
                return false;
            }

            return true;
        })->values();

        return [
            'ocean' => $ocean,
            'inland' => $inland,
            'customs' => $customs,
            'handling' => $handling,
        ];
    }

    /**
     * @param  Collection<int, PricingQuoteItem>|\Illuminate\Database\Eloquent\Collection<int, PricingQuoteItem>  $items
     * @return array<string, float>
     */
    protected function sumCollectionByCurrency(Collection $items): array
    {
        $totals = [];
        foreach ($items as $item) {
            $cur = (string) ($item->currency_code ?: 'USD');
            $totals[$cur] = ($totals[$cur] ?? 0.0) + (float) $item->amount;
        }
        ksort($totals);

        return $totals;
    }

    /**
     * @param  Collection<int, PricingQuoteItem>  $items
     * @return Collection<int, PricingQuoteItem>
     */
    protected function excludeDeferredReeferQuoteItems(PricingQuote $quote, Collection $items): Collection
    {
        if (! $this->quoteIsReeferContainer($quote)) {
            return $items;
        }

        return $items
            ->filter(function (PricingQuoteItem $i): bool {
                $c = strtoupper(trim((string) ($i->code ?? '')));

                return $c !== 'POWER';
            })
            ->values();
    }

    protected function quoteIsReeferContainer(PricingQuote $quote): bool
    {
        $spec = $quote->container_spec;
        if (is_array($spec) && ($spec['type'] ?? '') === 'reefer') {
            return true;
        }

        return str_contains(strtolower((string) ($quote->container_type ?? '')), 'reefer');
    }

    protected function quoteShowsDeferredReeferPower(PricingQuote $quote): bool
    {
        if (! $this->quoteIsReeferContainer($quote)) {
            return false;
        }

        $data = $quote->free_time_data;
        if (is_array($data) && ! empty($data['reefer']['deferred_power'])) {
            return true;
        }

        if ($quote->items->contains(
            fn (PricingQuoteItem $i): bool => strtoupper(trim((string) ($i->code ?? ''))) === 'POWER'
        )) {
            return true;
        }

        return $this->linkedOfferHasReeferPowerRate($quote);
    }

    /**
     * Daily power rate for deferred footnote (not multiplied by free days).
     *
     * @return array{amount: float, currency: string}|null
     */
    protected function reeferDeferredPowerPerDayForPdf(PricingQuote $quote): ?array
    {
        $data = $quote->free_time_data;
        if (is_array($data) && isset($data['reefer']['power_per_day']) && is_array($data['reefer']['power_per_day'])) {
            $ppd = $data['reefer']['power_per_day'];
            $amount = $ppd['amount'] ?? null;
            if ($amount !== null && is_numeric($amount)) {
                return [
                    'amount' => (float) $amount,
                    'currency' => strtoupper((string) ($ppd['currency'] ?? 'USD')),
                ];
            }
        }

        if (! $quote->pricing_offer_id) {
            return null;
        }

        $offer = $quote->relationLoaded('offer')
            ? $quote->offer
            : PricingOffer::query()->with('items')->find($quote->pricing_offer_id);

        if (! $offer) {
            return null;
        }

        foreach ($offer->items as $item) {
            $code = strtolower(trim((string) ($item->code ?? '')));
            if ($code !== 'powerday' && $code !== 'power_day') {
                continue;
            }
            if ($item->price !== null && (float) $item->price >= 0) {
                return [
                    'amount' => (float) $item->price,
                    'currency' => strtoupper((string) ($item->currency_code ?: 'USD')),
                ];
            }
        }

        return null;
    }

    protected function reeferFreePowerDaysForPdf(PricingQuote $quote): ?int
    {
        $data = $quote->free_time_data;
        if (is_array($data) && array_key_exists('free_power_days', $data['reefer'] ?? [])) {
            $raw = $data['reefer']['free_power_days'];
            if ($raw !== null && $raw !== '') {
                return max(0, (int) $raw);
            }
        }

        if (! $quote->pricing_offer_id) {
            return null;
        }

        $offer = $quote->relationLoaded('offer')
            ? $quote->offer
            : PricingOffer::query()->find($quote->pricing_offer_id);

        if (! $offer || ! is_string($offer->notes)) {
            return null;
        }

        if (preg_match('/__REEFER_POWER_FREE_DAYS__=(\d+)__/', $offer->notes, $m)) {
            return max(0, (int) $m[1]);
        }

        return null;
    }

    /** English-only label for PDF/UI — not translated in Arabic locale. */
    protected function reeferFreePowerDaysLabelForPdf(PricingQuote $quote): ?string
    {
        $days = $this->reeferFreePowerDaysForPdf($quote);
        if ($days === null) {
            return null;
        }

        return $days === 1 ? '1 Power Free Day' : "{$days} Power Free Days";
    }

    /**
     * Import OWS — informational footnote on PDF (same idea as deferred reefer power).
     */
    protected function quoteShowsDeferredOws(PricingQuote $quote): bool
    {
        if ($this->resolveQuotePricingType($quote) !== 'sea') {
            return false;
        }

        $ows = $this->owsDataForQuote($quote);

        return $ows !== null && ! empty($ows['enabled']);
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function owsDataForQuote(PricingQuote $quote): ?array
    {
        $data = $quote->free_time_data;
        if (is_array($data) && is_array($data['ows'] ?? null)) {
            $normalized = $this->normalizeOwsData($data['ows']);
            if ($normalized !== null) {
                return $normalized;
            }
        }

        if (! $quote->pricing_offer_id) {
            return null;
        }

        $offer = $quote->relationLoaded('offer')
            ? $quote->offer
            : PricingOffer::query()->find($quote->pricing_offer_id);

        if (! $offer || $offer->pricing_direction !== 'import') {
            return null;
        }

        return $this->normalizeOwsData($offer->ows_data);
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>|null
     */
    protected function normalizeOwsData(array $raw): ?array
    {
        if (empty($raw['enabled'])) {
            return null;
        }

        return $raw;
    }

    /**
     * English detail lines after "OWS:" — not included in section totals.
     *
     * @return list<string>
     */
    protected function owsDeferredFootnoteLinesForPdf(PricingQuote $quote): array
    {
        $ows = $this->owsDataForQuote($quote);
        if ($ows === null) {
            return [];
        }

        $lines = [];
        $mode = ($ows['mode'] ?? 'fixed') === 'range' ? 'range' : 'fixed';

        if ($mode === 'fixed' && is_array($ows['fixed'] ?? null)) {
            $detail = $this->formatOwsPdfDetailLine($ows['fixed'], true);
            if ($detail !== '') {
                $lines[] = $detail;
            }
        } else {
            foreach ($ows['ranges'] ?? [] as $range) {
                if (! is_array($range)) {
                    continue;
                }
                $detail = $this->formatOwsPdfDetailLine($range, false);
                if ($detail !== '') {
                    $lines[] = $detail;
                }
            }
        }

        return $lines;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function formatOwsPdfDetailLine(array $row, bool $isFixed): string
    {
        $from = $row['from'] ?? ($isFixed ? ($row['weight'] ?? null) : null);
        $to = $row['to'] ?? ($isFixed ? $from : null);
        $unit = strtoupper((string) ($row['unit'] ?? 'KG'));
        $price = $row['price'] ?? null;
        $currency = strtoupper((string) ($row['currency'] ?? 'USD'));

        $range = '';
        if ($from !== null && $to !== null && (float) $from !== (float) $to) {
            $range = rtrim(rtrim(number_format((float) $from, 0, '.', ''), '.'), '.')
                .'–'
                .rtrim(rtrim(number_format((float) $to, 0, '.', ''), '.'), '.')
                .' '.$unit;
        } elseif ($from !== null) {
            $range = rtrim(rtrim(number_format((float) $from, 0, '.', ''), '.'), '.').' '.$unit;
        }

        $money = '';
        if ($price !== null && is_numeric($price)) {
            $money = rtrim(rtrim(number_format((float) $price, 2, '.', ''), '0'), '.').' '.$currency;
        }

        if ($range !== '' && $money !== '') {
            return $range.' → '.$money;
        }
        if ($money !== '') {
            return $money;
        }
        if ($range !== '') {
            return 'for '.$range;
        }

        return '';
    }

    protected function linkedOfferHasReeferPowerRate(PricingQuote $quote): bool
    {
        if (! $quote->pricing_offer_id) {
            return false;
        }

        $offer = $quote->relationLoaded('offer')
            ? $quote->offer
            : PricingOffer::query()->with('items')->find($quote->pricing_offer_id);

        if (! $offer) {
            return false;
        }

        foreach ($offer->items as $item) {
            $code = strtolower(trim((string) ($item->code ?? '')));
            if ($code !== 'powerday' && $code !== 'power_day') {
                continue;
            }
            if ($item->price !== null && (float) $item->price >= 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, PricingQuoteItem>  $items
     * @return array<string, float>
     */
    protected function sumQuoteItemsByCurrency($items): array
    {
        /** @var Collection<int, PricingQuoteItem> $c */
        $c = $items instanceof Collection ? $items : collect($items->all());

        return $this->sumCollectionByCurrency($c);
    }

    protected function generateQuoteNo(): string
    {
        $max = 0;
        PricingQuote::query()
            ->where('quote_no', 'like', 'QT-%')
            ->lockForUpdate()
            ->pluck('quote_no')
            ->each(function (mixed $quoteNo) use (&$max): void {
                if (preg_match('/^QT-(\d+)$/i', (string) $quoteNo, $matches)) {
                    $max = max($max, (int) $matches[1]);
                }
            });

        return 'QT-'.str_pad((string) ($max + 1), 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array<int, array{code?: mixed, name: mixed, description?: mixed, amount: mixed, currency?: mixed}>  $items
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

            $costRaw = $item['cost_amount'] ?? null;
            $costAmount = null;
            if ($costRaw !== null && $costRaw !== '' && is_numeric($costRaw)) {
                $costAmount = (float) $costRaw;
            }

            PricingQuoteItem::create([
                'pricing_quote_id' => $quote->id,
                'code' => array_key_exists('code', $item) ? (string) ($item['code'] ?? '') : null,
                'name' => $name,
                'description' => array_key_exists('description', $item) ? (string) ($item['description'] ?? '') : null,
                'cost_amount' => $costAmount,
                'amount' => (float) $amount,
                'visible_to_client' => (bool) ($item['visible_to_client'] ?? true),
                'currency_code' => (string) ($item['currency'] ?? 'USD'),
                'sort_order' => $i++,
            ]);
        }
    }

    /**
     * @param  array<int, string>  $dates
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
            'cost_amount' => $i->cost_amount !== null ? (float) $i->cost_amount : null,
            'amount' => (float) $i->amount,
            'currency' => $i->currency_code,
            'visible_to_client' => (bool) ($i->visible_to_client ?? true),
        ]);

        return [
            'id' => $quote->id,
            'quote_no' => $quote->quote_no,
            'status' => $quote->status,
            'client' => $quote->client ? ['id' => $quote->client->id, 'name' => $quote->client->name] : null,
            'sales_user' => $quote->salesUser ? ['id' => $quote->salesUser->id, 'name' => $quote->salesUser->name] : null,
            'pricing_offer_id' => $quote->pricing_offer_id,
            'offer' => $quote->relationLoaded('offer') && $quote->offer
                ? [
                    'id' => $quote->offer->id,
                    'pricing_type' => $quote->offer->pricing_type,
                    'pricing_direction' => $quote->offer->pricing_direction ?? 'export',
                    'ows_data' => $quote->offer->ows_data,
                ]
                : null,
            'pricing_type' => $this->resolveQuotePricingType($quote),
            'pricing_direction' => $this->resolveQuoteSeaDirection($quote),
            'inland_port' => $quote->inland_port,
            'inland_address' => $quote->inland_address,
            'origin_rate_snapshot_id' => $quote->origin_rate_snapshot_id,
            'origin_rate_snapshot' => $quote->originRateSnapshot?->snapshot_data,
            'quick_mode' => (bool) $quote->quick_mode,
            'is_quick_quotation' => (bool) $quote->quick_mode,
            'quick_mode_reason' => $quote->quick_mode_reason,
            'pol' => $quote->pol,
            'pod' => $quote->pod,
            'shipping_line' => $quote->shipping_line,
            'show_carrier_on_pdf' => (bool) ($quote->show_carrier_on_pdf ?? true),
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
            'municipality' => $quote->municipality,
            'official_receipts_note' => $quote->official_receipts_note,
            'pricing_team_confirmed' => (bool) ($quote->pricing_team_confirmed ?? false),
            'sailing_dates' => $quote->sailingDates->pluck('sailing_date')->map(
                static fn ($d) => $d?->toDateString()
            )->filter()->values(),
            'items' => $items,
            'totals_by_currency' => $this->sumQuoteItemsByCurrency($quote->items),
            'created_at' => $quote->created_at?->toISOString(),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    protected function assertOfferQuotable(PricingOffer $offer): void
    {
        if (! $offer->isQuotable()) {
            abort(422, 'This price sheet is not available for quotations. Publish it or choose an active, non-expired rate.');
        }
    }

    protected function resolveQuotePricingTypeFromPayload(array $validated, bool $quickMode): string
    {
        $explicit = strtolower((string) ($validated['pricing_type'] ?? ''));
        if (in_array($explicit, ['sea', 'inland'], true)) {
            return $explicit;
        }

        if (! $quickMode && ! empty($validated['pricing_offer_id'])) {
            $offer = PricingOffer::query()->find((int) $validated['pricing_offer_id']);
            if ($offer && $offer->pricing_type === 'inland') {
                return 'inland';
            }
        }

        $items = $validated['items'] ?? [];
        $hasInland = false;
        $hasOcean = false;
        foreach ($items as $item) {
            $code = strtoupper((string) ($item['code'] ?? ''));
            if ($code === 'INLAND') {
                $hasInland = true;
            } elseif ($code !== '' && $code !== 'HANDLING') {
                $hasOcean = true;
            }
        }
        if ($hasInland && ! $hasOcean) {
            return 'inland';
        }

        return 'sea';
    }

    /**
     * Sea quotations only: export vs import (from linked rate sheet or line items).
     */
    protected function resolveQuoteSeaDirection(PricingQuote $quote): ?string
    {
        if ($this->resolveQuotePricingType($quote) !== 'sea') {
            return null;
        }

        $quote->loadMissing('items', 'offer');

        if ($quote->offer) {
            return $quote->offer->pricing_direction ?? 'export';
        }

        $hasDthc = $quote->items->contains(
            fn (PricingQuoteItem $i): bool => strtoupper((string) $i->code) === 'DTHC'
        );
        if ($hasDthc) {
            return 'import';
        }

        $freeTime = $quote->free_time_data;
        if (is_array($freeTime) && ! empty($freeTime['ows']['enabled'])) {
            return 'import';
        }

        return 'export';
    }

    protected function resolveQuotePricingType(PricingQuote $quote): string
    {
        $stored = strtolower((string) ($quote->pricing_type ?? ''));
        if (in_array($stored, ['sea', 'inland'], true)) {
            return $stored;
        }

        $quote->loadMissing('items', 'offer');
        $hasInland = $quote->items->contains(fn (PricingQuoteItem $i): bool => strtoupper((string) $i->code) === 'INLAND');
        $hasOcean = $quote->items->contains(function (PricingQuoteItem $i) use ($quote): bool {
            $code = strtoupper((string) $i->code);
            if ($code === '' || $code === 'INLAND' || $code === 'HANDLING') {
                return false;
            }
            if ($code === 'OTHER' && $quote->official_receipts_note) {
                return false;
            }

            return true;
        });

        if ($hasInland && ! $hasOcean) {
            return 'inland';
        }
        if ($quote->offer && $quote->offer->pricing_type === 'inland') {
            return 'inland';
        }

        return 'sea';
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    protected function applyQuoteRouteFields(PricingQuote $quote, array $validated, string $pricingType): void
    {
        if ($pricingType === 'inland') {
            $quote->pol = null;
            $quote->pod = null;
            $quote->transit_time = null;
            $quote->free_time = null;
            $quote->free_time_data = null;
            $quote->schedule_type = null;
            $quote->sailing_weekdays = null;
            $quote->show_carrier_on_pdf = false;
            $quote->inland_port = isset($validated['inland_port'])
                ? (trim((string) $validated['inland_port']) !== '' ? trim((string) $validated['inland_port']) : null)
                : null;
            $quote->inland_address = isset($validated['inland_address'])
                ? (trim((string) $validated['inland_address']) !== '' ? trim((string) $validated['inland_address']) : null)
                : null;

            return;
        }

        $quote->inland_port = null;
        $quote->inland_address = null;
        $quote->pol = $validated['pol'] ?? null;
        $quote->pod = $validated['pod'] ?? null;
        $quote->transit_time = $validated['transit_time'] ?? null;
    }
}
