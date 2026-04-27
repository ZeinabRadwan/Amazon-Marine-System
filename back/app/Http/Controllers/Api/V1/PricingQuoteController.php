<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
use Mpdf\Mpdf;

class PricingQuoteController extends Controller
{
    /**
     * Canonical pricing item codes across rate/quotation modules.
     *
     * @var array<int, string>
     */
    private const PRICING_ITEM_CODES = ['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER', 'INLAND', 'HANDLING', 'OTHER'];

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
                'pol' => $quote->pol,
                'pod' => $quote->pod,
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

        $validated = $request->validate([
            'quote_no' => ['nullable', 'string', 'max:40'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'sales_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'pricing_offer_id' => ['nullable', 'integer', 'exists:pricing_offers,id'],
            'origin_rate_snapshot_id' => ['nullable', 'integer', 'exists:pricing_offer_snapshots,id'],
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
            'schedule_type' => ['nullable', 'string', 'in:fixed,weekly'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'official_receipts_note' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:pending,accepted,rejected'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'sailing_weekdays' => ['sometimes', 'array'],
            'sailing_weekdays.*' => ['string', 'in:Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.code' => ['required', 'string', 'in:OF,THC,BL,TELEX,ISPS,PTI,POWER,INLAND,HANDLING,OTHER'],
            'items.*.name' => ['required', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $validated = $this->mergeQuickQuotationFlag($validated);

        $quote = DB::transaction(function () use ($validated) {
            $quickMode = (bool) ($validated['quick_mode'] ?? false);
            if (! $quickMode && empty($validated['pricing_offer_id'])) {
                abort(422, 'pricing_offer_id is required for standard flow.');
            }

            $quickModeReason = isset($validated['quick_mode_reason']) ? trim((string) $validated['quick_mode_reason']) : '';
            if ($quickMode && $quickModeReason === '') {
                $quickModeReason = 'Quick Quotation';
            }
            if (! $quickMode) {
                $quickModeReason = $validated['quick_mode_reason'] ?? null;
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

            $quote = new PricingQuote;
            $quote->quote_no = $validated['quote_no'] ?? $this->generateQuoteNo();
            $quote->client_id = $validated['client_id'] ?? null;
            $quote->sales_user_id = $validated['sales_user_id'] ?? null;
            $quote->pricing_offer_id = $validated['pricing_offer_id'] ?? null;
            $quote->origin_rate_snapshot_id = $originSnapshotId;
            $quote->quick_mode = $quickMode;
            $quote->quick_mode_reason = $quickModeReason;
            $quote->pol = $validated['pol'] ?? null;
            $quote->pod = $validated['pod'] ?? null;
            $quote->shipping_line = $validated['shipping_line'] ?? null;
            $quote->show_carrier_on_pdf = (bool) ($validated['show_carrier_on_pdf'] ?? true);
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
            $quote->official_receipts_note = isset($validated['official_receipts_note'])
                ? (trim((string) $validated['official_receipts_note']) !== '' ? trim((string) $validated['official_receipts_note']) : null)
                : null;
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
            'schedule_type' => ['sometimes', 'nullable', 'string', 'in:fixed,weekly'],
            'valid_from' => ['sometimes', 'nullable', 'date'],
            'valid_to' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'official_receipts_note' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:pending,accepted,rejected'],
            'sailing_dates' => ['sometimes', 'array'],
            'sailing_dates.*' => ['date'],
            'sailing_weekdays' => ['sometimes', 'array'],
            'sailing_weekdays.*' => ['string', 'in:Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.code' => ['required_with:items', 'string', 'in:OF,THC,BL,TELEX,ISPS,PTI,POWER,INLAND,HANDLING,OTHER'],
            'items.*.name' => ['required_with:items', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.currency' => ['nullable', 'string', 'max:10'],
        ]);

        $validated = $this->mergeQuickQuotationFlag($validated);

        if (array_key_exists('official_receipts_note', $validated)) {
            $trimmed = trim((string) ($validated['official_receipts_note'] ?? ''));
            $validated['official_receipts_note'] = $trimmed !== '' ? $trimmed : null;
        }

        if (
            (array_key_exists('quick_mode', $validated) && ! ((bool) $validated['quick_mode']))
            && array_key_exists('pricing_offer_id', $validated)
            && empty($validated['pricing_offer_id'])
        ) {
            abort(422, 'pricing_offer_id is required for standard flow.');
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
            if ($quote->quick_mode && ($quote->quick_mode_reason === null || trim((string) $quote->quick_mode_reason) === '')) {
                $quote->quick_mode_reason = 'Quick Quotation';
            }
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

    public function pdf(Request $request, PricingQuote $quote)
    {
        $this->authorize('view', $quote);

        $quote->load(['items', 'sailingDates', 'client', 'salesUser']);

        $locale = strtolower((string) $request->header('X-App-Locale', 'en')) === 'ar' ? 'ar' : 'en';
        $labels = $this->quotePdfLabels($locale);

        $settings = app(AppSettings::class);
        $companyProfile = $settings->getArray(AppSettings::KEY_COMPANY_PROFILE) ?? [];
        $companyDisplayName = $locale === 'ar'
            ? (string) (($companyProfile['name_ar'] ?? '') !== '' ? $companyProfile['name_ar'] : ($companyProfile['name_en'] ?? ''))
            : (string) (($companyProfile['name_en'] ?? '') !== '' ? $companyProfile['name_en'] : ($companyProfile['name_ar'] ?? ''));

        $partition = $this->partitionQuoteItemsForPdf($quote);
        $grandTotalsByCurrency = $this->sumQuoteItemsByCurrency($quote->items);

        $filename = ($quote->quote_no ?: 'Quote-'.$quote->id).'.pdf';

        $html = view('pricing.quote_pdf', [
            'quote' => $quote,
            'lang' => $locale,
            'labels' => $labels,
            'showCarrier' => (bool) ($quote->show_carrier_on_pdf ?? true),
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
     * @return array<string, string>
     */
    private function quotePdfLabels(string $locale): array
    {
        if ($locale === 'ar') {
            return [
                'doc_title' => 'عرض سعر',
                'quote_no' => 'رقم العرض',
                'date' => 'التاريخ',
                'issued_date' => 'تاريخ الإصدار',
                'client' => 'العميل',
                'section_client_company' => 'العميل / الشركة',
                'company_label' => 'شركتنا',
                'route' => 'المسار',
                'carrier' => 'خط الشحن',
                'container' => 'الحاوية',
                'qty' => 'الكمية',
                'transit_time' => 'مدة العبور',
                'free_time' => 'وقت الفراغ',
                'schedule' => 'الجدول',
                'validity' => 'صلاحية العرض',
                'section_route' => 'تفاصيل المسار',
                'section_ocean_freight' => 'الشحن البحري',
                'section_inland_transport' => 'النقل الداخلي',
                'section_customs' => 'الجمارك والرسوم الأخرى',
                'section_handling_fees' => 'رسوم المناولة',
                'section_totals' => 'الإجماليات',
                'section_notes' => 'ملاحظات',
                'section_terms' => 'الشروط والأحكام',
                'section_prepared_by' => 'أعد بواسطة',
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
                'quick_quotation_badge' => 'عرض سعر سريع',
                'official_receipts_title' => 'الإيصالات الرسمية (معلوماتي — لا يُحتسب في الإجمالي)',
            ];
        }

        return [
            'doc_title' => 'Quotation',
            'quote_no' => 'Quote No.',
            'date' => 'Date',
            'issued_date' => 'Issued date',
            'client' => 'Client',
            'section_client_company' => 'Client / Company',
            'company_label' => 'Our company',
            'route' => 'Route',
            'carrier' => 'Shipping line',
            'container' => 'Container',
            'qty' => 'Qty',
            'transit_time' => 'Transit time',
            'free_time' => 'Free time',
            'schedule' => 'Schedule / sailing',
            'validity' => 'Offer validity',
            'section_route' => 'Route details',
            'section_ocean_freight' => 'Ocean Freight',
            'section_inland_transport' => 'Inland Transport',
            'section_customs' => 'Customs & other charges',
            'section_handling_fees' => 'Handling fees',
            'section_totals' => 'Totals',
            'section_notes' => 'Notes',
            'section_terms' => 'Terms & Conditions',
            'section_prepared_by' => 'Prepared by',
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
            'quick_quotation_badge' => 'Quick quotation',
            'official_receipts_title' => 'Official receipts (informational — not included in totals)',
        ];
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
    protected function partitionQuoteItemsForPdf(PricingQuote $quote): array
    {
        /** @var Collection<int, PricingQuoteItem> $sorted */
        $sorted = $quote->items->sortBy('sort_order')->values();

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
        $ocean = $sorted->filter(function (PricingQuoteItem $i): bool {
            $c = strtoupper(trim((string) ($i->code ?? '')));

            return $c !== 'INLAND' && $c !== 'OTHER' && $c !== 'HANDLING';
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
        $year = now()->format('Y');
        $rand = Str::upper(Str::random(6));

        return 'Q-'.$year.'-'.$rand;
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
            'official_receipts_note' => $quote->official_receipts_note,
            'sailing_dates' => $quote->sailingDates->pluck('sailing_date')->map(
                static fn ($d) => $d?->toDateString()
            )->filter()->values(),
            'items' => $items,
            'totals_by_currency' => $this->sumQuoteItemsByCurrency($quote->items),
            'created_at' => $quote->created_at?->toISOString(),
        ];
    }
}
