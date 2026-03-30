<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Shipment;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    private const CURRENCY_ID_TO_CODE = [
        1 => 'USD',
        2 => 'EGP',
        3 => 'EUR',
    ];

    private const TYPE_ID_TO_CODE = [
        0 => 'client',
        1 => 'vendor',
    ];

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

        $perPage = $request->integer('per_page', 20);
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

    private static function mapCurrencyCodeFromId(int $currencyId): string
    {
        return self::CURRENCY_ID_TO_CODE[$currencyId] ?? 'USD';
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

            $monthPaid = $invoices->filter(function (Invoice $invoice) use ($key) {
                return $invoice->status === 'paid'
                    && $invoice->issue_date
                    && $invoice->issue_date->format('Y-m') === $key;
            })->sum('net_amount');

            $labels[] = $key;
            $paidSeries[] = (float) $monthPaid;

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
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($validated, $request) {
            $invoice = new Invoice();
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
                $lineTotal = $itemData['quantity'] * $itemData['unit_price'];

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'line_total' => $lineTotal,
                ]);
            }

            FinancialService::syncInvoiceTotals($invoice);

            ActivityLogger::log('invoice.created', $invoice, [
                'client_id' => $invoice->client_id,
                'shipment_id' => $invoice->shipment_id,
            ]);

            return $invoice;
        });

        return response()->json([
            'data' => $invoice->fresh(['client', 'shipment', 'items']),
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
            'data' => $invoice->load(['client', 'shipment', 'items', 'payments']),
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

        $rules = [
            'due_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.description' => ['required_with:items', 'string', 'max:255'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
        ];

        $validated = $request->validate($rules);

        if (array_key_exists('items', $validated) && $invoice->status !== 'draft') {
            return response()->json([
                'message' => __('Only draft invoices can have line items replaced.'),
            ], 422);
        }

        DB::transaction(function () use ($invoice, $validated): void {
            if (array_key_exists('items', $validated)) {
                $invoice->items()->delete();

                foreach ($validated['items'] as $itemData) {
                    $lineTotal = $itemData['quantity'] * $itemData['unit_price'];

                    InvoiceItem::create([
                        'invoice_id' => $invoice->id,
                        'description' => $itemData['description'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'line_total' => $lineTotal,
                    ]);
                }

                $invoice->refresh();
                FinancialService::syncInvoiceTotals($invoice);

                if ($invoice->shipment_id) {
                    $shipment = Shipment::find($invoice->shipment_id);
                    if ($shipment) {
                        ActivityLogger::log('shipment.client_invoice_items_updated', $shipment, [
                            'invoice_id' => $invoice->id,
                        ]);
                    }
                }
            }

            $fill = array_intersect_key($validated, array_flip(['due_date', 'notes']));
            if ($fill !== []) {
                $invoice->fill($fill);
                $invoice->save();
            }
        });

        $fresh = $invoice->fresh(['client', 'shipment', 'items', 'payments']);
        ActivityLogger::log('invoice.updated', $fresh, [
            'line_items_replaced' => array_key_exists('items', $validated),
        ]);

        return response()->json([
            'data' => $fresh,
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

        ActivityLogger::log('invoice.issued', $invoice);

        return response()->json([
            'data' => $invoice,
        ]);
    }

    public function cancel(Request $request, Invoice $invoice)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if (! in_array($invoice->status, ['draft', 'issued'], true)) {
            return response()->json([
                'message' => __('Only draft or issued invoices can be cancelled.'),
            ], 422);
        }

        $invoice->status = 'cancelled';
        $invoice->save();

        ActivityLogger::log('invoice.cancelled', $invoice);

        return response()->json([
            'data' => $invoice,
        ]);
    }

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.manage') || $user->can('accounting.manage')),
            403
        );

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_id' => ['required', 'integer', 'min:1'],
            'method' => ['required', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['nullable', 'date'],
        ]);

        $payment = new Payment();
        $payment->type = 'client_receipt';
        $payment->invoice_id = $invoice->id;
        $payment->client_id = $invoice->client_id;
        $payment->amount = $validated['amount'];
        $payment->currency_code = self::mapCurrencyCodeFromId($validated['currency_id']);
        $payment->method = $validated['method'];
        $payment->reference = $validated['reference'] ?? null;
        $payment->paid_at = $validated['paid_at'] ?? now();
        $payment->created_by_id = $request->user()->id;
        $payment->save();

        FinancialService::handlePaymentPosted($payment);

        ActivityLogger::log('invoice.payment_recorded', $invoice, [
            'payment_id' => $payment->id,
        ]);

        if ($invoice->shipment_id) {
            $shipment = Shipment::find($invoice->shipment_id);
            if ($shipment) {
                ActivityLogger::log('shipment.invoice_payment_recorded', $shipment, [
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'amount' => (float) $payment->amount,
                    'currency_code' => $payment->currency_code,
                ]);
            }
        }

        return response()->json([
            'data' => $invoice->fresh(['client', 'shipment', 'items', 'payments']),
        ], 201);
    }

    public function export(Request $request)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.view') || $user->can('accounting.view')),
            403
        );

        $query = Invoice::query()->with(['client', 'shipment']);

        if ($invoiceType = $request->query('invoice_type')) {
            $query->where('invoice_type', $invoiceType === 'partner' ? 'vendor' : $invoiceType);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('invoice_number', 'like', '%'.$search.'%')
                    ->orWhereHas('client', function ($q2) use ($search): void {
                        $q2->where('name', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($currencyId = $request->query('currency_id')) {
            $query->where('currency_id', (int) $currencyId);
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

        if ($ids = $request->query('ids')) {
            $idArray = is_array($ids) ? $ids : array_filter(array_map('intval', explode(',', (string) $ids)));
            if ($idArray) {
                $query->whereIn('id', $idArray);
            }
        }

        $invoices = $query->orderByDesc('issue_date')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="invoices-export-'.date('Y-m-d').'.csv"',
        ];

        $callback = static function () use ($invoices): void {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, [
                'invoice_id',
                'invoice_number',
                'client',
                'shipment_bl',
                'issue_date',
                'due_date',
                'status',
                'net_amount',
                'currency_code',
            ]);

            foreach ($invoices as $invoice) {
                fputcsv($fh, [
                    $invoice->id,
                    $invoice->invoice_number,
                    $invoice->client?->name ?? '',
                    $invoice->shipment?->bl_number ?? '',
                    $invoice->issue_date?->toDateString() ?? '',
                    $invoice->due_date?->toDateString() ?? '',
                    $invoice->status,
                    $invoice->net_amount,
                    $invoice->currency_code,
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }

}

