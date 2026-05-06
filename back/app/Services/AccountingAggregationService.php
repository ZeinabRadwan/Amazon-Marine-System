<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Collection;

class AccountingAggregationService
{
    /**
     * @param array<string, float|int> $map
     * @return array<string, float>
     */
    public static function normalizeCurrencyMap(array $map): array
    {
        $out = [];
        foreach ($map as $cur => $val) {
            $code = strtoupper(trim((string) $cur));
            if ($code === '') {
                continue;
            }
            $out[$code] = (float) ($out[$code] ?? 0) + (float) $val;
        }
        ksort($out);

        return $out;
    }

    /**
     * Always derive invoice totals from line items (never from invoice.total_amount).
     *
     * @return array<string, float>
     */
    public static function invoiceTotalsPerCurrency(Invoice $invoice): array
    {
        $rows = $invoice->relationLoaded('items')
            ? $invoice->items
            : $invoice->items()->get(['currency_code', 'line_total']);

        $totals = [];
        foreach ($rows as $item) {
            $currency = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
            $totals[$currency] = (float) ($totals[$currency] ?? 0) + (float) $item->line_total;
        }

        // Backward compatibility for payload-style line_items if present in memory.
        if (empty($totals) && is_array($invoice->line_items ?? null)) {
            foreach ($invoice->line_items as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $currency = strtoupper((string) ($item['currency_code'] ?? $invoice->currency_code ?? 'USD'));
                $lineTotal = (float) ($item['line_total'] ?? $item['total'] ?? $item['amount'] ?? 0);
                $totals[$currency] = (float) ($totals[$currency] ?? 0) + $lineTotal;
            }
        }

        return self::normalizeCurrencyMap($totals);
    }

    /**
     * @return array<string, float>
     */
    public static function invoicePaidPerCurrency(int $invoiceId): array
    {
        $payments = Payment::query()
            ->where('invoice_id', $invoiceId)
            ->where('type', 'client_receipt')
            ->get(['currency_code', 'amount']);

        $paid = [];
        foreach ($payments as $payment) {
            $currency = strtoupper((string) ($payment->currency_code ?: 'USD'));
            $paid[$currency] = (float) ($paid[$currency] ?? 0) + (float) $payment->amount;
        }

        return self::normalizeCurrencyMap($paid);
    }

    /**
     * @param array<string, float|int> $a
     * @param array<string, float|int> $b
     * @return array<string, float>
     */
    public static function addCurrencyMaps(array $a, array $b): array
    {
        $out = [];
        $currencies = array_unique(array_merge(array_keys($a), array_keys($b)));
        foreach ($currencies as $currency) {
            $out[$currency] = (float) ($a[$currency] ?? 0) + (float) ($b[$currency] ?? 0);
        }

        return self::normalizeCurrencyMap($out);
    }

    /**
     * @param array<string, float|int> $a
     * @param array<string, float|int> $b
     * @return array<string, float>
     */
    public static function subtractCurrencyMaps(array $a, array $b): array
    {
        $out = [];
        $currencies = array_unique(array_merge(array_keys($a), array_keys($b)));
        foreach ($currencies as $currency) {
            $out[$currency] = (float) ($a[$currency] ?? 0) - (float) ($b[$currency] ?? 0);
        }

        return self::normalizeCurrencyMap($out);
    }

    /**
     * @return array{
     *   total_invoiced_per_currency: array<string,float>,
     *   total_paid_per_currency: array<string,float>,
     *   total_remaining_per_currency: array<string,float>,
     *   status: string
     * }
     */
    public static function invoiceStatementTotals(Invoice $invoice): array
    {
        $invoiced = self::invoiceTotalsPerCurrency($invoice);
        $paid = self::invoicePaidPerCurrency($invoice->id);
        $remaining = self::subtractCurrencyMaps($invoiced, $paid);

        $status = self::resolveInvoiceStatus($invoiced, $paid);

        return [
            'total_invoiced_per_currency' => $invoiced,
            'total_paid_per_currency' => $paid,
            'total_remaining_per_currency' => $remaining,
            'status' => $status,
        ];
    }

    /**
     * @param array<string, float|int> $invoiced
     * @param array<string, float|int> $paid
     */
    public static function resolveInvoiceStatus(array $invoiced, array $paid): string
    {
        $currencies = array_unique(array_merge(array_keys($invoiced), array_keys($paid)));
        $hasPositiveInvoice = false;
        $hasAnyPaid = false;
        $allSettled = true;

        foreach ($currencies as $currency) {
            $inv = (float) ($invoiced[$currency] ?? 0);
            $pd = (float) ($paid[$currency] ?? 0);
            if ($inv > 0) {
                $hasPositiveInvoice = true;
            }
            if ($pd > 0) {
                $hasAnyPaid = true;
            }
            if ($inv - $pd > 0.00001) {
                $allSettled = false;
            }
        }

        if ($hasPositiveInvoice && $allSettled) {
            return 'paid';
        }
        if ($hasAnyPaid) {
            return 'partial';
        }

        return 'unpaid';
    }

    /**
     * @param Collection<int, Invoice> $invoices
     * @return array{
     *   total_invoiced_per_currency: array<string,float>,
     *   total_paid_per_currency: array<string,float>,
     *   total_remaining_per_currency: array<string,float>
     * }
     */
    public static function aggregateInvoices(Collection $invoices): array
    {
        $invoiced = [];
        $paid = [];
        $remaining = [];

        foreach ($invoices as $invoice) {
            $totals = self::invoiceStatementTotals($invoice);
            $invoiced = self::addCurrencyMaps($invoiced, $totals['total_invoiced_per_currency']);
            $paid = self::addCurrencyMaps($paid, $totals['total_paid_per_currency']);
            $remaining = self::addCurrencyMaps($remaining, $totals['total_remaining_per_currency']);
        }

        return [
            'total_invoiced_per_currency' => $invoiced,
            'total_paid_per_currency' => $paid,
            'total_remaining_per_currency' => $remaining,
        ];
    }
}

