<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\CustomerTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\BankAccount;
use App\Models\PdfLayout;
use App\Notifications\ShipmentFinancialsCompleted;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Mpdf\Mpdf;

class InvoiceController extends Controller
{
    private const TYPE_ID_TO_CODE = [
        0 => 'client',
        1 => 'vendor',
    ];

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
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
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
                $lineTotal = round($itemData['quantity'] * $itemData['unit_price'], 2);

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_id' => $itemData['item_id'] ?? null,
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'line_total' => $lineTotal,
                ]);
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

        $validated = $request->validate([
            'due_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'items.*.description' => ['required_with:items', 'string', 'max:255'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($invoice, $validated): void {
            if (array_key_exists('items', $validated)) {
                // If it's not a draft, we should be careful. But plan says replace items.
                $invoice->items()->delete();

                foreach ($validated['items'] as $itemData) {
                    $lineTotal = round($itemData['quantity'] * $itemData['unit_price'], 2);

                    InvoiceItem::create([
                        'invoice_id' => $invoice->id,
                        'item_id' => $itemData['item_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'line_total' => $lineTotal,
                    ]);
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
            'data' => $invoice->fresh(['client', 'shipment', 'items']),
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
            'paid_at' => ['required', 'date'],
        ]);

        $payment = DB::transaction(function () use ($invoice, $validated, $user) {
            $payment = $invoice->payments()->create([
                'type' => 'client_receipt',
                'client_id' => $invoice->client_id,
                'amount' => $validated['amount'],
                'currency_code' => $invoice->currency_code,
                'method' => $validated['method'],
                'reference' => $validated['reference'],
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

        $html = view('invoices.pdf', [
            'invoice' => $invoice,
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
