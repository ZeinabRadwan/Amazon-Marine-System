<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\ShipmentCostInvoice;
use App\Models\ShipmentOperation;
use App\Models\ShipmentOperationTask;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

class AdminDashboardService
{
    private const NEAR_CUTOFF_DAYS = 3;

    /** @var list<string> */
    private const SD_AWAITING_BOOKING_STATUSES = [
        'submitted',
        'sent_to_operations',
        'booking_in_progress',
        'information_requested',
    ];

    public function __construct(
        private TreasuryLedgerBalanceService $ledgerBalance,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function buildOverview(): array
    {
        $monthStart = now()->copy()->startOfMonth();
        $monthEnd = now()->copy()->endOfMonth();
        $prevMonthStart = now()->copy()->subMonth()->startOfMonth();
        $prevMonthEnd = now()->copy()->subMonth()->endOfMonth();

        $revenueCurrent = $this->invoiceRevenueByCurrency($monthStart, $monthEnd);
        $revenuePrevious = $this->invoiceRevenueByCurrency($prevMonthStart, $prevMonthEnd);

        $shipmentCostsCurrent = $this->shipmentExpensesByCurrency($monthStart, $monthEnd);
        $shipmentCostCount = $this->shipmentCountWithExpensesInPeriod($monthStart, $monthEnd);

        $shipmentRevenueCurrent = $this->shipmentInvoiceRevenueByCurrency($monthStart, $monthEnd);
        $shipmentProfitCurrent = AccountingAggregationService::subtractCurrencyMaps(
            $shipmentRevenueCurrent,
            $shipmentCostsCurrent,
        );

        $operationalCostsCurrent = $this->operationalExpensesByCurrency($monthStart, $monthEnd);
        $companyProfitCurrent = AccountingAggregationService::subtractCurrencyMaps(
            $shipmentProfitCurrent,
            $operationalCostsCurrent,
        );

        $openInvoices = Invoice::query()
            ->with('items')
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->get();
        $customerDebts = AccountingAggregationService::aggregateInvoices($openInvoices)['total_remaining_per_currency'];

        $partnerPaid = $this->partnerPaymentsByCurrency();
        $partnerObligations = $this->partnerLiabilitiesFromCostInvoices($partnerPaid);

        return [
            'period' => [
                'month' => $monthStart->format('Y-m'),
                'month_label' => $monthStart->translatedFormat('F Y'),
            ],
            'kpi_cards' => [
                'monthly_revenue' => [
                    'by_currency' => $this->roundMap($revenueCurrent),
                    'change_pct' => $this->percentChangeVsPrevious($revenueCurrent, $revenuePrevious),
                ],
                'shipment_costs' => [
                    'by_currency' => $this->roundMap($shipmentCostsCurrent),
                    'shipment_count' => $shipmentCostCount,
                ],
                'shipment_net_profit' => [
                    'by_currency' => $this->roundMap($shipmentProfitCurrent),
                    'margin_pct' => $this->profitMarginPct($shipmentRevenueCurrent, $shipmentProfitCurrent),
                    'margin_by_currency' => $this->profitMarginByCurrency($shipmentRevenueCurrent, $shipmentProfitCurrent),
                ],
                'company_net_profit' => [
                    'by_currency' => $this->roundMap($companyProfitCurrent),
                ],
                'customer_debts' => [
                    'by_currency' => $this->roundMap($this->clampNonNegative($customerDebts)),
                ],
                'partner_obligations' => [
                    'by_currency' => $this->roundMap($partnerObligations),
                ],
            ],
            'bank_accounts' => $this->bankAccountsWithBalances(),
            'sales_team' => $this->salesTeamPerformance($monthStart, $monthEnd),
            'operations' => $this->operationsKpis(),
        ];
    }

    /**
     * @return array<string, float>
     */
    private function invoiceRevenueByCurrency(Carbon $from, Carbon $to): array
    {
        $rows = InvoiceItem::query()
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereBetween('invoices.issue_date', [$from->toDateString(), $to->toDateString()])
            ->whereNotIn('invoices.status', ['cancelled'])
            ->selectRaw('UPPER(COALESCE(invoice_items.currency_code, invoices.currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(invoice_items.line_total, 0)) as total')
            ->groupBy('currency_code')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $code = strtoupper(trim((string) $row->currency_code));
            if ($code === '') {
                $code = 'USD';
            }
            $map[$code] = (float) ($map[$code] ?? 0) + (float) $row->total;
        }

        return AccountingAggregationService::normalizeCurrencyMap($map);
    }

