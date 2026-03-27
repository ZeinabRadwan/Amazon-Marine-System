<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Vendor;
use App\Models\VendorBill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingController extends Controller
{
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

            $paymentsQuery = Payment::query()
                ->where('client_id', $client->id);

            if ($currencyFilter) {
                $invoicesQuery->where('currency_code', $currencyFilter);
                $paymentsQuery->where('currency_code', $currencyFilter);
            }

            $invoices = $invoicesQuery->get();
            $payments = $paymentsQuery->get();

            $totalSales = (float) $invoices->sum('total_amount');
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
                ->where('vendor_id', $vendor->id);

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

    public function exportClients(Request $request): JsonResponse
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
            $invoices = Invoice::query()
                ->where('client_id', $client->id)
                ->get();

            $payments = Payment::query()
                ->where('client_id', $client->id)
                ->get();

            $totalSales = (float) $invoices->sum('total_amount');
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

    public function exportPartners(Request $request): JsonResponse
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
