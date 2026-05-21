<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\ShipmentCostInvoice;
use App\Models\TreasuryEntry;
use App\Models\Vendor;
use App\Models\VendorBill;
use App\Services\AccountingAggregationService;
use App\Services\PrepaidPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
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
     *   totals: array{receivables: float, payables: float, net: float, currencies: Collection<int, string>},
     *   receivables_payables: array{labels: array<int, string>, receivables: array<int, float>, payables: array<int, float>},
     *   balance_by_currency: Collection<int, array{currency: string, balance: float}>
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
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhereHas('invoices', function ($iq) use ($search): void {
                        $this->applyCustomerInvoiceFilter($iq);
                        $iq->where('invoice_number', 'like', '%'.$search.'%');
                    });
            });
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
            $invoices->loadMissing('items');

            if ($status !== '' && $invoices->isNotEmpty()) {
                $mapStatus = $status === 'partial' ? 'partial' : $status;
                $invoices = $invoices
                    ->filter(function (Invoice $inv) use ($mapStatus): bool {
                        return AccountingAggregationService::invoiceStatementTotals($inv)['status'] === $mapStatus;
                    })
                    ->values();
            }

            if ($shipmentId && $invoices->isEmpty()) {
                return null;
            }

            $aggregated = $invoices->isNotEmpty()
                ? AccountingAggregationService::aggregateInvoices($invoices)
                : [
                    'total_invoiced_per_currency' => [],
                    'total_paid_per_currency' => [],
                    'total_remaining_per_currency' => [],
                ];

            $prepaidBalance = PrepaidPaymentService::prepaidBalanceByCurrency((int) $client->id);
            $invoicePaid = $aggregated['total_paid_per_currency'];
            $totalPayments = $this->mergeCurrencyMaps($invoicePaid, $prepaidBalance);
            $remainingBalance = $aggregated['total_remaining_per_currency'];
            $accountStatus = $this->deriveCustomerAccountStatus(
                $remainingBalance,
                $prepaidBalance,
                $invoicePaid,
                $invoices->count(),
            );

            if ($status !== '' && ! $this->customerAccountStatusMatchesFilter($accountStatus, $status)) {
                return null;
            }

            $invoiceStatuses = [
                'paid' => 0,
                'partial' => 0,
                'unpaid' => 0,
            ];
            foreach ($invoices as $inv) {
                $statusKey = AccountingAggregationService::invoiceStatementTotals($inv)['status'];
                $invoiceStatuses[$statusKey] = (int) ($invoiceStatuses[$statusKey] ?? 0) + 1;
            }

            $shipmentsCount = $invoices->pluck('shipment_id')
                ->filter(fn ($id) => $id !== null && (int) $id > 0)
                ->unique()
                ->count();

            return [
                'customer_id' => $client->id,
                'customer_name' => $client->name,
                'invoice_count' => $invoices->count(),
                'shipments_count' => $shipmentsCount,
                'total_invoices_value' => $aggregated['total_invoiced_per_currency'],
                'paid_amount' => $totalPayments,
                'invoice_paid_amount' => $invoicePaid,
                'prepaid_balance' => $prepaidBalance,
                'remaining_balance' => $remainingBalance,
                'current_balance' => $remainingBalance,
                'account_status' => $accountStatus,
                'invoice_status_counts' => $invoiceStatuses,
            ];
        })->filter()->values();

        return response()->json(['data' => $rows]);
    }

    /**
     * @param  array<string, float>  $remaining
     * @param  array<string, float>  $prepaid
     * @param  array<string, float>  $invoicePaid
     */
    private function deriveCustomerAccountStatus(
        array $remaining,
        array $prepaid,
        array $invoicePaid,
        int $invoiceCount,
    ): string {
        $hasRemaining = false;
        foreach ($remaining as $val) {
            if ((float) $val > 0.00001) {
                $hasRemaining = true;
                break;
            }
        }

        $hasPrepaid = false;
        foreach ($prepaid as $val) {
            if ((float) $val > 0.00001) {
                $hasPrepaid = true;
                break;
            }
        }

        if ($hasRemaining) {
            $hasInvoicePaid = false;
            foreach ($invoicePaid as $val) {
                if ((float) $val > 0.00001) {
                    $hasInvoicePaid = true;
                    break;
                }
            }

            return $hasInvoicePaid ? 'partial' : 'unpaid';
        }

        if ($hasPrepaid) {
            return 'credit';
        }

        if ($invoiceCount > 0) {
            return 'paid';
        }

        return 'clear';
    }

    private function customerAccountStatusMatchesFilter(string $accountStatus, string $filter): bool
    {
        if ($filter === '') {
            return true;
        }

        if ($filter === 'paid') {
            return in_array($accountStatus, ['paid', 'clear', 'credit'], true);
        }

        return $accountStatus === $filter;
    }

    /**
     * @param  array<string, float>  ...$maps
     * @return array<string, float>
     */
    private function mergeCurrencyMaps(array ...$maps): array
    {
        $out = [];
        foreach ($maps as $map) {
            foreach ($map as $cur => $val) {
                $cu = strtoupper(trim((string) $cur));
                if ($cu === '') {
                    continue;
                }
                $out[$cu] = (float) ($out[$cu] ?? 0) + (float) $val;
            }
        }

        return AccountingAggregationService::normalizeCurrencyMap($out);
    }

    public function customerStatementDetail(Request $request, Client $client): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $invoicesQuery = Invoice::query()
            ->where('client_id', $client->id)
            ->with(['shipment.attachments', 'items', 'payments.shipment', 'payments.targetAccount', 'payments.sourceAccount'])
            ->orderByDesc('issue_date')
            ->orderByDesc('id');
        $this->applyCustomerInvoiceFilter($invoicesQuery);
        $invoices = $invoicesQuery->get();

        $rows = $invoices->map(function (Invoice $inv) {
            $computed = AccountingAggregationService::invoiceStatementTotals($inv);

            $paymentsChrono = $inv->payments
                ->sortBy(fn (Payment $p) => $p->paid_at?->getTimestamp() ?? 0)
                ->values();
            $sequenceByPaymentId = [];
            foreach ($paymentsChrono as $idx => $p) {
                $sequenceByPaymentId[$p->id] = $idx + 1;
            }
            $lastPaymentId = $paymentsChrono->last()?->id;
            $invoicePaymentCount = $paymentsChrono->count();

            $paymentHistory = $inv->payments
                ->sortByDesc(fn (Payment $p) => $p->paid_at?->toDateString() ?? '')
                ->values()
                ->map(static function (Payment $p) use ($inv, $computed, $sequenceByPaymentId, $lastPaymentId, $invoicePaymentCount): array {
                    $proofUrl = $p->proof_path ? Storage::disk('public')->url($p->proof_path) : null;
                    // Client receipts: receiving account is usually source_account_id (InvoiceController / PaymentController).
                    $recvAcct = $p->sourceAccount ?? $p->targetAccount;
                    $targetAccountLabel = null;
                    if ($recvAcct) {
                        $bank = trim((string) ($recvAcct->bank_name ?? ''));
                        $acct = trim((string) ($recvAcct->account_name ?? ''));
                        $targetAccountLabel = $acct !== '' ? $bank.' — '.$acct : ($bank !== '' ? $bank : null);
                    }
                    if ($targetAccountLabel === null) {
                        foreach ([$p->source_account_id, $p->target_account_id] as $accountId) {
                            if ($accountId) {
                                $ba = BankAccount::query()->find((int) $accountId);
                                if ($ba) {
                                    $bank = trim((string) ($ba->bank_name ?? ''));
                                    $acct = trim((string) ($ba->account_name ?? ''));
                                    $targetAccountLabel = $acct !== '' ? $bank.' — '.$acct : ($bank !== '' ? $bank : null);
                                    break;
                                }
                            }
                        }
                    }
                    if ($targetAccountLabel === null && $p->id) {
                        $te = TreasuryEntry::query()->where('payment_id', $p->id)->orderByDesc('id')->first();
                        $treasuryAccountId = $te?->account_id ?? $te?->counter_account_id;
                        if ($treasuryAccountId) {
                            $ba = BankAccount::query()->find((int) $treasuryAccountId);
                            if ($ba) {
                                $bank = trim((string) ($ba->bank_name ?? ''));
                                $acct = trim((string) ($ba->account_name ?? ''));
                                $targetAccountLabel = $acct !== '' ? $bank.' — '.$acct : ($bank !== '' ? $bank : null);
                            }
                        }
                    }
                    $shipmentRef = $p->shipment?->bl_number ?? $inv->shipment?->bl_number;
                    $shipMeta = $p->shipment ?? $inv->shipment;

                    $isFinalSettlingPayment = $computed['status'] === 'paid'
                        && $invoicePaymentCount > 0
                        && $lastPaymentId === $p->id;

                    return [
                        'id' => $p->id,
                        'amount' => (float) $p->amount,
                        'currency_code' => strtoupper((string) ($p->currency_code ?: 'USD')),
                        'method' => $p->method,
                        'paid_at' => $p->paid_at?->toDateString(),
                        'reference' => $p->reference,
                        'notes' => $p->notes,
                        'exchange_rate' => $p->exchange_rate !== null ? (float) $p->exchange_rate : null,
                        'converted_amount' => $p->converted_amount !== null ? (float) $p->converted_amount : null,
                        'target_currency_code' => $p->target_currency_code
                            ? strtoupper((string) $p->target_currency_code)
                            : null,
                        'proof_url' => $proofUrl,
                        'proof_filename' => $p->proof_path ? basename((string) $p->proof_path) : null,
                        'shipment_id' => $p->shipment_id,
                        'shipment_reference' => $shipmentRef,
                        'shipment_type' => $shipMeta?->shipment_type,
                        'booking_number' => $shipMeta?->booking_number,
                        'invoice_id' => $inv->id,
                        'invoice_reference' => $inv->invoice_number ?: ('INV-'.$inv->id),
                        'invoice_currency_code' => strtoupper((string) ($inv->currency_code ?: 'USD')),
                        'target_account_label' => $targetAccountLabel,
                        'payment_sequence' => $sequenceByPaymentId[$p->id] ?? null,
                        'invoice_payment_count' => $invoicePaymentCount,
                        'is_final_settling_payment' => $isFinalSettlingPayment,
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
                'shipment_type' => $inv->shipment?->shipment_type,
                'booking_number' => $inv->shipment?->booking_number,
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

        $advancePayments = PrepaidPaymentService::serializeAdvancePayments((int) $client->id);
        $prepaidBalance = PrepaidPaymentService::prepaidBalanceByCurrency((int) $client->id);

        return response()->json([
            'data' => [
                'customer_id' => $client->id,
                'customer_name' => $client->name,
                'phone' => $client->phone,
                'invoices' => $rows,
                'advance_payments' => $advancePayments,
                'prepaid_balance_by_currency' => $prepaidBalance,
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

    /**
     * Partner Statement: shipment cost lines for aggregation. Primary source is saved
     * {@see ShipmentCostInvoice} items (same as Shipment Financials / cost_total); legacy
     * {@see Expense} rows are used only when a shipment has no cost invoice with positive lines.
     */
    public function partnerStatementShipmentCosts(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view partner statement shipment costs.')
        );

        $lines = [];
        $shipmentsWithInvoiceLines = [];

        if (Schema::hasTable('shipment_cost_invoices')) {
            $invoices = ShipmentCostInvoice::query()
                ->with([
                    'shipment' => fn ($q) => $q->with('lineVendor:id,name')->select([
                        'id',
                        'bl_number',
                        'line_vendor_id',
                        'shipment_type',
                        'booking_number',
                        'acid_number',
                        'booking_date',
                        'is_reefer',
                    ]),
                ])
                ->get(['shipment_id', 'items']);

            foreach ($invoices as $inv) {
                $items = is_array($inv->items) ? $inv->items : [];
                $shipment = $inv->shipment;
                $bl = $shipment?->bl_number ?? '';
                $sid = (int) $inv->shipment_id;

                $hasPositiveLine = false;
                foreach ($items as $it) {
                    $amt = (float) ($it['amount'] ?? 0);
                    if (! is_finite($amt) || $amt <= 0) {
                        continue;
                    }
                    $hasPositiveLine = true;
                    $bucketId = (string) ($it['bucket_id'] ?? 'other');
                    $vidRaw = $it['vendor_id'] ?? null;
                    $vid = null;
                    if ($vidRaw !== null && $vidRaw !== '') {
                        $vidNum = (int) $vidRaw;
                        $vid = $vidNum > 0 ? $vidNum : null;
                    }

                    $title = isset($it['title']) ? trim((string) $it['title']) : '';
                    $desc = isset($it['description']) ? trim((string) $it['description']) : '';
                    $lbl = isset($it['label']) ? trim((string) $it['label']) : '';
                    $name = isset($it['name']) ? trim((string) $it['name']) : '';
                    $display = $lbl !== '' ? $lbl : ($name !== '' ? $name : ($title !== '' ? $title : $desc));

                    $tplRaw = $it['template_id'] ?? null;
                    $templateId = $tplRaw !== null && $tplRaw !== '' ? (string) $tplRaw : null;

                    $lines[] = [
                        'id' => isset($it['line_id']) ? (int) $it['line_id'] : null,
                        'shipment_id' => $sid,
                        'bl_number' => $bl,
                        'shipment_type' => $shipment?->shipment_type,
                        'booking_number' => $shipment?->booking_number,
                        'acid_number' => $shipment?->acid_number,
                        'booking_date' => $shipment?->booking_date?->toDateString(),
                        'is_reefer' => (bool) ($shipment?->is_reefer ?? false),
                        'category_name' => '',
                        'description' => $display,
                        'title' => $title !== '' ? $title : null,
                        'label' => $lbl !== '' ? $lbl : null,
                        'name' => $name !== '' ? $name : null,
                        'template_id' => $templateId,
                        'amount' => $amt,
                        'currency_code' => strtoupper((string) ($it['currency_code'] ?? 'USD')),
                        'vendor_id' => $vid,
                        'vendor_name' => '',
                        'bucket_id' => $bucketId,
                        'expense_date' => $it['expense_date'] ?? null,
                        'invoice_number' => null,
                        '_source' => 'cost_invoice',
                    ];
                }

                if ($hasPositiveLine) {
                    $shipmentsWithInvoiceLines[$sid] = true;
                }
            }
        }

        $expenseQuery = Expense::query()
            ->whereNotNull('shipment_id')
            ->with([
                'category',
                'vendor',
                'shipment' => fn ($q) => $q->select([
                    'id',
                    'bl_number',
                    'shipment_type',
                    'booking_number',
                    'acid_number',
                    'booking_date',
                    'is_reefer',
                ]),
            ]);

        if ($shipmentsWithInvoiceLines !== []) {
            $expenseQuery->whereNotIn('shipment_id', array_keys($shipmentsWithInvoiceLines));
        }

        $expenses = $expenseQuery
            ->orderBy('expense_date')
            ->orderBy('id')
            ->get();

        foreach ($expenses as $expense) {
            $amt = (float) $expense->amount;
            if (! is_finite($amt) || $amt <= 0) {
                continue;
            }
            $catName = trim((string) ($expense->category?->name ?? ''));
            $expDesc = trim((string) ($expense->description ?? ''));
            $expDisplay = $expDesc !== '' ? $expDesc : $catName;

            $lines[] = [
                'id' => $expense->id,
                'shipment_id' => $expense->shipment_id,
                'bl_number' => $expense->shipment?->bl_number ?? '',
                'shipment_type' => $expense->shipment?->shipment_type,
                'booking_number' => $expense->shipment?->booking_number,
                'acid_number' => $expense->shipment?->acid_number,
                'booking_date' => $expense->shipment?->booking_date?->toDateString(),
                'is_reefer' => (bool) ($expense->shipment?->is_reefer ?? false),
                'category_name' => $catName,
                'description' => $expDisplay,
                'title' => $expDesc !== '' ? $expDesc : null,
                'label' => null,
                'name' => null,
                'template_id' => null,
                'amount' => $amt,
                'currency_code' => $expense->currency_code,
                'vendor_id' => $expense->vendor_id,
                'vendor_name' => $expense->vendor?->name ?? '',
                'bucket_id' => null,
                'expense_date' => $expense->expense_date?->toDateString(),
                'invoice_number' => $expense->invoice_number,
                '_source' => 'expense',
            ];
        }

        $shipmentIds = [];
        $lineVendorIds = [];
        foreach ($lines as $ln) {
            $sid = (int) ($ln['shipment_id'] ?? 0);
            if ($sid > 0) {
                $shipmentIds[] = $sid;
            }
            $v = (int) ($ln['vendor_id'] ?? 0);
            if ($v > 0) {
                $lineVendorIds[] = $v;
            }
        }
        $shipmentIds = array_values(array_unique(array_filter($shipmentIds)));

        [$contexts, $vendorNames, $vendorTypes] = $this->buildAccountingPartnerContextsForShipments($shipmentIds, $lineVendorIds);

        return response()->json([
            'data' => [
                'lines' => $lines,
                'contexts' => $contexts,
                'vendor_names' => $vendorNames,
                'vendor_types' => $vendorTypes,
            ],
        ]);
    }

    /**
     * @param  list<int>  $ids
     * @param  list<int>  $extraVendorIdsForLabels
     * @return array{0: array<string, array<string, mixed>>, 1: array<string, string>, 2: array<string, string>}
     */
    private function buildAccountingPartnerContextsForShipments(array $ids, array $extraVendorIdsForLabels = []): array
    {
        $ids = array_values(array_unique(array_filter(array_map(static fn ($id) => (int) $id, $ids))));
        $ids = array_values(array_filter($ids, static fn (int $id) => $id > 0));

        if ($ids === []) {
            return [[], [], []];
        }

        $shipments = Shipment::query()
            ->whereIn('id', $ids)
            ->with(['lineVendor:id,name'])
            ->get(['id', 'line_vendor_id']);

        $invoiceByShipmentId = collect();
        if (Schema::hasTable('shipment_cost_invoices')) {
            $invoiceByShipmentId = ShipmentCostInvoice::query()
                ->whereIn('shipment_id', $ids)
                ->get(['shipment_id', 'section_meta'])
                ->keyBy('shipment_id');
        }

        $vendorIdsForLabels = [];
        foreach ($extraVendorIdsForLabels as $ev) {
            $v = (int) $ev;
            if ($v > 0) {
                $vendorIdsForLabels[] = $v;
            }
        }

        $contexts = [];
        foreach ($shipments as $shipment) {
            $lineVid = $shipment->line_vendor_id ? (int) $shipment->line_vendor_id : null;
            if ($lineVid !== null && $lineVid > 0) {
                $vendorIdsForLabels[] = $lineVid;
            }

            $invoice = $invoiceByShipmentId->get($shipment->id);
            $sectionMeta = is_array($invoice?->section_meta) ? $invoice->section_meta : [];

            foreach (self::vendorIdsFromSectionMetaForAccounting($sectionMeta) as $vid) {
                $vendorIdsForLabels[] = $vid;
            }

            $contexts[(string) $shipment->id] = [
                'line_vendor_id' => $lineVid,
                'line_vendor_name' => $shipment->lineVendor?->name,
                'section_meta' => $sectionMeta,
            ];
        }

        $vendorIdsForLabels = array_values(array_unique(array_filter($vendorIdsForLabels)));
        $vendorNames = [];
        $vendorTypes = [];
        if ($vendorIdsForLabels !== []) {
            $vendorRows = Vendor::query()
                ->whereIn('id', $vendorIdsForLabels)
                ->get(['id', 'name', 'type']);
            foreach ($vendorRows as $v) {
                $vendorNames[(string) $v->id] = $v->name;
                $vendorTypes[(string) $v->id] = $v->type ? (string) $v->type : 'other';
            }
        }

        return [$contexts, $vendorNames, $vendorTypes];
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return list<int>
     */
    private static function vendorIdsFromSectionMetaForAccounting(array $meta): array
    {
        $ids = [];
        foreach ($meta as $block) {
            if (! is_array($block)) {
                continue;
            }
            foreach ($block as $k => $v) {
                if (! is_string($k)) {
                    continue;
                }
                if ($k === 'vendor_id' || str_ends_with($k, '_vendor_id')) {
                    $id = (int) $v;
                    if ($id > 0) {
                        $ids[] = $id;
                    }
                }
            }
        }

        return $ids;
    }
}