    /**
     * Revenue from invoices linked to shipments only.
     *
     * @return array<string, float>
     */
    private function shipmentInvoiceRevenueByCurrency(Carbon $from, Carbon $to): array
    {
        $rows = InvoiceItem::query()
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereNotNull('invoices.shipment_id')
            ->whereBetween('invoices.issue_date', [$from->toDateString(), $to->toDateString()])
            ->whereNotIn('invoices.status', ['cancelled'])
            ->selectRaw('UPPER(COALESCE(invoice_items.currency_code, invoices.currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(invoice_items.line_total, 0)) as total')
            ->groupBy('currency_code')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $code = strtoupper(trim((string) $row->currency_code));
            if ($code === '') {
                $code = 'USD';
            }
            $map[$code] = (float) ($map[$code] ?? 0) + (float) $row->total;
        }

        return AccountingAggregationService::normalizeCurrencyMap($map);
    }

    /**
     * @return array<string, float>
     */
    private function shipmentExpensesByCurrency(Carbon $from, Carbon $to): array
    {
        $rows = Expense::query()
            ->whereNotNull('shipment_id')
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('UPPER(COALESCE(currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(amount, 0)) as total')
            ->groupBy('currency_code')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $code = strtoupper(trim((string) $row->currency_code));
            if ($code === '') {
                $code = 'USD';
            }
            $map[$code] = (float) ($map[$code] ?? 0) + (float) $row->total;
        }

        return AccountingAggregationService::normalizeCurrencyMap($map);
    }

    private function shipmentCountWithExpensesInPeriod(Carbon $from, Carbon $to): int
    {
        return (int) Expense::query()
            ->whereNotNull('shipment_id')
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->distinct('shipment_id')
            ->count('shipment_id');
    }

    /**
     * Company operational expenses (not tied to a shipment).
     *
     * @return array<string, float>
     */
    private function operationalExpensesByCurrency(Carbon $from, Carbon $to): array
    {
        $rows = Expense::query()
            ->whereNull('shipment_id')
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('UPPER(COALESCE(currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(amount, 0)) as total')
            ->groupBy('currency_code')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $code = strtoupper(trim((string) $row->currency_code));
            if ($code === '') {
                $code = 'USD';
            }
            $map[$code] = (float) ($map[$code] ?? 0) + (float) $row->total;
        }

        return AccountingAggregationService::normalizeCurrencyMap($map);
    }

    /**
     * @param  array<string, float|int>  $current
     * @param  array<string, float|int>  $previous
     */
    private function percentChangeVsPrevious(array $current, array $previous): ?float
    {
        $curTotal = array_sum($current);
        $prevTotal = array_sum($previous);
        if ($prevTotal <= 0.00001) {
            return $curTotal > 0.00001 ? 100.0 : null;
        }

        return round((($curTotal - $prevTotal) / $prevTotal) * 100, 1);
    }

    /**
     * @param  array<string, float|int>  $revenue
     * @param  array<string, float|int>  $profit
     */
    private function profitMarginPct(array $revenue, array $profit): ?float
    {
        $margins = $this->profitMarginByCurrency($revenue, $profit);
        if ($margins === []) {
            return null;
        }

        $bestCurrency = null;
        $bestRevenue = -1.0;
        foreach ($revenue as $cur => $rev) {
            $r = (float) $rev;
            if ($r > $bestRevenue) {
                $bestRevenue = $r;
                $bestCurrency = $cur;
            }
        }

        return $bestCurrency !== null ? ($margins[$bestCurrency] ?? null) : null;
    }

    /**
     * @param  array<string, float|int>  $revenue
     * @param  array<string, float|int>  $profit
     * @return array<string, float>
     */
    private function profitMarginByCurrency(array $revenue, array $profit): array
    {
        $out = [];
        $currencies = array_unique(array_merge(array_keys($revenue), array_keys($profit)));
        foreach ($currencies as $cur) {
            $rev = (float) ($revenue[$cur] ?? 0);
            $prf = (float) ($profit[$cur] ?? 0);
            if ($rev <= 0.00001) {
                continue;
            }
            $out[$cur] = round(($prf / $rev) * 100, 1);
        }

        return $out;
    }

    /**
     * @return array<string, float>
     */
    private function partnerPaymentsByCurrency(): array
    {
        $rows = Payment::query()
            ->where('type', 'vendor_payment')
            ->selectRaw('UPPER(COALESCE(currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(amount, 0)) as total')
            ->groupBy('currency_code')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $code = strtoupper(trim((string) $row->currency_code));
            if ($code === '') {
                $code = 'USD';
            }
            $map[$code] = (float) ($map[$code] ?? 0) + (float) $row->total;
        }

        return AccountingAggregationService::normalizeCurrencyMap($map);
    }

    /**
     * @param  array<string, float|int>  $partnerPaidByCurrency
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
            if ($totals === []) {
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
            $remaining[$code] = max(0, (float) ($billed[$code] ?? 0) - (float) ($partnerPaidByCurrency[$code] ?? 0));
        }

        return AccountingAggregationService::normalizeCurrencyMap($remaining);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function bankAccountsWithBalances(): array
    {
        $banks = BankAccount::query()
            ->where('is_active', true)
            ->orderBy('bank_name')
            ->orderBy('account_name')
            ->get();

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesByAccount();
        $out = [];

        foreach ($banks as $bank) {
            $idKey = (string) $bank->id;
            $rawMap = $balancesByAccount[$idKey] ?? [];
            $balanceByCurrency = [];
            foreach ($rawMap as $cur => $val) {
                $code = $this->ledgerBalance->normalizeCurrency((string) $cur);
                $balanceByCurrency[$code] = round(max(0, (float) $val), 2);
            }

            $kind = strtolower(trim((string) ($bank->treasury_account_kind ?: BankAccount::TREASURY_KIND_BANK)));

            $out[] = [
                'id' => $bank->id,
                'label' => trim(($bank->bank_name ?: '').' — '.($bank->account_name ?: '')),
                'bank_name' => $bank->bank_name,
                'account_name' => $bank->account_name,
                'account_number' => $bank->account_number,
                'treasury_account_kind' => $kind !== '' ? $kind : BankAccount::TREASURY_KIND_BANK,
                'balance_by_currency' => $balanceByCurrency,
            ];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function salesTeamPerformance(Carbon $from, Carbon $to): array
    {
        $salesUserIds = $this->salesUserIds();
        if ($salesUserIds === []) {
            return [];
        }

        $users = User::query()->whereIn('id', $salesUserIds)->orderBy('name')->get(['id', 'name']);
        $shipmentCounts = Shipment::query()
            ->whereIn('sales_rep_id', $salesUserIds)
            ->selectRaw('sales_rep_id, COUNT(*) as cnt')
            ->groupBy('sales_rep_id')
            ->pluck('cnt', 'sales_rep_id');

        $profitByRep = $this->salesProfitByRepAndCurrency($salesUserIds, $from, $to);

        return $users->map(function (User $user) use ($shipmentCounts, $profitByRep) {
            $uid = (int) $user->id;

            return [
                'employee_id' => $uid,
                'employee' => $user->name,
                'shipments_count' => (int) ($shipmentCounts[$uid] ?? 0),
                'profit_by_currency' => $this->roundMap($profitByRep[$uid] ?? []),
            ];
        })->values()->all();
    }

    /**
     * @param  list<int>  $salesUserIds
     * @return array<int, array<string, float>>
     */
    private function salesProfitByRepAndCurrency(array $salesUserIds, Carbon $from, Carbon $to): array
    {
        $shipmentIdsByRep = Shipment::query()
            ->whereIn('sales_rep_id', $salesUserIds)
            ->pluck('sales_rep_id', 'id');

        if ($shipmentIdsByRep->isEmpty()) {
            return [];
        }

        $shipmentIds = $shipmentIdsByRep->keys()->all();

        $revenueByShipment = [];
        $invoiceAgg = InvoiceItem::query()
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereIn('invoices.shipment_id', $shipmentIds)
            ->whereBetween('invoices.issue_date', [$from->toDateString(), $to->toDateString()])
            ->whereNotIn('invoices.status', ['cancelled'])
            ->selectRaw('invoices.shipment_id as shipment_id')
            ->selectRaw('UPPER(COALESCE(invoice_items.currency_code, invoices.currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(invoice_items.line_total, 0)) as total')
            ->groupBy('shipment_id', 'currency_code')
            ->get();

        foreach ($invoiceAgg as $row) {
            $sid = (int) $row->shipment_id;
            $code = strtoupper(trim((string) $row->currency_code)) ?: 'USD';
            $revenueByShipment[$sid][$code] = (float) ($revenueByShipment[$sid][$code] ?? 0) + (float) $row->total;
        }

        $expenseAgg = Expense::query()
            ->whereIn('shipment_id', $shipmentIds)
            ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('shipment_id')
            ->selectRaw('UPPER(COALESCE(currency_code, 'USD')) as currency_code')
            ->selectRaw('SUM(COALESCE(amount, 0)) as total')
            ->groupBy('shipment_id', 'currency_code')
            ->get();

        $costByShipment = [];
        foreach ($expenseAgg as $row) {
            $sid = (int) $row->shipment_id;
            $code = strtoupper(trim((string) $row->currency_code)) ?: 'USD';
            $costByShipment[$sid][$code] = (float) ($costByShipment[$sid][$code] ?? 0) + (float) $row->total;
        }

        $profitByRep = [];
        foreach ($shipmentIdsByRep as $shipmentId => $repId) {
            $repId = (int) $repId;
            $sid = (int) $shipmentId;
            $revMap = $revenueByShipment[$sid] ?? [];
            $costMap = $costByShipment[$sid] ?? [];
            $profitMap = AccountingAggregationService::subtractCurrencyMaps($revMap, $costMap);
            $profitByRep[$repId] = AccountingAggregationService::addCurrencyMaps(
                $profitByRep[$repId] ?? [],
                $profitMap,
            );
        }

        return $profitByRep;
    }

    /**
     * @return list<int>
     */
    private function salesUserIds(): array
    {
        $roleIds = Role::query()
            ->whereRaw('LOWER(name) LIKE ?', ['%sales%'])
            ->whereRaw('LOWER(name) NOT LIKE ?', ['%manager%'])
            ->pluck('id');

        if ($roleIds->isEmpty()) {
            return [];
        }

        return DB::table('model_has_roles')
            ->whereIn('role_id', $roleIds)
            ->distinct()
            ->pluck('model_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function operationsKpis(): array
    {
        $today = Carbon::today()->toDateString();
        $cutoffEnd = Carbon::today()->addDays(self::NEAR_CUTOFF_DAYS)->toDateString();

        $activeShipments = (int) Shipment::query()
            ->where(function ($q) {
                $q->whereNull('status')
                    ->orWhere(function ($inner) {
                        $inner->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%deliver%'])
                            ->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%تسليم%'])
                            ->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%cancel%']);
                    });
            })
            ->count();

        $sdAwaitingBooking = (int) SDForm::query()
            ->whereIn('status', self::SD_AWAITING_BOOKING_STATUSES)
            ->whereNull('linked_shipment_id')
            ->count();

        $taskBase = ShipmentOperationTask::query()
            ->whereNull('completed_at')
            ->where(function ($q) {
                $q->whereNotNull('due_date')->orWhereNotNull('execution_at');
            });

        $eff = 'COALESCE(shipment_operation_tasks.due_date, DATE(shipment_operation_tasks.execution_at))';

        $overdueTasks = (int) (clone $taskBase)->whereRaw("{$eff} < ?", [$today])->count();
        $todayTasks = (int) (clone $taskBase)->whereRaw("{$eff} = ?", [$today])->count();

        $nearCutoff = (int) ShipmentOperation::query()
            ->whereNotNull('cut_off_date')
            ->whereBetween('cut_off_date', [$today, $cutoffEnd])
            ->whereHas('shipment', function ($q) {
                $q->where(function ($inner) {
                    $inner->whereNull('status')
                        ->orWhere(function ($s) {
                            $s->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%deliver%'])
                                ->whereRaw('LOWER(COALESCE(status, "")) NOT LIKE ?', ['%cancel%']);
                        });
                });
            })
            ->count();

        return [
            'active_shipments' => $activeShipments,
            'sd_forms_awaiting_booking' => $sdAwaitingBooking,
            'overdue_tasks' => $overdueTasks,
            'near_cutoff_shipments' => $nearCutoff,
            'today_tasks' => $todayTasks,
        ];
    }

    /**
     * @param  array<string, float|int>  $map
     * @return array<string, float>
     */
    private function roundMap(array $map): array
    {
        $out = [];
        foreach ($map as $cur => $val) {
            $out[$cur] = round((float) $val, 2);
        }

        return AccountingAggregationService::normalizeCurrencyMap($out);
    }

    /**
     * @param  array<string, float|int>  $map
     * @return array<string, float>
     */
    private function clampNonNegative(array $map): array
    {
        $out = [];
        foreach ($map as $cur => $val) {
            $out[$cur] = max(0, (float) $val);
        }

        return $out;
    }
}
