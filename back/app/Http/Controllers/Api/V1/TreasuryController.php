<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Currency;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\ShipmentCostInvoice;
use App\Models\TreasuryEntry;
use App\Services\AccountingAggregationService;
use App\Services\BankPaymentCurrencyService;
use App\Services\CbeOfficialExchangeRateService;
use App\Services\TreasuryAccountCurrencyService;
use App\Services\TreasuryJournalPostingService;
use App\Services\TreasuryLedgerBalanceService;
use App\Services\TreasuryOfficialFxRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TreasuryController extends Controller
{
    public function __construct(
        private TreasuryLedgerBalanceService $ledgerBalance,
        private TreasuryOfficialFxRateService $officialFx,
        private TreasuryJournalPostingService $journalPosting,
    ) {}

    /**
     * Block debits when the bank leg does not have enough raw balance in that currency.
     *
     * @param  array<string, mixed>  $validated
     */
    private function assertSufficientBankBalance(array $validated, ?int $excludeEntryId = null): ?JsonResponse
    {
        return $this->ledgerBalance->assertSufficientBankBalanceForEntryPayload($validated, $excludeEntryId);
    }

    /**
     * @param  array<string, float>  $map
     * @return array<string, float>
     */
    private function roundMoneyMap(array $map): array
    {
        $out = [];
        foreach ($map as $k => $v) {
            $out[strtoupper((string) $k)] = round((float) $v, 2);
        }

        return $out;
    }

    /**
     * @param  array<string, float>  $map
     * @return array<string, float>
     */
    private function clampMoneyMapNonNegative(array $map): array
    {
        $out = [];
        foreach ($map as $k => $v) {
            $out[strtoupper((string) $k)] = round(max(0.0, (float) $v), 2);
        }

        return $out;
    }

    /**
     * Sum every persisted payment of a given type, grouped by uppercase currency code.
     * Single source of truth for the dashboard: actual payments only, never derived from treasury entries.
     *
     * @return array<string, float>
     */
    private function sumPaymentsByCurrency(string $paymentType): array
    {
        $rows = Payment::query()
            ->where('type', $paymentType)
            ->get(['amount', 'currency_code']);

        $totals = [];
        foreach ($rows as $row) {
            $cur = strtoupper(trim((string) ($row->currency_code ?? '')));
            if ($cur === '') {
                $cur = 'USD';
            }
            $totals[$cur] = (float) ($totals[$cur] ?? 0) + (float) $row->amount;
        }

        return $this->roundMoneyMap($totals);
    }

    /**
     * Partner liabilities = approved {@see ShipmentCostInvoice} totals MINUS actual partner payments,
     * grouped per currency, clamped to ≥ 0. Drafts and cancelled invoices are excluded.
     * Aligned with Partner Statement / Shipment Financials (cost_total) — a single source of truth
     * for partner obligations, replacing the legacy {@see VendorBill}-based derivation.
     *
     * @param  array<string, float>  $partnerPaidByCurrency  Already grouped per uppercase currency code.
     * @return array<string, float>
     */
    private function partnerLiabilitiesFromCostInvoices(array $partnerPaidByCurrency): array
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            return [];
        }

        $billed = [];

        $invoices = ShipmentCostInvoice::query()
            ->whereNotIn('status', ['draft', 'cancelled'])
            ->get(['currency_totals', 'items']);

        foreach ($invoices as $invoice) {
            $totals = is_array($invoice->currency_totals) ? $invoice->currency_totals : [];

            // Fallback: rebuild from items[] when currency_totals wasn't persisted on legacy rows.
            if (empty($totals)) {
                foreach (is_array($invoice->items) ? $invoice->items : [] as $item) {
                    $cur = strtoupper(trim((string) ($item['currency_code'] ?? 'USD')));
                    if ($cur === '') {
                        $cur = 'USD';
                    }
                    $amt = (float) ($item['amount'] ?? 0);
                    if (! is_finite($amt) || $amt <= 0) {
                        continue;
                    }
                    $totals[$cur] = (float) ($totals[$cur] ?? 0) + $amt;
                }
            }

            foreach ($totals as $cur => $amt) {
                $code = strtoupper(trim((string) $cur));
                if ($code === '') {
                    continue;
                }
                $billed[$code] = (float) ($billed[$code] ?? 0) + (float) $amt;
            }
        }

        $remaining = [];
        $currencies = array_unique(array_merge(array_keys($billed), array_keys($partnerPaidByCurrency)));
        foreach ($currencies as $cur) {
            $code = strtoupper(trim((string) $cur));
            if ($code === '') {
                continue;
            }
            $remaining[$code] = (float) ($billed[$code] ?? 0) - (float) ($partnerPaidByCurrency[$code] ?? 0);
        }

        return $this->clampMoneyMapNonNegative($remaining);
    }

    /**
     * Sum per-currency ledger balances into the system default currency using {@see Currency::$exchange_rate}
     * (units of default currency per one unit of that code — same convention as {@see BankPaymentCurrencyService}).
     * Ledger figures already reflect net treasury position including customer receipts and partner payments.
     *
     * @param  array<string, float>  $balanceDisplay
     * @return array{currency: string, amount: float}|null
     */
    private function totalBalanceInDefaultCurrency(array $balanceDisplay): ?array
    {
        if (! Schema::hasTable('currencies')) {
            return null;
        }

        $default = Currency::query()
            ->where('is_active', true)
            ->where('is_default', true)
            ->first();

        if (! $default) {
            return null;
        }

        $defaultCode = strtoupper(trim((string) $default->code));
        if ($defaultCode === '') {
            return null;
        }

        if ($balanceDisplay === []) {
            return ['currency' => $defaultCode, 'amount' => 0.0];
        }

        $sum = 0.0;
        foreach ($balanceDisplay as $curRaw => $amt) {
            $cur = strtoupper(trim((string) $curRaw));
            if ($cur === '') {
                continue;
            }

            $row = Currency::query()->whereRaw('UPPER(code) = ?', [$cur])->first();
            if (! $row) {
                return null;
            }

            $rate = (float) ($row->exchange_rate ?? 0);
            if ($rate <= 0 || ! is_finite($rate)) {
                return null;
            }

            $sum += (float) $amt * $rate;
        }

        return [
            'currency' => $defaultCode,
            'amount' => round($sum, 2),
        ];
    }

    /**
     * Per-bank balances (from ledger), customer vs partner splits, non-negative display balances.
     */
    public function bankOverview(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view treasury bank overview.')
        );

        $banks = BankAccount::query()
            ->where('is_active', true)
            ->orderBy('bank_name')
            ->orderBy('account_name')
            ->get();

        $entries = TreasuryEntry::query()
            ->with([
                'payment.invoice',
                'payment.shipment',
                'payment.vendorBill',
            ])
            ->orderBy('entry_date')
            ->orderBy('id')
            ->get();

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesByAccount();

        $bankPayload = [];
        foreach ($banks as $bank) {
            $idKey = (string) $bank->id;
            $rawMap = $balancesByAccount[$idKey] ?? [];
            $balanceRaw = [];
            foreach ($rawMap as $cur => $val) {
                $balanceRaw[$this->ledgerBalance->normalizeCurrency((string) $cur)] = round((float) $val, 2);
            }

            $balanceDisplay = [];
            foreach ($balanceRaw as $cur => $val) {
                if ($val < 0) {
                    Log::debug('Treasury ledger discrepancy: negative raw balance before clamp', [
                        'bank_id' => $bank->id,
                        'currency' => $cur,
                        'raw_balance' => $val,
                    ]);
                    $balanceDisplay[$cur] = 0.0;
                } else {
                    $balanceDisplay[$cur] = $val;
                }
            }

            $customerIn = [];
            $partnerOut = [];
            foreach ($entries as $entry) {
                if ((int) $entry->account_id !== (int) $bank->id) {
                    continue;
                }
                $pay = $entry->payment;
                $currency = $this->ledgerBalance->normalizeCurrency((string) $entry->currency_code);
                $amt = (float) $entry->amount;
                $type = strtolower((string) $entry->entry_type);
                if ($pay && $pay->type === 'client_receipt' && $type === 'in') {
                    $customerIn[$currency] = ($customerIn[$currency] ?? 0) + $amt;
                }
                if ($pay && $pay->type === 'vendor_payment' && $type === 'out') {
                    $partnerOut[$currency] = ($partnerOut[$currency] ?? 0) + $amt;
                }
            }

            $kind = strtolower(trim((string) ($bank->treasury_account_kind ?? '')));
            if ($kind === '') {
                $kind = BankAccount::TREASURY_KIND_BANK;
            }

            $bankPayload[] = [
                'id' => $bank->id,
                'bank_name' => $bank->bank_name,
                'account_name' => $bank->account_name,
                'name_ar' => $bank->name_ar,
                'name_en' => $bank->name_en,
                'display_name' => $bank->primaryDisplayName(),
                'account_number' => $bank->account_number,
                'iban' => $bank->iban ?? null,
                'supported_currencies' => is_array($bank->supported_currencies) ? $bank->supported_currencies : [],
                'treasury_account_kind' => $kind,
                'cash_wallet_kind' => $bank->cash_wallet_kind,
                'account_type' => BankAccount::normalizeOperationalAccountType($bank->cash_wallet_kind),
                'notes' => $bank->notes,
                'allowed_currencies' => $bank->allowedTreasuryCurrencyCodes(),
                'balance_by_currency' => $this->roundMoneyMap($balanceDisplay),
                'customer_in_by_currency' => $this->roundMoneyMap($customerIn),
                'partner_out_by_currency' => $this->roundMoneyMap($partnerOut),
                'total_balance_in_default' => $this->totalBalanceInDefaultCurrency($balanceDisplay),
            ];
        }

        $sumMaps = static function (array $rows, string $key): array {
            $out = [];
            foreach ($rows as $row) {
                $map = $row[$key] ?? [];
                if (! is_array($map)) {
                    continue;
                }
                foreach ($map as $c => $v) {
                    $cu = strtoupper((string) $c);
                    $out[$cu] = (float) ($out[$cu] ?? 0) + (float) $v;
                }
            }

            return array_map(fn (float $x) => round($x, 2), $out);
        };

        // Bank totals — only authoritative source is the ledger; sum every bank's display balance per currency.
        $globalBalanceDisplay = $sumMaps($bankPayload, 'balance_by_currency');

        // Customer receipts & partner payments — pull straight from the payments table (single source of truth),
        // not from the per-bank entry-derived maps. Avoids any double-counting via paired transfer legs.
        $globalCustomer = $this->sumPaymentsByCurrency('client_receipt');
        $globalPartner = $this->sumPaymentsByCurrency('vendor_payment');

        // Customer outstanding receivables — sum of unpaid/partial invoices, grouped per currency.
        $openInvoices = Invoice::query()
            ->with('items')
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->get();
        $arAgg = AccountingAggregationService::aggregateInvoices($openInvoices);
        $customerOutstandingReceivables = $this->clampMoneyMapNonNegative($arAgg['total_remaining_per_currency']);

        // Partner liabilities (amounts owed to partners) — approved cost invoice totals minus vendor payments,
        // grouped per currency. Matches Shipment Financials / Partner Statement (not legacy VendorBill).
        $partnerLiabilitiesOutstanding = $this->partnerLiabilitiesFromCostInvoices($globalPartner);

        $bankAccountsOnly = array_values(array_filter(
            $bankPayload,
            static fn (array $row): bool => ($row['treasury_account_kind'] ?? BankAccount::TREASURY_KIND_BANK) === BankAccount::TREASURY_KIND_BANK
        ));
        $cashWalletsOnly = array_values(array_filter(
            $bankPayload,
            static fn (array $row): bool => ($row['treasury_account_kind'] ?? BankAccount::TREASURY_KIND_BANK) === BankAccount::TREASURY_KIND_CASH_WALLET
        ));

        // Global aggregates align with treasury statement categories: Customer Receipts, Customer Receivables,
        // Partner Payments, Partner Liabilities (amounts owed to partners — cost invoices net of vendor payments).
        return response()->json([
            'data' => [
                'global' => [
                    'total_balance_by_currency' => $globalBalanceDisplay,
                    'total_customer_in_by_currency' => $globalCustomer,
                    'total_partner_out_by_currency' => $globalPartner,
                    'customer_outstanding_receivables_by_currency' => $customerOutstandingReceivables,
                    'partner_liabilities_outstanding_by_currency' => $partnerLiabilitiesOutstanding,
                ],
                'bank_accounts' => $bankAccountsOnly,
                'cash_wallets' => $cashWalletsOnly,
                'banks' => $bankPayload,
            ],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view treasury summary.')
        );

        $months = max(1, (int) $request->query('months', 6));
        $from = now()->subMonths($months - 1)->startOfMonth();

        $entries = TreasuryEntry::query()
            ->whereDate('entry_date', '>=', $from)
            ->get();

        $byCurrency = $entries->groupBy('currency_code');

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesFromEntries($entries);

        $cashBalance = 0.0;
        $bankBalance = 0.0;
        $bankBalances = [];
        $bankAccounts = BankAccount::query()->get()->keyBy('id');
        foreach ($balancesByAccount as $accountId => $currencyMap) {
            foreach ($currencyMap as $currency => $value) {
                if (is_numeric($accountId) && isset($bankAccounts[(int) $accountId])) {
                    $bankBalance += (float) $value;
                    $bank = $bankAccounts[(int) $accountId];
                    $bankBalances[] = [
                        'account_id' => $bank->id,
                        'bank_name' => $bank->bank_name,
                        'account_name' => $bank->account_name,
                        'account_number' => $bank->account_number,
                        'currency_code' => $currency,
                        'balance' => (float) $value,
                    ];
                } else {
                    $cashBalance += (float) $value;
                }
            }
        }

        $monthsCursor = $from->copy();
        $labels = [];
        $inboundSeries = [];
        $outboundSeries = [];
        $balanceSeries = [];
        $runningBalance = 0.0;

        while ($monthsCursor <= now()) {
            $monthKey = $monthsCursor->format('Y-m');

            $monthEntries = $entries->filter(function (TreasuryEntry $entry) use ($monthKey) {
                return $entry->entry_date?->format('Y-m') === $monthKey;
            });

            $in = (float) $monthEntries->where('entry_type', 'in')->sum('amount');
            $out = (float) $monthEntries->where('entry_type', 'out')->sum('amount');

            $runningBalance += $in - $out;

            $labels[] = $monthKey;
            $inboundSeries[] = $in;
            $outboundSeries[] = $out;
            $balanceSeries[] = $runningBalance;

            $monthsCursor->addMonth();
        }

        $monthStart = now()->copy()->startOfMonth();

        $monthlyExpenses = Expense::query()
            ->whereDate('expense_date', '>=', $monthStart)
            ->sum('amount');

        return response()->json([
            'data' => [
                'totals' => [
                    'cash_balance' => $cashBalance,
                    'bank_balance' => $bankBalance,
                    'monthly_expenses' => (float) $monthlyExpenses,
                ],
                'bank_balances' => $bankBalances,
                'cash_flow' => [
                    'labels' => $labels,
                    'inbound' => $inboundSeries,
                    'outbound' => $outboundSeries,
                ],
                'balance' => [
                    'labels' => $labels,
                    'balance' => $balanceSeries,
                ],
            ],
        ]);
    }

    public function entries(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view treasury entries.')
        );

        $query = TreasuryEntry::query()->with([
            'payment.invoice',
            'payment.shipment',
            'payment.vendorBill',
            'expense.category',
        ]);

        if ($type = $request->query('type')) {
            $query->where('entry_type', $type);
        }
        if ($bankAccountId = $request->query('bank_account_id')) {
            $id = (int) $bankAccountId;
            if ($id > 0) {
                // Primary ledger leg only — avoids duplicate rows per transfer (out on source, in on target).
                $query->where('account_id', $id);
            }
        }
        if ($account = $request->query('account')) {
            $query->where('source', $account);
        }
        if ($currency = $request->query('currency')) {
            $query->where('currency_code', strtoupper((string) $currency));
        }

        if ($from = $request->query('from')) {
            $query->whereDate('entry_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('entry_date', '<=', $to);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('reference', 'like', '%'.$search.'%')
                    ->orWhere('notes', 'like', '%'.$search.'%');
            });
        }

        $sort = $request->query('sort', 'date');

        if ($sort === 'amount') {
            $query->orderByDesc('amount');
        } else {
            $query->orderByDesc('entry_date');
        }

        $entries = $query->get();

        $rows = $entries->map(function (TreasuryEntry $entry): array {
            $type = strtolower((string) $entry->entry_type);
            $sign = in_array($type, ['out', 'transfer', 'exchange'], true) ? -1 : 1;

            $pay = $entry->payment;
            $paymentType = $pay ? (string) $pay->type : null;
            $flowType = 'internal';
            if ($paymentType === 'client_receipt') {
                $flowType = 'customer';
            } elseif ($paymentType === 'vendor_payment') {
                $flowType = 'partner';
            } elseif (($entry->source ?? '') === 'expense'
                || (string) ($entry->journal_kind ?? '') === TreasuryJournalPostingService::KIND_EXPENSE
                || $entry->expense_id) {
                $flowType = 'expense';
            } elseif (! $entry->payment_id) {
                $flowType = $type === 'transfer' ? 'transfer' : 'manual';
            }

            $refLabel = '';
            if ($pay) {
                if ($pay->relationLoaded('invoice') && $pay->invoice) {
                    $refLabel = (string) ($pay->invoice->invoice_number ?? '');
                } elseif ($pay->relationLoaded('vendorBill') && $pay->vendorBill) {
                    $refLabel = (string) ($pay->vendorBill->bill_number ?? '');
                }
                if ($refLabel === '' && $pay->relationLoaded('shipment') && $pay->shipment?->bl_number) {
                    $refLabel = (string) $pay->shipment->bl_number;
                }
                if ($refLabel === '' && $pay->reference) {
                    $refLabel = (string) $pay->reference;
                }
            }
            if ($refLabel === '' && $entry->reference) {
                $refLabel = (string) $entry->reference;
            }
            if ($refLabel === '' && (($entry->source ?? '') === 'expense'
                || (string) ($entry->journal_kind ?? '') === TreasuryJournalPostingService::KIND_EXPENSE)) {
                $refFromReference = trim((string) ($entry->reference ?? ''));
                if ($refFromReference !== '') {
                    $refLabel = 'Expense #'.$refFromReference;
                } elseif ($entry->expense_id) {
                    $refLabel = 'Expense #'.(string) $entry->expense_id;
                }
            } elseif ($refLabel === '' && $entry->expense_id) {
                $refLabel = 'Expense #'.(string) $entry->expense_id;
            }

            $isVoided = (bool) ($entry->is_voided ?? false);
            $ledgerAmount = $isVoided ? 0.0 : (float) $entry->amount;

            return [
                'id' => $entry->id,
                'entry_date' => $entry->entry_date?->toDateString(),
                'description' => $entry->notes ?? $entry->reference ?? '',
                'entry_type' => $entry->entry_type,
                'amount' => $sign * $ledgerAmount,
                'voided_original_amount' => $isVoided ? $sign * (float) $entry->amount : null,
                'currency_code' => $entry->currency_code,
                'source' => $entry->source,
                'account_id' => $entry->account_id,
                'counter_account_id' => $entry->counter_account_id,
                'payment_id' => $entry->payment_id,
                'expense_id' => $entry->expense_id,
                'invoice_id' => $pay?->invoice_id,
                'shipment_id' => $pay?->shipment_id,
                'vendor_bill_id' => $pay?->vendor_bill_id,
                'payment_type' => $paymentType,
                'flow_type' => $flowType,
                'is_voided' => $isVoided,
                'voided_at' => $entry->voided_at?->toIso8601String(),
                'reference_label' => $refLabel,
                'target_currency_code' => $entry->target_currency_code,
                'exchange_rate' => $entry->exchange_rate,
                'exchange_rate_source' => $entry->exchange_rate_source,
                'converted_amount' => $entry->converted_amount,
                'journal_transaction_id' => $entry->journal_transaction_id,
                'journal_kind' => $entry->journal_kind,
                'ledger_side' => $entry->ledger_side,
            ];
        });

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function expenses(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view expenses.')
        );

        $query = Expense::query()->with('category');

        if ($categoryId = $request->query('category_id')) {
            $query->where('expense_category_id', $categoryId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('expense_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('expense_date', '<=', $to);
        }

        if ($search = $request->query('search')) {
            $query->where('description', 'like', '%'.$search.'%');
        }

        $sort = $request->query('sort', 'date');

        if ($sort === 'amount') {
            $query->orderByDesc('amount');
        } else {
            $query->orderByDesc('expense_date');
        }

        $expenses = $query->get();

        $rows = $expenses->map(static function (Expense $expense): array {
            return [
                'id' => $expense->id,
                'expense_date' => $expense->expense_date?->toDateString(),
                'description' => $expense->description,
                'category_name' => $expense->category?->name ?? '',
                'amount' => (float) $expense->amount,
                'currency_code' => $expense->currency_code,
            ];
        });

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function storeEntry(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to create treasury entries.')
        );

        $validated = $request->validate([
            'entry_type' => ['required', 'in:in,out,transfer,exchange'],
            'source' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'counter_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3'],
            'target_currency_code' => ['nullable', 'string', 'size:3'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'converted_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_id' => ['nullable', 'integer', 'exists:payments,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            TreasuryAccountCurrencyService::assertTreasuryEntryCurrencies($validated);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?? __('Validation failed.'),
                'errors' => $e->errors(),
            ], 422);
        }

        if ($fail = $this->assertSufficientBankBalance($validated)) {
            return $fail;
        }

        $entry = new TreasuryEntry;
        $entry->entry_type = $validated['entry_type'];
        $entry->source = $validated['source'] ?? null;
        $entry->account_id = $validated['account_id'] ?? null;
        $entry->counter_account_id = $validated['counter_account_id'] ?? null;
        $entry->amount = $validated['amount'];
        $entry->currency_code = $validated['currency_code'];
        $entry->target_currency_code = $validated['target_currency_code'] ?? null;
        $entry->exchange_rate = $validated['exchange_rate'] ?? null;
        $entry->converted_amount = $validated['converted_amount'] ?? null;
        $entry->payment_id = $validated['payment_id'] ?? null;
        $entry->reference = $validated['description'] ?? null;
        $entry->notes = $validated['notes'] ?? null;
        $entry->entry_date = $validated['entry_date'];
        $entry->created_by_id = $request->user()->id;
        $entryTypeLower = strtolower((string) $validated['entry_type']);
        $entry->journal_transaction_id = (string) Str::uuid();
        $entry->journal_kind = TreasuryJournalPostingService::KIND_MANUAL;
        $entry->ledger_side = match ($entryTypeLower) {
            'in' => TreasuryJournalPostingService::SIDE_DEBIT,
            'out' => TreasuryJournalPostingService::SIDE_CREDIT,
            default => null,
        };
        $entry->save();

        return response()->json([
            'data' => $entry,
        ], 201);
    }

    public function updateEntry(Request $request, TreasuryEntry $treasury_entry): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to update treasury entries.')
        );

        $validated = $request->validate([
            'entry_type' => ['sometimes', 'in:in,out,transfer,exchange'],
            'source' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'counter_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
            'target_currency_code' => ['nullable', 'string', 'size:3'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'converted_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_id' => ['nullable', 'integer', 'exists:payments,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('entry_type', $validated)) {
            $treasury_entry->entry_type = $validated['entry_type'];
        }
        if (array_key_exists('source', $validated)) {
            $treasury_entry->source = $validated['source'];
        }
        if (array_key_exists('account_id', $validated)) {
            $treasury_entry->account_id = $validated['account_id'];
        }
        if (array_key_exists('counter_account_id', $validated)) {
            $treasury_entry->counter_account_id = $validated['counter_account_id'];
        }
        if (array_key_exists('amount', $validated)) {
            $treasury_entry->amount = $validated['amount'];
        }
        if (array_key_exists('currency_code', $validated)) {
            $treasury_entry->currency_code = $validated['currency_code'];
        }
        if (array_key_exists('target_currency_code', $validated)) {
            $treasury_entry->target_currency_code = $validated['target_currency_code'];
        }
        if (array_key_exists('exchange_rate', $validated)) {
            $treasury_entry->exchange_rate = $validated['exchange_rate'];
        }
        if (array_key_exists('converted_amount', $validated)) {
            $treasury_entry->converted_amount = $validated['converted_amount'];
        }
        if (array_key_exists('payment_id', $validated)) {
            $treasury_entry->payment_id = $validated['payment_id'];
        }
        if (array_key_exists('description', $validated)) {
            $treasury_entry->reference = $validated['description'];
        }
        if (array_key_exists('entry_date', $validated)) {
            $treasury_entry->entry_date = $validated['entry_date'];
        }
        if (array_key_exists('notes', $validated)) {
            $treasury_entry->notes = $validated['notes'];
        }

        $mergedForCurrencyCheck = [
            'entry_type' => $treasury_entry->entry_type,
            'account_id' => $treasury_entry->account_id,
            'counter_account_id' => $treasury_entry->counter_account_id,
            'currency_code' => $treasury_entry->currency_code,
            'target_currency_code' => $treasury_entry->target_currency_code,
        ];
        try {
            TreasuryAccountCurrencyService::assertTreasuryEntryCurrencies($mergedForCurrencyCheck);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?? __('Validation failed.'),
                'errors' => $e->errors(),
            ], 422);
        }

        $mergedForDebitCheck = [
            'entry_type' => $treasury_entry->entry_type,
            'account_id' => $treasury_entry->account_id,
            'amount' => $treasury_entry->amount,
            'currency_code' => $treasury_entry->currency_code,
        ];
        if ($fail = $this->assertSufficientBankBalance($mergedForDebitCheck, $treasury_entry->id)) {
            return $fail;
        }

        $treasury_entry->save();

        return response()->json([
            'data' => $treasury_entry,
        ]);
    }

    public function destroyEntry(Request $request, TreasuryEntry $treasury_entry): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to delete treasury entries.')
        );

        $treasury_entry->delete();

        return response()->json([
            'message' => __('Treasury entry deleted.'),
        ]);
    }

    public function storeTransfer(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to create transfers.')
        );

        $validated = $request->validate([
            'from_account' => ['required', 'string', 'max:255'],
            'to_account' => ['required', 'string', 'max:255', 'different:from_account'],
            'from_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'to_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id', 'different:from_account_id'],
            'from_amount' => ['required', 'numeric', 'min:0'],
            'from_currency' => ['required', 'string', 'size:3'],
            'to_amount' => ['nullable', 'numeric', 'min:0'],
            'to_currency' => ['nullable', 'string', 'size:3'],
            'fx_rate' => ['nullable', 'numeric', 'gt:0'],
            'exchange_rate_source' => ['nullable', 'string', 'in:AUTO,MANUAL'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
        ]);

        $userId = $request->user()->id;
        $fromCurrency = strtoupper($validated['from_currency']);
        $toCurrency = strtoupper((string) ($validated['to_currency'] ?? $fromCurrency));

        $explicitSource = isset($validated['exchange_rate_source'])
            ? strtoupper(trim((string) $validated['exchange_rate_source']))
            : '';

        $fxRate = null;
        $toAmount = (float) $validated['from_amount'];
        $storedSource = null;

        if ($fromCurrency !== $toCurrency) {
            if ($explicitSource === 'AUTO') {
                try {
                    $mult = $this->officialFx->multiplier($fromCurrency, $toCurrency);
                } catch (ValidationException $e) {
                    return response()->json([
                        'message' => collect($e->errors())->flatten()->first() ?? __('Validation failed.'),
                        'errors' => $e->errors(),
                    ], 422);
                }
                $fxRate = round($mult, 8);
                $toAmount = round((float) $validated['from_amount'] * $mult, 2);
                $storedSource = 'AUTO';
            } else {
                if (empty($validated['fx_rate'])) {
                    return response()->json([
                        'message' => __('Manual exchange rate is required for cross-currency transfers.'),
                    ], 422);
                }
                $fxRate = round((float) $validated['fx_rate'], 8);
                $toAmount = isset($validated['to_amount'])
                    ? round((float) $validated['to_amount'], 2)
                    : round((float) $validated['from_amount'] * $fxRate, 2);
                $storedSource = 'MANUAL';
            }
        }

        $fromAccountId = isset($validated['from_account_id']) ? (int) $validated['from_account_id'] : 0;
        $toAccountId = isset($validated['to_account_id']) ? (int) $validated['to_account_id'] : 0;

        try {
            TreasuryAccountCurrencyService::assertTransferCurrencies(
                $fromAccountId,
                $toAccountId,
                $fromCurrency,
                $toCurrency
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?? __('Validation failed.'),
                'errors' => $e->errors(),
            ], 422);
        }

        if ($fromAccountId > 0) {
            try {
                $this->ledgerBalance->ensureDebitDoesNotOverdraft(
                    $fromAccountId,
                    $fromCurrency,
                    (float) $validated['from_amount'],
                    null
                );
            } catch (ValidationException $e) {
                return response()->json([
                    'message' => collect($e->errors())->flatten()->first() ?? __('bank.insufficient_balance_currency'),
                    'errors' => $e->errors(),
                ], 422);
            }
        }

        /** @var array{0: TreasuryEntry, 1: TreasuryEntry} $pair */
        $pair = DB::transaction(function () use ($validated, $userId, $fromCurrency, $toCurrency, $fxRate, $toAmount, $storedSource): array {
            return $this->journalPosting->postTransferPair(
                $validated,
                $fromCurrency,
                $toCurrency,
                $fxRate,
                $toAmount,
                $storedSource,
                $userId,
            );
        });

        [$creditLeg, $debitLeg] = $pair;

        return response()->json([
            'message' => __('Transfer recorded.'),
            'data' => [
                'journal_transaction_id' => $creditLeg->journal_transaction_id,
                'journal_kind' => $creditLeg->journal_kind,
                'credit_entry_id' => $creditLeg->id,
                'debit_entry_id' => $debitLeg->id,
            ],
        ], 201);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to create expenses.')
        );

        $validated = $request->validate([
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3'],
            'expense_date' => ['required', 'date'],
        ]);

        $expense = new Expense;
        $expense->expense_category_id = $validated['expense_category_id'];
        $expense->description = $validated['description'];
        $expense->amount = $validated['amount'];
        $expense->currency_code = $validated['currency_code'];
        $expense->expense_date = $validated['expense_date'];
        $expense->paid_by_id = $request->user()->id;
        $expense->save();

        return response()->json([
            'data' => $expense->load('category'),
        ], 201);
    }

    /**
     * Official daily FX from Central Bank of Egypt (scraped HTML). No invented fallback rates.
     */
    public function dailyExchangeRates(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view treasury exchange rates.')
        );

        try {
            $data = app(CbeOfficialExchangeRateService::class)->fetch();

            return response()->json([
                'ok' => true,
                'data' => $data,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Treasury daily exchange rates unavailable', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => __('Exchange rates are temporarily unavailable.'),
                'data' => [
                    'pairs' => [],
                    'source' => null,
                    'source_url' => null,
                    'as_of' => null,
                    'fetched_at' => null,
                ],
            ]);
        }
    }
}
