<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\CustomerTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\ShipmentCostInvoice;
use App\Models\BankAccount;
use App\Models\PdfLayout;
use App\Notifications\ShipmentFinancialsCompleted;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Mpdf\Mpdf;

class InvoiceController extends Controller
{
    private const FIXED_SECTIONS = ['shipping', 'inland', 'customs', 'insurance'];
    private const EXTRA_SECTIONS = ['handling', 'other'];
    private const TYPE_ID_TO_CODE = [
        0 => 'client',
        1 => 'vendor',
    ];
    private static ?bool $invoiceItemsHasTitleColumn = null;

    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.view') || $user->can('accounting.view')),
            403
        );

        $query = Invoice::query()->with(['client', 'shipment']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($invoiceType = $request->query('invoice_type')) {
            $query->where('invoice_type', $invoiceType === 'partner' ? 'vendor' : $invoiceType);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }

        if ($currencyId = $request->query('currency_id')) {
            $query->where('currency_id', (int) $currencyId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('invoice_number', 'like', '%'.$search.'%')
                    ->orWhereHas('client', function ($q2) use ($search): void {
                        $q2->where('name', 'like', '%'.$search.'%');
                    });
            });
        }

        $issueFrom = $request->query('issue_date_from');
        $issueTo = $request->query('issue_date_to');
        if ($issueFrom || $issueTo) {
            if ($issueFrom) {
                $query->whereDate('issue_date', '>=', $issueFrom);
            }
            if ($issueTo) {
                $query->whereDate('issue_date', '<=', $issueTo);
            }
        } elseif ($month = $request->query('month')) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $query->whereYear('issue_date', (int) $parts[0])
                    ->whereMonth('issue_date', (int) $parts[1]);
            }
        }

        $sort = $request->query('sort', 'date');
        if ($sort === 'number') {
            $query->orderBy('invoice_number');
        } elseif ($sort === 'amount') {
            $query->orderByDesc('net_amount');
        } else {
            $query->orderByDesc('issue_date');
        }

        $perPage = $request->integer('per_page', 10);
        $paginator = $query->paginate($perPage);

        $rows = $paginator->getCollection()->map(static function (Invoice $invoice): array {
            $partyName = $invoice->client?->name ?? '';

            return [
                'id' => $invoice->id,
                'invoice_type' => $invoice->invoice_type,
                'invoice_type_id' => self::mapInvoiceTypeIdFromCode($invoice->invoice_type),
                'invoice_number' => $invoice->invoice_number,
                'party_name' => $partyName,
                'shipment_bl' => $invoice->shipment?->bl_number,
                'amount' => (float) $invoice->net_amount,
                'currency_code' => $invoice->currency_code,
                'status' => $invoice->status,
                'is_vat_invoice' => (bool) $invoice->is_vat_invoice,
                'issue_date' => $invoice->issue_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
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

    private static function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.date('Y');

        $maxSeq = Invoice::query()
            ->where('invoice_number', 'like', $prefix.'-%')
            ->pluck('invoice_number')
            ->map(function (string $number): int {
                if (preg_match('/-(\d+)$/', $number, $m)) {
                    return (int) $m[1];
                }

                return 0;
            })
            ->max() ?? 0;

        $next = $maxSeq + 1;

        return sprintf('%s-%04d', $prefix, $next);
    }

    private static function mapCurrencyCodeFromId(?int $currencyId): string
    {
        if (! $currencyId) {
            return 'USD';
        }

        return Currency::find($currencyId)?->code ?? 'USD';
    }

    private static function mapInvoiceTypeFromId(int $typeId): string
    {
        return self::TYPE_ID_TO_CODE[$typeId] ?? 'client';
    }

    private static function mapInvoiceTypeIdFromCode(string $code): int
    {
        $id = array_search($code, self::TYPE_ID_TO_CODE, true);

        return $id === false ? 0 : $id;
    }

    private static function roundMoney(float $value): float
    {
        return round($value, 2);
    }

    private static function invoiceItemsHasTitleColumn(): bool
    {
        if (self::$invoiceItemsHasTitleColumn === null) {
            self::$invoiceItemsHasTitleColumn = Schema::hasColumn('invoice_items', 'title');
        }

        return self::$invoiceItemsHasTitleColumn;
    }

    private static function normalizeSectionKey(?string $sectionKey): string
    {
        $key = strtolower(trim((string) ($sectionKey ?? '')));
        if ($key === '' || $key === 'additional') {
            return 'other';
        }

        return $key;
    }

    /**
     * @param array<string,float> $into
     * @return array<string,float>
     */
    private static function addMoneyMap(array $into, string $currencyCode, float $amount): array
    {
        $code = strtoupper((string) $currencyCode ?: 'USD');
        $into[$code] = self::roundMoney((float) ($into[$code] ?? 0) + $amount);

        return $into;
    }

    /**
     * @param array<string,float> $sell
     * @param array<string,float> $cost
     * @return array<string,float>
     */
    private static function diffMoneyMap(array $sell, array $cost): array
    {
        $out = [];
        foreach (array_unique(array_merge(array_keys($sell), array_keys($cost))) as $cur) {
            $out[$cur] = self::roundMoney((float) ($sell[$cur] ?? 0) - (float) ($cost[$cur] ?? 0));
        }

        return $out;
    }

    /**
     * @return array<string,array<int,array<string,mixed>>>
     */
    private function sectionAttachmentsForInvoice(Invoice $invoice): array
    {
        if (! $invoice->shipment_id) {
            return [];
        }
        $costInvoice = ShipmentCostInvoice::query()
            ->where('shipment_id', $invoice->shipment_id)
            ->first();
        $refs = is_array($costInvoice?->attachment_refs) ? $costInvoice->attachment_refs : [];
        $out = [];
        foreach ($refs as $sectionKey => $rows) {
            if (! is_array($rows)) {
                continue;
            }
            $normalizedKey = self::normalizeSectionKey((string) $sectionKey);
            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $id = isset($row['id']) ? (int) $row['id'] : null;
                $name = isset($row['name']) ? (string) $row['name'] : null;
                $kind = strtoupper((string) ($row['type'] ?? ''));
                $isPdf = str_contains($kind, 'PDF') || ($name && str_ends_with(strtolower($name), '.pdf'));
                $out[$normalizedKey][] = [
                    'id' => $id,
                    'name' => $name,
                    'type' => $isPdf ? 'PDF' : ($kind ?: null),
                    'uploaded_at' => $row['uploaded_at'] ?? null,
                    'url' => $id ? url('/api/v1/shipments/'.$invoice->shipment_id.'/attachments/'.$id.'/download') : null,
                ];
            }
        }

        return $out;
    }

    /**
     * @param array<int,InvoiceItem> $items
     * @return array<string,array{items: array<int,array<string,mixed>>, totals: array<string,float>}>
     */
    private function sectionedInvoiceItems(iterable $items): array
    {
        $sections = [];
        foreach ($items as $item) {
            $section = (string) ($item->section_key ?: 'other');
            $currency = strtoupper((string) ($item->currency_code ?: 'USD'));
            $lineTotal = self::roundMoney((float) $item->line_total);
            $costLineTotal = self::roundMoney((float) ($item->cost_line_total ?? 0));
            if (! isset($sections[$section])) {
                $sections[$section] = ['items' => [], 'totals' => []];
            }
            $sections[$section]['items'][] = [
                'id' => $item->id,
                'description' => $item->description,
                'title' => $item->title,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => $lineTotal,
                'cost_unit_price' => (float) ($item->cost_unit_price ?? 0),
                'cost_line_total' => $costLineTotal,
                'currency_code' => $currency,
                'section_key' => $section,
                'order_index' => (int) ($item->order_index ?? 0),
                'source_key' => $item->source_key,
            ];
            $sections[$section]['totals'][$currency] = self::roundMoney((float) ($sections[$section]['totals'][$currency] ?? 0) + $lineTotal);
        }

        return $sections;
    }

    /**
     * @return array<string,float>
     */
    private function profitByCurrency(Invoice $invoice): array
    {
        $sell = [];
        $cost = [];
        foreach ($invoice->items as $item) {
            $cur = strtoupper((string) ($item->currency_code ?: 'USD'));
            $sell[$cur] = self::roundMoney((float) ($sell[$cur] ?? 0) + (float) $item->line_total);
            $cost[$cur] = self::roundMoney((float) ($cost[$cur] ?? 0) + (float) ($item->cost_line_total ?? 0));
        }

        // fallback when cost_line_total was not sent by frontend
        if (array_sum($cost) == 0.0 && $invoice->shipment_id) {
            $costInv = ShipmentCostInvoice::query()->where('shipment_id', $invoice->shipment_id)->first();
            $costItems = is_array($costInv?->items) ? $costInv->items : [];
            foreach ($costItems as $ci) {
                $cur = strtoupper((string) ($ci['currency_code'] ?? 'USD'));
                $amt = self::roundMoney((float) ($ci['amount'] ?? 0));
                $cost[$cur] = self::roundMoney((float) ($cost[$cur] ?? 0) + $amt);
            }
        }

        $profit = [];
        foreach (array_unique(array_merge(array_keys($sell), array_keys($cost))) as $cur) {
            $profit[$cur] = self::roundMoney((float) ($sell[$cur] ?? 0) - (float) ($cost[$cur] ?? 0));
        }

        return $profit;
    }

    private function invoicePayload(Invoice $invoice): array
    {
        $invoice->loadMissing(['client', 'shipment', 'items', 'payments']);
        $attachmentsBySection = $this->sectionAttachmentsForInvoice($invoice);
        $sectionKeys = array_values(array_unique(array_merge(
            self::FIXED_SECTIONS,
            self::EXTRA_SECTIONS,
            array_map(
                static fn (InvoiceItem $item): string => self::normalizeSectionKey($item->section_key),
                $invoice->items->all()
            ),
            array_keys($attachmentsBySection)
        )));

        $sectionMap = [];
        foreach ($sectionKeys as $key) {
            $sectionMap[$key] = [
                'key' => $key,
                'items' => [],
                'selling_by_currency' => [],
                'cost_by_currency' => [],
            ];
        }

        foreach ($invoice->items as $item) {
            $sectionKey = self::normalizeSectionKey($item->section_key);
            $currency = strtoupper((string) ($item->currency_code ?: 'USD'));
            $lineTotal = self::roundMoney((float) $item->line_total);
            $costLineTotal = self::roundMoney((float) ($item->cost_line_total ?? 0));

            if (! isset($sectionMap[$sectionKey])) {
                $sectionMap[$sectionKey] = [
                    'key' => $sectionKey,
                    'items' => [],
                    'selling_by_currency' => [],
                    'cost_by_currency' => [],
                ];
            }
            $sectionMap[$sectionKey]['items'][] = [
                'id' => $item->id,
                'description' => $item->description,
                'title' => $item->title,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => $lineTotal,
                'cost_unit_price' => (float) ($item->cost_unit_price ?? 0),
                'cost_line_total' => $costLineTotal,
                'currency_code' => $currency,
                'section_key' => $sectionKey,
                'order_index' => (int) ($item->order_index ?? 0),
                'source_key' => $item->source_key,
            ];
            $sectionMap[$sectionKey]['selling_by_currency'] = self::addMoneyMap(
                $sectionMap[$sectionKey]['selling_by_currency'],
                $currency,
                $lineTotal
            );
            $sectionMap[$sectionKey]['cost_by_currency'] = self::addMoneyMap(
                $sectionMap[$sectionKey]['cost_by_currency'],
                $currency,
                $costLineTotal
            );
        }

        $sections = [];
        $overallSelling = [];
        $overallCost = [];
        foreach ($sectionKeys as $key) {
            $section = $sectionMap[$key] ?? [
                'key' => $key,
                'items' => [],
                'selling_by_currency' => [],
                'cost_by_currency' => [],
            ];
            usort($section['items'], static function (array $a, array $b): int {
                return ((int) ($a['order_index'] ?? 0) <=> (int) ($b['order_index'] ?? 0))
                    ?: ((int) ($a['id'] ?? 0) <=> (int) ($b['id'] ?? 0));
            });
            $profit = self::diffMoneyMap($section['selling_by_currency'], $section['cost_by_currency']);
            foreach ($section['selling_by_currency'] as $cur => $amount) {
                $overallSelling = self::addMoneyMap($overallSelling, $cur, (float) $amount);
            }
            foreach ($section['cost_by_currency'] as $cur => $amount) {
                $overallCost = self::addMoneyMap($overallCost, $cur, (float) $amount);
            }

            $sections[] = [
                'key' => $key,
                'items' => $section['items'],
                'selling_by_currency' => $section['selling_by_currency'],
                'final_selling_price_by_currency' => $section['selling_by_currency'],
                'cost_by_currency' => $section['cost_by_currency'],
                'markup_by_currency' => $profit,
                'profit_by_currency' => $profit,
                'attachments' => $attachmentsBySection[$key] ?? [],
            ];
        }
        $overallProfit = self::diffMoneyMap($overallSelling, $overallCost);

        return [
            ...$invoice->toArray(),
            'sections' => $sections,
            'fixed_sections' => self::FIXED_SECTIONS,
            'totals_by_currency' => collect($invoice->items)
                ->groupBy(fn (InvoiceItem $i) => strtoupper((string) ($i->currency_code ?: 'USD')))
                ->map(fn ($g) => self::roundMoney((float) $g->sum('line_total')))
                ->toArray(),
            'cost_totals_by_currency' => collect($invoice->items)
                ->groupBy(fn (InvoiceItem $i) => strtoupper((string) ($i->currency_code ?: 'USD')))
                ->map(fn ($g) => self::roundMoney((float) $g->sum('cost_line_total')))
                ->toArray(),
            'profit_by_currency' => $this->profitByCurrency($invoice),
            'financial_overview' => [
                'selling_by_currency' => $overallSelling,
                'cost_by_currency' => $overallCost,
                'markup_by_currency' => $overallProfit,
                'profit_by_currency' => $overallProfit,
                'final_selling_price_by_currency' => $overallSelling,
            ],
        ];
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.view') || $user->can('accounting.view')),
            403
        );

        $months = max(1, (int) $request->query('months', 6));
        $from = now()->subMonths($months - 1)->startOfMonth();
        $today = now()->toDateString();

        $invoices = Invoice::query()
            ->whereDate('issue_date', '>=', $from)
            ->get();

        $totalCount = $invoices->count();
        $paidAmount = (float) $invoices->where('status', 'paid')->sum('net_amount');
        $partialAmount = (float) $invoices->where('status', 'partial')->sum('net_amount');
        $unpaidAmount = (float) $invoices->whereIn('status', ['unpaid', 'issued', 'draft'])->sum('net_amount');

        $overdueAmount = (float) $invoices->filter(function (Invoice $invoice) use ($today) {
            return in_array($invoice->status, ['unpaid', 'issued'], true)
                && $invoice->due_date
                && $invoice->due_date->toDateString() < $today;
        })->sum('net_amount');

        $labels = [];
        $paidSeries = [];
        $cursor = $from->copy();

        while ($cursor <= now()) {
            $key = $cursor->format('Y-m');
            $labels[] = $key;
            $monthInvoices = $invoices->filter(fn ($i) => $i->issue_date?->format('Y-m') === $key);
            $paidSeries[] = (float) $monthInvoices->where('status', 'paid')->sum('net_amount');
            $cursor->addMonth();
        }

        $statusGroups = [
            'paid' => ['paid'],
            'partial' => ['partial'],
            'unpaid' => ['unpaid', 'issued', 'draft'],
            'overdue' => ['unpaid', 'issued'],
        ];

        $statusLabels = [];
        $statusValues = [];

        foreach ($statusGroups as $label => $statuses) {
            if ($label === 'overdue') {
                $value = $overdueAmount;
            } else {
                $value = (float) $invoices->whereIn('status', $statuses)->sum('net_amount');
            }

            $statusLabels[] = $label;
            $statusValues[] = $value;
        }

        return response()->json([
            'data' => [
                'cards' => [
                    'total_count' => $totalCount,
                    'paid_amount' => $paidAmount,
                    'partial_amount' => $partialAmount,
                    'unpaid_amount' => $unpaidAmount,
                    'overdue_amount' => $overdueAmount,
                ],
                'monthly' => [
                    'labels' => $labels,
                    'paid' => $paidSeries,
                ],
                'by_status' => [
                    'labels' => $statusLabels,
                    'values' => $statusValues,
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.manage') || $user->can('accounting.manage')),
            403
        );

        $validated = $request->validate([
            'invoice_type_id' => ['required', 'integer', 'in:0,1'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency_id' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
            'is_vat_invoice' => ['sometimes', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.currency_code' => ['required', 'string', 'size:3'],
            'items.*.section_key' => ['nullable', 'string', 'max:60'],
            'items.*.order_index' => ['nullable', 'integer', 'min:0'],
            'items.*.source_key' => ['nullable', 'string', 'max:150'],
            'items.*.cost_unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.cost_line_total' => ['nullable', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($validated, $user) {
            $invoice = new Invoice;
            $invoice->invoice_number = self::generateInvoiceNumber();
            $invoice->invoice_type = self::mapInvoiceTypeFromId($validated['invoice_type_id']);
            $invoice->shipment_id = $validated['shipment_id'] ?? null;
            $invoice->client_id = $validated['client_id'];
            $invoice->issue_date = $validated['issue_date'];
            $invoice->due_date = $validated['due_date'] ?? null;
            $invoice->status = 'draft';
            $invoice->currency_id = $validated['currency_id'];
            $invoice->currency_code = self::mapCurrencyCodeFromId($validated['currency_id']);
            $invoice->notes = $validated['notes'] ?? null;
            $invoice->total_amount = 0;
            $invoice->tax_amount = 0;
            $invoice->is_vat_invoice = (bool) ($validated['is_vat_invoice'] ?? false);
            $invoice->net_amount = 0;
            $invoice->save();

            foreach ($validated['items'] as $itemData) {
                $qty = (float) $itemData['quantity'];
                $unitPrice = (float) $itemData['unit_price'];
                $lineTotal = self::roundMoney($qty * $unitPrice);
                $costUnitPrice = (float) ($itemData['cost_unit_price'] ?? 0);
                $costLineTotal = array_key_exists('cost_line_total', $itemData)
                    ? self::roundMoney((float) $itemData['cost_line_total'])
                    : self::roundMoney($qty * $costUnitPrice);

                $invoiceItemPayload = [
                    'invoice_id' => $invoice->id,
                    'item_id' => $itemData['item_id'] ?? null,
                    'description' => $itemData['description'],
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'currency_code' => strtoupper((string) $itemData['currency_code']),
                    'section_key' => $itemData['section_key'] ?? null,
                    'order_index' => (int) ($itemData['order_index'] ?? 0),
                    'source_key' => $itemData['source_key'] ?? null,
                    'cost_unit_price' => $costUnitPrice,
                    'cost_line_total' => $costLineTotal,
                ];
                if (self::invoiceItemsHasTitleColumn()) {
                    $invoiceItemPayload['title'] = $itemData['title'] ?? null;
                }

                InvoiceItem::create($invoiceItemPayload);
            }

            $invoice->refresh();
            FinancialService::syncInvoiceTotals($invoice);

            // Record a Debit in Customer Transactions
            CustomerTransaction::create([
                'customer_id' => $invoice->client_id,
                'invoice_id' => $invoice->id,
                'type' => 'debit',
                'amount' => $invoice->net_amount,
                'currency_id' => $invoice->currency_id,
                'description' => __('Invoice :number generated', ['number' => $invoice->invoice_number]),
            ]);

            ActivityLogger::log('invoice.created', $invoice, [
                'client_id' => $invoice->client_id,
                'shipment_id' => $invoice->shipment_id,
            ]);

            // Notify Sales if Finalized by Accountant (Fix 6B)
            if ($user->hasRole('accounting') && $invoice->shipment_id) {
                $salesRep = $invoice->shipment?->salesRep ?? ($invoice->client?->assignedSalesRep ?? null);
                if ($salesRep) {
                    $this->notificationService->sendDatabaseNotification(
                        'invoice.accountant_finalized',
                        $invoice,
                        [$salesRep],
                        new ShipmentFinancialsCompleted($invoice)
                    );
                }
            }

            return $invoice;
        });

        // Generate PDF linkage (can be live generate in frontend, but we ensure layout is ready)
        // Fix 7: Auto-PDF trigger could be here if we want to store it.

        return response()->json([
            'data' => $this->invoicePayload($invoice->fresh(['client', 'shipment', 'items', 'payments'])),
        ], 201);
    }

    public function show(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.view') || $user->can('accounting.view')),
            403
        );

        return response()->json([
            'data' => $this->invoicePayload($invoice->load(['client', 'shipment', 'items', 'payments'])),
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.manage') || $user->can('accounting.manage')),
            403
        );

        if (! in_array($invoice->status, ['draft', 'issued'], true)) {
            return response()->json([
                'message' => __('Only draft or issued invoices can be edited.'),
            ], 422);
        }

        $validated = $request->validate([
            'due_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'items.*.description' => ['required_with:items', 'string', 'max:255'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.currency_code' => ['required_with:items', 'string', 'size:3'],
            'items.*.section_key' => ['nullable', 'string', 'max:60'],
            'items.*.order_index' => ['nullable', 'integer', 'min:0'],
            'items.*.source_key' => ['nullable', 'string', 'max:150'],
            'items.*.cost_unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.cost_line_total' => ['nullable', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($invoice, $validated): void {
            if (array_key_exists('items', $validated)) {
                // If it's not a draft, we should be careful. But plan says replace items.
                $invoice->items()->delete();

                foreach ($validated['items'] as $itemData) {
                    $qty = (float) $itemData['quantity'];
                    $unitPrice = (float) $itemData['unit_price'];
                    $lineTotal = self::roundMoney($qty * $unitPrice);
                    $costUnitPrice = (float) ($itemData['cost_unit_price'] ?? 0);
                    $costLineTotal = array_key_exists('cost_line_total', $itemData)
                        ? self::roundMoney((float) $itemData['cost_line_total'])
                        : self::roundMoney($qty * $costUnitPrice);

                    $invoiceItemPayload = [
                        'invoice_id' => $invoice->id,
                        'item_id' => $itemData['item_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'line_total' => $lineTotal,
                        'currency_code' => strtoupper((string) $itemData['currency_code']),
                        'section_key' => $itemData['section_key'] ?? null,
                        'order_index' => (int) ($itemData['order_index'] ?? 0),
                        'source_key' => $itemData['source_key'] ?? null,
                        'cost_unit_price' => $costUnitPrice,
                        'cost_line_total' => $costLineTotal,
                    ];
                    if (self::invoiceItemsHasTitleColumn()) {
                        $invoiceItemPayload['title'] = $itemData['title'] ?? null;
                    }

                    InvoiceItem::create($invoiceItemPayload);
                }

                $invoice->refresh();
                FinancialService::syncInvoiceTotals($invoice);

                // Update Debit in Ledger
                CustomerTransaction::where('invoice_id', $invoice->id)
                    ->where('type', 'debit')
                    ->update([
                        'amount' => $invoice->net_amount,
                        'currency_id' => $invoice->currency_id,
                    ]);

                if ($invoice->shipment_id) {
                    ActivityLogger::log('shipment.client_invoice_items_updated', $invoice->shipment, [
                        'invoice_id' => $invoice->id,
                    ]);
                }
            }

            $fill = array_intersect_key($validated, array_flip(['due_date', 'notes']));
            if ($fill !== []) {
                $invoice->fill($fill);
                $invoice->save();
            }
        });

        return response()->json([
            'data' => $this->invoicePayload($invoice->fresh(['client', 'shipment', 'items', 'payments'])),
        ]);
    }

    public function issue(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.manage') || $user->can('accounting.manage')),
            403
        );

        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => __('Only draft invoices can be issued.'),
            ], 422);
        }

        $invoice->status = 'issued';
        $invoice->save();

        ActivityLogger::log('invoice.issued', $invoice, [
            'invoice_id' => $invoice->id,
            'shipment_id' => $invoice->shipment_id,
        ]);

        return response()->json([
            'data' => $invoice->fresh(['client', 'shipment', 'items']),
        ]);
    }

    public function cancel(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.manage') || $user->can('accounting.manage')),
            403
        );

        if ($invoice->status === 'paid') {
            return response()->json([
                'message' => __('Paid invoices cannot be cancelled.'),
            ], 422);
        }

        $invoice->status = 'cancelled';
        $invoice->save();

        ActivityLogger::log('invoice.cancelled', $invoice, [
            'invoice_id' => $invoice->id,
            'shipment_id' => $invoice->shipment_id,
        ]);

        return response()->json([
            'data' => $invoice->fresh(['client', 'shipment', 'items']),
        ]);
    }

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless($user && $user->can('accounting.manage'), 403);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'string'],
            'reference' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'currency_code' => ['nullable', 'string', 'size:3'],
            'source_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'target_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'target_currency_code' => ['nullable', 'string', 'size:3'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'converted_amount' => ['nullable', 'numeric', 'min:0'],
            'paid_at' => ['required', 'date'],
        ]);

        $payment = DB::transaction(function () use ($invoice, $validated, $user) {
            $payment = $invoice->payments()->create([
                'type' => 'client_receipt',
                'client_id' => $invoice->client_id,
                'amount' => $validated['amount'],
                'currency_code' => strtoupper((string) ($validated['currency_code'] ?? $invoice->currency_code)),
                'source_account_id' => $validated['source_account_id'] ?? null,
                'target_account_id' => $validated['target_account_id'] ?? null,
                'target_currency_code' => $validated['target_currency_code'] ?? null,
                'exchange_rate' => $validated['exchange_rate'] ?? null,
                'converted_amount' => $validated['converted_amount'] ?? null,
                'method' => $validated['method'],
                'reference' => $validated['reference'],
                'notes' => $validated['notes'] ?? null,
                'paid_at' => $validated['paid_at'],
                'status' => 'posted',
                'created_by_id' => $user->id,
            ]);

            FinancialService::handlePaymentPosted($payment);

            // Record a Credit in Customer Transactions
            CustomerTransaction::create([
                'customer_id' => $invoice->client_id,
                'invoice_id' => $invoice->id,
                'type' => 'credit',
                'amount' => $validated['amount'],
                'currency_id' => $invoice->currency_id,
                'description' => __('Payment received for invoice :number', ['number' => $invoice->invoice_number]),
            ]);

            // Update status based on balance
            $totalPaid = $invoice->payments()->where('status', 'posted')->sum('amount');
            if ($totalPaid >= $invoice->net_amount) {
                $invoice->status = 'paid';
            } elseif ($totalPaid > 0) {
                $invoice->status = 'partial';
            }
            $invoice->save();

            return $payment;
        });

        return response()->json([
            'data' => $payment,
            'invoice_status' => $invoice->status,
        ]);
    }

    public function pdf(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.view') || $user->can('accounting.view')),
            403
        );

        $invoice->load(['client', 'items', 'shipment.originPort', 'shipment.destinationPort', 'shipment.shippingLine', 'shipment.costInvoice']);
        $layout = PdfLayout::where('document_type', 'invoice')->first();

        $filename = $invoice->invoice_number.'.pdf';

        $locale = strtolower((string) $request->header('X-App-Locale', 'en')) === 'ar' ? 'ar' : 'en';
        $labels = $this->invoicePdfLabels($locale);

        $invoiceData = $this->invoicePayload($invoice);

        $html = view('invoices.pdf', [
            'invoice' => $invoice,
            'invoiceData' => $invoiceData,
            'headerHtml' => $layout?->header_html,
            'footerHtml' => $layout?->footer_html,
            'lang' => $locale,
            'labels' => $labels,
            'bankAccount' => BankAccount::query()->where('is_active', true)->orderBy('id')->first(),
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
    private function invoicePdfLabels(string $locale): array
    {
        if ($locale === 'ar') {
            return [
                'doc_title' => 'فاتورة',
                'company_name' => 'أمازون مارين',
                'company_tagline' => 'شحن وحلول لوجستية',
                'invoice_title' => 'فاتورة',
                'invoice_no' => 'رقم:',
                'date' => 'التاريخ:',
                'due_date' => 'تاريخ الاستحقاق:',
                'shipment_bl' => 'بوليصة الشحنة:',
                'billed_to' => 'الفاتورة إلى',
                'description' => 'الوصف',
                'qty' => 'الكمية',
                'unit_price' => 'سعر الوحدة',
                'line_total' => 'الإجمالي',
                'subtotal' => 'المجموع الفرعي',
                'vat' => 'ضريبة القيمة المضافة (14%)',
                'grand_total' => 'الإجمالي',
                'notes' => 'ملاحظات',
                'bank_details' => 'بيانات البنك',
                'bank_name' => 'اسم البنك',
                'account_number' => 'رقم الحساب',
                'iban' => 'IBAN',
                'swift' => 'SWIFT',
                'payment_instructions' => 'تعليمات السداد',
                'generated' => 'أُنشئت في',
                'system_credit' => 'نظام أمازون مارين',
            ];
        }

        return [
            'doc_title' => 'Invoice',
            'company_name' => 'AMAZON MARINE',
            'company_tagline' => 'Shipping & logistics services',
            'invoice_title' => 'Invoice',
            'invoice_no' => 'No:',
            'date' => 'Date:',
            'due_date' => 'Due date:',
            'shipment_bl' => 'Shipment B/L:',
            'billed_to' => 'Billed to',
            'description' => 'Description',
            'qty' => 'Qty',
            'unit_price' => 'Unit price',
            'line_total' => 'Total',
            'subtotal' => 'Subtotal',
            'vat' => 'VAT (14%)',
            'grand_total' => 'Grand total',
            'notes' => 'Notes',
            'bank_details' => 'Bank Details',
            'bank_name' => 'Bank Name',
            'account_number' => 'Account Number',
            'iban' => 'IBAN',
            'swift' => 'SWIFT',
            'payment_instructions' => 'Payment Instructions',
            'generated' => 'Generated on',
            'system_credit' => 'Amazon Marine system',
        ];
    }
}
