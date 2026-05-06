<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Vendor;
use App\Models\VendorBill;
use App\Services\AccountingAggregationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountingController extends Controller
{
    private function applyCustomerInvoiceFilter($query)
    {
        if (Schema::hasColumn('invoices', 'invoice_type')) {
            $query->where('invoice_type', 'client');
        } elseif (Schema::hasColumn('invoices', 'invoice_type_id')) {
            $query->where('invoice_type_id', 0);
        }
    }

    public function stats(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view accounting stats.')
        );

        $months = max(1, (int) $request->query('months', 6));
        $summary = $this->buildAccountingSummaryData($months);

        return response()->json([
            'data' => $summary['totals'],
        ]);
    }

    public function charts(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view accounting charts.')
        );

        $months = max(1, (int) $request->query('months', 6));
        $summary = $this->buildAccountingSummaryData($months);

        return response()->json([
            'data' => [
                'receivables_payables' => $summary['receivables_payables'],
                'balance_by_currency' => $summary['balance_by_currency'],
            ],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view accounting summary.')
        );

        $months = max(1, (int) $request->query('months', 6));
        $summary = $this->buildAccountingSummaryData($months);

        return response()->json([
            'data' => $summary,
        ]);
    }

    /**
     * @return array{
     *   totals: array{receivables: float, payables: float, net: float, currencies: \Illuminate\Support\Collection<int, string>},
     *   receivables_payables: array{labels: array<int, string>, receivables: array<int, float>, payables: array<int, float>},
     *   balance_by_currency: \Illuminate\Support\Collection<int, array{currency: string, balance: float}>
     * }
     */
    private function buildAccountingSummaryData(int $months): array
    {
        $from = now()->subMonths($months - 1)->startOfMonth();

        $invoices = Invoice::query()
            ->whereDate('issue_date', '>=', $from)
            ->get();

        $vendorBills = VendorBill::query()
            ->whereDate('bill_date', '>=', $from)
            ->get();

        $clientTotals = $invoices->groupBy('currency_code')->map(function ($group) {
            return (float) $group->sum('total_amount');
        });

        $partnerTotals = $vendorBills->groupBy('currency_code')->map(function ($group) {
            return (float) $group->sum('total_amount');
        });

        $totalReceivables = (float) $clientTotals->sum();
        $totalPayables = (float) $partnerTotals->sum();
        $netBalance = $totalReceivables - $totalPayables;

        $monthsCursor = $from->copy();
        $receivablesSeries = [];
        $payablesSeries = [];
        $labels = [];

        while ($monthsCursor <= now()) {
            $key = $monthsCursor->format('Y-m');

            $monthReceivables = $invoices->filter(function (Invoice $invoice) use ($monthsCursor) {
                return $invoice->issue_date?->format('Y-m') === $monthsCursor->format('Y-m');
            })->sum('total_amount');

            $monthPayables = $vendorBills->filter(function (VendorBill $bill) use ($monthsCursor) {
                return $bill->bill_date?->format('Y-m') === $monthsCursor->format('Y-m');
            })->sum('total_amount');

            $labels[] = $key;
            $receivablesSeries[] = (float) $monthReceivables;
            $payablesSeries[] = (float) $monthPayables;

            $monthsCursor->addMonth();
        }

        $balanceByCurrency = $clientTotals->map(function (float $value, string $currency) use ($partnerTotals) {
            $payables = (float) ($partnerTotals[$currency] ?? 0.0);

            return $value - $payables;
        });

        return [
            'totals' => [
                'receivables' => $totalReceivables,
                'payables' => $totalPayables,
                'net' => $netBalance,
                'currencies' => $balanceByCurrency->keys()->values(),
            ],
            'receivables_payables' => [
                'labels' => $labels,
                'receivables' => $receivablesSeries,
                'payables' => $payablesSeries,
            ],
            'balance_by_currency' => $balanceByCurrency->map(function (float $value, string $currency) {
                return [
                    'currency' => $currency,
                    'balance' => $value,
                ];
            })->values(),
        ];
    }

    public function clientAccounts(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view client accounts.')
        );

        $query = Client::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        $clients = $query->orderBy('name')->get();

        $currencyFilter = $request->query('currency');

        $rows = $clients->map(function (Client $client) use ($currencyFilter) {
            $invoicesQuery = Invoice::query()
                ->where('client_id', $client->id);
            $this->applyCustomerInvoiceFilter($invoicesQuery);

            $paymentsQuery = Payment::query()
                ->where('client_id', $client->id)
                ->where('type', 'client_receipt');

            if ($currencyFilter) {
                $invoicesQuery->where('currency_code', $currencyFilter);
                $paymentsQuery->where('currency_code', $currencyFilter);
            }

            $invoices = $invoicesQuery->with('items')->get();
            $payments = $paymentsQuery->get();

            $aggregated = AccountingAggregationService::aggregateInvoices($invoices);
            $totalSales = (float) array_sum($aggregated['total_invoiced_per_currency']);
            $paid = (float) $payments->sum('amount');
            $balance = $totalSales - $paid;

            $lastPayment = $payments->max('paid_at');

            return [
                'client_id' => $client->id,
                'client_name' => $client->name,
                'total_sales' => $totalSales,
                'paid' => $paid,
                'balance' => $balance,
                'currency' => $currencyFilter ?: ($invoices->first()->currency_code ?? null),
                'last_payment_date' => $lastPayment ? $lastPayment->toDateString() : null,
            ];
        });

        $sort = $request->query('sort');

        if ($sort) {
            $rows = $rows->sortBy(function (array $row) use ($sort) {
                return $row[$sort] ?? null;
            }, descending: in_array($sort, ['balance', 'total_sales'], true));
        }

        return response()->json([
            'data' => $rows->values(),
        ]);
    }

    public function partnerAccounts(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view partner accounts.')
        );

        $query = Vendor::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        if ($partnerType = $request->query('partner_type')) {
            $query->where('type', $partnerType);
        }

        $vendors = $query->orderBy('name')->get();

        $currencyFilter = $request->query('currency');

        $rows = $vendors->map(function (Vendor $vendor) use ($currencyFilter) {
            $billsQuery = VendorBill::query()
                ->where('vendor_id', $vendor->id);

            $paymentsQuery = Payment::query()
                ->where('vendor_id', $vendor->id)
                ->where('type', 'vendor_payment');

            if ($currencyFilter) {
                $billsQuery->where('currency_code', $currencyFilter);
                $paymentsQuery->where('currency_code', $currencyFilter);
            }

            $bills = $billsQuery->get();
            $payments = $paymentsQuery->get();

            $totalDue = (float) $bills->sum('total_amount');
            $paid = (float) $payments->sum('amount');
            $balance = $totalDue - $paid;

            return [
                'partner_id' => $vendor->id,
                'partner_name' => $vendor->name,
                'type' => $vendor->type ?? null,
                'total_due' => $totalDue,
                'paid' => $paid,
                'balance' => $balance,
                'currency' => $currencyFilter ?: ($bills->first()->currency_code ?? null),
            ];
        });

        $sort = $request->query('sort');

        if ($sort) {
            $rows = $rows->sortBy(function (array $row) use ($sort) {
                return $row[$sort] ?? null;
            }, descending: in_array($sort, ['balance', 'total_due'], true));
        }

        return response()->json([
            'data' => $rows->values(),
        ]);
    }

    public function partnerLedger(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view partner ledger.')
        );

        $query = Vendor::query();
        $vendorId = $request->query('vendor_id');
        $status = trim((string) $request->query('status', ''));
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('name', 'like', '%'.$search.'%');
        }
        if ($vendorId) {
            $query->where('id', (int) $vendorId);
        }

        $category = trim((string) $request->query('category', 'all'));
        if ($category !== '' && strtolower($category) !== 'all') {
            $query->where('type', $category);
        }

        $vendors = $query->orderBy('name')->get();

        $data = $vendors->map(function (Vendor $vendor) use ($search, $status, $dateFrom, $dateTo): ?array {
            $billsQuery = VendorBill::query()
                ->where('vendor_id', $vendor->id)
                ->orderByDesc('bill_date')
                ->orderByDesc('id');
            if ($search !== '') {
                $billsQuery->where('bill_number', 'like', '%'.$search.'%');
            }
            if ($status !== '') {
                $billsQuery->where('status', $status);
            }
            if ($dateFrom) {
                $billsQuery->whereDate('bill_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $billsQuery->whereDate('bill_date', '<=', $dateTo);
            }
            $bills = $billsQuery->get();
            if (($search !== '' || $status !== '' || $dateFrom || $dateTo) && $bills->isEmpty()) {
                return null;
            }

            $payments = Payment::query()
                ->where('vendor_id', $vendor->id)
                ->where('type', 'vendor_payment')
                ->orderByDesc('paid_at')
                ->orderByDesc('id')
                ->get();

            $billedByCurrency = [];
            foreach ($bills as $bill) {
                $cur = strtoupper((string) ($bill->currency_code ?: 'USD'));
                $billedByCurrency[$cur] = ($billedByCurrency[$cur] ?? 0) + (float) $bill->total_amount;
            }

            $paidByCurrency = [];
            foreach ($payments as $payment) {
                $cur = strtoupper((string) ($payment->currency_code ?: 'USD'));
                $paidByCurrency[$cur] = ($paidByCurrency[$cur] ?? 0) + (float) $payment->amount;
            }

            $balanceByCurrency = [];
            $currencies = array_unique(array_merge(array_keys($billedByCurrency), array_keys($paidByCurrency)));
            foreach ($currencies as $cur) {
                $balanceByCurrency[$cur] = (float) ($billedByCurrency[$cur] ?? 0) - (float) ($paidByCurrency[$cur] ?? 0);
            }

            return [
                'partner_id' => $vendor->id,
                'partner_name' => $vendor->name,
                'category' => $vendor->type,
                'total_invoices_count' => $bills->count(),
                'linked_shipments_count' => $bills->pluck('shipment_id')->filter()->unique()->count(),
                'total_billed_amount' => $billedByCurrency,
                'total_paid_amount' => $paidByCurrency,
                'remaining_balance' => $balanceByCurrency,
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    public function partnerLedgerDetail(Request $request, Vendor $vendor): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view partner ledger details.')
        );

        $bills = VendorBill::query()
            ->where('vendor_id', $vendor->id)
            ->with(['shipment.attachments', 'items', 'payments'])
            ->orderByDesc('bill_date')
            ->orderByDesc('id')
            ->get();

        $rows = $bills->map(function (VendorBill $bill): array {
            $billCurrency = strtoupper((string) ($bill->currency_code ?: 'USD'));
            $totalAmount = (float) $bill->total_amount;

            $paidAmount = (float) $bill->payments
                ->where('currency_code', $billCurrency)
                ->sum('amount');

            $status = 'unpaid';
            if ($paidAmount >= $totalAmount && $totalAmount > 0) {
                $status = 'paid';
            } elseif ($paidAmount > 0 && $paidAmount < $totalAmount) {
                $status = 'partially_paid';
            }

            $items = $bill->items->map(static function ($item) use ($billCurrency): array {
                return [
                    'id' => $item->id,
                    'description' => $item->description,
                    'section_key' => $item->section_key,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'currency_code' => strtoupper((string) ($item->currency_code ?: $billCurrency)),
                ];
            })->values()->all();
            $paymentHistory = $bill->payments
                ->sortByDesc(fn (Payment $p) => $p->paid_at?->toDateString() ?? '')
                ->values()
                ->map(static function (Payment $p): array {
                    return [
                        'id' => $p->id,
                        'amount' => (float) $p->amount,
                        'currency_code' => strtoupper((string) ($p->currency_code ?: 'USD')),
                        'method' => $p->method,
                        'paid_at' => $p->paid_at?->toDateString(),
                        'reference' => $p->reference,
                    ];
                })->all();
            $attachments = $bill->shipment?->attachments
                ? $bill->shipment->attachments->map(static function ($a): array {
                    return [
                        'id' => $a->id,
                        'name' => $a->name ?? $a->file_name ?? $a->original_name ?? ('attachment-'.$a->id),
                    ];
                })->values()->all()
                : [];

            return [
                'shipment_id' => $bill->shipment_id,
                'shipment_reference' => $bill->shipment?->bl_number,
                'invoice_reference' => $bill->bill_number ?: ('VB-'.$bill->id),
                'amount' => $totalAmount,
                'currency_breakdown' => [
                    $billCurrency => $totalAmount,
                ],
                'paid_amount' => [
                    $billCurrency => $paidAmount,
                ],
                'status' => $status,
                'bill_date' => $bill->bill_date?->toDateString(),
                'line_items' => $items,
                'payment_history' => $paymentHistory,
                'attachments' => $attachments,
            ];
        })->values();

        return response()->json([
            'data' => [
                'partner_id' => $vendor->id,
                'partner_name' => $vendor->name,
                'category' => $vendor->type,
                'rows' => $rows,
            ],
        ]);
    }

    public function companyStatement(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $invoicesQuery = Invoice::query();
        $this->applyCustomerInvoiceFilter($invoicesQuery);
        $invoices = $invoicesQuery->with('items')->get();
        $payments = Payment::query()->where('type', 'client_receipt')->get();

        $billedByCurrency = [];
        foreach ($invoices as $inv) {
            $totals = AccountingAggregationService::invoiceTotalsPerCurrency($inv);
            $billedByCurrency = AccountingAggregationService::addCurrencyMaps($billedByCurrency, $totals);
        }
        $paidByCurrency = [];
        foreach ($payments as $p) {
            $cur = strtoupper((string) ($p->currency_code ?: 'USD'));
            $paidByCurrency[$cur] = ($paidByCurrency[$cur] ?? 0) + (float) $p->amount;
        }

        $billedByCurrency = AccountingAggregationService::normalizeCurrencyMap($billedByCurrency);
        $paidByCurrency = AccountingAggregationService::normalizeCurrencyMap($paidByCurrency);

        $remaining = [];
        foreach (array_unique(array_merge(array_keys($billedByCurrency), array_keys($paidByCurrency))) as $cur) {
            $remaining[$cur] = (float) ($billedByCurrency[$cur] ?? 0) - (float) ($paidByCurrency[$cur] ?? 0);
        }
        $remaining = AccountingAggregationService::normalizeCurrencyMap($remaining);

        return response()->json([
            'data' => [
                'total_invoices_count' => $invoices->count(),
                'total_billed_amount' => $billedByCurrency,
                'total_paid_amount' => $paidByCurrency,
                'remaining_balance' => $remaining,
            ],
        ]);
    }

    public function customerStatements(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);
        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $shipmentId = $request->query('shipment_id');

        $query = Client::query();
        if ($search !== '') {
            $query->where('name', 'like', '%'.$search.'%');
        }
        $clients = $query->orderBy('name')->get();

        $rows = $clients->map(function (Client $client) use ($search, $status, $dateFrom, $dateTo, $shipmentId) {
            $invoicesQuery = Invoice::query()
                ->where('client_id', $client->id)
                ->orderByDesc('issue_date')
                ->orderByDesc('id');
            $this->applyCustomerInvoiceFilter($invoicesQuery);
            if ($search !== '') {
                $invoicesQuery->where(function ($q) use ($search): void {
                    $q->where('invoice_number', 'like', '%'.$search.'%')
                        ->orWhereHas('client', function ($q2) use ($search): void {
                            $q2->where('name', 'like', '%'.$search.'%');
                        });
                });
            }
            if ($status !== '') {
                $mapStatus = $status === 'partial' ? 'partial' : $status;
                $invoicesQuery->where('status', $mapStatus);
            }
            if ($dateFrom) {
                $invoicesQuery->whereDate('issue_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $invoicesQuery->whereDate('issue_date', '<=', $dateTo);
            }
            if ($shipmentId) {
                $invoicesQuery->where('shipment_id', (int) $shipmentId);
            }
            $invoices = $invoicesQuery->with('items')->get();
            if (($search !== '' || $status !== '' || $dateFrom || $dateTo || $shipmentId) && $invoices->isEmpty()) {
                return null;
            }
            $invoices->loadMissing('items');
            $aggregated = AccountingAggregationService::aggregateInvoices($invoices);

            $invoiceStatuses = [
                'paid' => 0,
                'partial' => 0,
                'unpaid' => 0,
            ];
            foreach ($invoices as $inv) {
                $statusKey = AccountingAggregationService::invoiceStatementTotals($inv)['status'];
                $invoiceStatuses[$statusKey] = (int) ($invoiceStatuses[$statusKey] ?? 0) + 1;
            }

            return [
                'customer_id' => $client->id,
                'customer_name' => $client->name,
                'invoice_count' => $invoices->count(),
                'total_invoices_value' => $aggregated['total_invoiced_per_currency'],
                'paid_amount' => $aggregated['total_paid_per_currency'],
                'remaining_balance' => $aggregated['total_remaining_per_currency'],
                'invoice_status_counts' => $invoiceStatuses,
            ];
        })->filter()->values();

        return response()->json(['data' => $rows]);
    }

    public function customerStatementDetail(Request $request, Client $client): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $invoicesQuery = Invoice::query()
            ->where('client_id', $client->id)
            ->with(['shipment.attachments', 'items', 'payments'])
            ->orderByDesc('issue_date')
            ->orderByDesc('id');
        $this->applyCustomerInvoiceFilter($invoicesQuery);
        $invoices = $invoicesQuery->get();

        $rows = $invoices->map(function (Invoice $inv) {
            $computed = AccountingAggregationService::invoiceStatementTotals($inv);

            $paymentHistory = $inv->payments
                ->sortByDesc(fn (Payment $p) => $p->paid_at?->toDateString() ?? '')
                ->values()
                ->map(static function (Payment $p): array {
                    return [
                        'id' => $p->id,
                        'amount' => (float) $p->amount,
                        'currency_code' => strtoupper((string) ($p->currency_code ?: 'USD')),
                        'method' => $p->method,
                        'paid_at' => $p->paid_at?->toDateString(),
                        'reference' => $p->reference,
                    ];
                })->all();
            $attachments = $inv->shipment?->attachments
                ? $inv->shipment->attachments->map(static function ($a): array {
                    return [
                        'id' => $a->id,
                        'name' => $a->name ?? $a->file_name ?? $a->original_name ?? ('attachment-'.$a->id),
                    ];
                })->values()->all()
                : [];
            $items = $inv->items->map(static function ($item): array {
                return [
                    'id' => $item->id,
                    'description' => $item->description,
                    'section_key' => $item->section_key,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'currency_code' => strtoupper((string) ($item->currency_code ?: 'USD')),
                ];
            })->values()->all();

            return [
                'invoice_id' => $inv->id,
                'invoice_reference' => $inv->invoice_number ?: ('INV-'.$inv->id),
                'shipment_id' => $inv->shipment_id,
                'shipment_reference' => $inv->shipment?->bl_number,
                'status' => $computed['status'],
                'total_invoiced_per_currency' => $computed['total_invoiced_per_currency'],
                'total_paid_per_currency' => $computed['total_paid_per_currency'],
                'total_remaining_per_currency' => $computed['total_remaining_per_currency'],
                // Backward-compatible keys consumed by existing frontend.
                'total_amount' => $computed['total_invoiced_per_currency'],
                'paid_amount' => $computed['total_paid_per_currency'],
                'remaining_amount' => $computed['total_remaining_per_currency'],
                'issue_date' => $inv->issue_date?->toDateString(),
                'due_date' => $inv->due_date?->toDateString(),
                'line_items' => $items,
                'attachments' => $attachments,
                'payment_history' => $paymentHistory,
            ];
        })->values();

        return response()->json([
            'data' => [
                'customer_id' => $client->id,
                'customer_name' => $client->name,
                'invoices' => $rows,
            ],
        ]);
    }

    public function exportClients(Request $request): StreamedResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to export client accounts.')
        );

        $ids = $request->query('ids');

        $query = Client::query();

        if ($ids) {
            $idArray = is_array($ids) ? $ids : array_filter(array_map('intval', explode(',', (string) $ids)));
            if ($idArray) {
                $query->whereIn('id', $idArray);
            }
        }

        $clients = $query->orderBy('name')->get();

        $rows = $clients->map(function (Client $client) {
            $invoicesQuery = Invoice::query()
                ->where('client_id', $client->id);
            $this->applyCustomerInvoiceFilter($invoicesQuery);
            $invoices = $invoicesQuery->get();

            $payments = Payment::query()
                ->where('client_id', $client->id)
                ->where('type', 'client_receipt')
                ->get();

            $aggregated = AccountingAggregationService::aggregateInvoices($invoices);
            $totalSales = (float) array_sum($aggregated['total_invoiced_per_currency']);
            $paid = (float) $payments->sum('amount');
            $balance = $totalSales - $paid;

            return [
                'client_id' => $client->id,
                'client_name' => $client->name,
                'total_sales' => $totalSales,
                'paid' => $paid,
                'balance' => $balance,
            ];
        });

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="accounting-clients-export-'.date('Y-m-d').'.csv"',
        ];

        $callback = static function () use ($rows): void {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, ['client_id', 'client_name', 'total_sales', 'paid', 'balance']);

            foreach ($rows as $row) {
                fputcsv($fh, [
                    $row['client_id'],
                    $row['client_name'],
                    $row['total_sales'],
                    $row['paid'],
                    $row['balance'],
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportPartners(Request $request): StreamedResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to export partner accounts.')
        );

        $ids = $request->query('ids');

        $query = Vendor::query();

        if ($ids) {
            $idArray = is_array($ids) ? $ids : array_filter(array_map('intval', explode(',', (string) $ids)));
            if ($idArray) {
                $query->whereIn('id', $idArray);
            }
        }

        $vendors = $query->orderBy('name')->get();

        $rows = $vendors->map(function (Vendor $vendor) {
            $bills = VendorBill::query()
                ->where('vendor_id', $vendor->id)
                ->get();

            $payments = Payment::query()
                ->where('vendor_id', $vendor->id)
                ->where('type', 'vendor_payment')
                ->get();

            $totalDue = (float) $bills->sum('total_amount');
            $paid = (float) $payments->sum('amount');
            $balance = $totalDue - $paid;

            return [
                'partner_id' => $vendor->id,
                'partner_name' => $vendor->name,
                'total_due' => $totalDue,
                'paid' => $paid,
                'balance' => $balance,
            ];
        });

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="accounting-partners-export-'.date('Y-m-d').'.csv"',
        ];

        $callback = static function () use ($rows): void {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, ['partner_id', 'partner_name', 'total_due', 'paid', 'balance']);

            foreach ($rows as $row) {
                fputcsv($fh, [
                    $row['partner_id'],
                    $row['partner_name'],
                    $row['total_due'],
                    $row['paid'],
                    $row['balance'],
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }
}
