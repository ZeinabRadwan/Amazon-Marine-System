<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\CustomerTransaction;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class PrepaidPaymentService
{
    public static function resolveCurrencyIdFromCode(string $code): int
    {
        $upper = strtoupper(trim($code));
        if ($upper === '') {
            $upper = 'USD';
        }

        $currency = Currency::query()->whereRaw('UPPER(code) = ?', [$upper])->first()
            ?? Currency::query()->where('is_default', true)->first()
            ?? Currency::query()->orderBy('id')->first();

        return (int) ($currency?->id ?? 1);
    }

    /**
     * Record customer prepaid credit when a client receipt is posted without an invoice.
     */
    public static function recordPrepaidCredit(Payment $payment): void
    {
        if ($payment->type !== 'client_receipt' || $payment->invoice_id) {
            return;
        }

        if (! $payment->client_id) {
            return;
        }

        $currencyCode = strtoupper(trim((string) ($payment->currency_code ?: 'USD')));

        CustomerTransaction::create([
            'customer_id' => $payment->client_id,
            'invoice_id' => null,
            'type' => 'credit',
            'amount' => (float) $payment->amount,
            'currency_id' => self::resolveCurrencyIdFromCode($currencyCode),
            'description' => $payment->notes
                ?: __('Advance payment (prepaid) — :reference', [
                    'reference' => $payment->reference ?: ('#'.$payment->id),
                ]),
        ]);
    }

    /**
     * Link unallocated client receipts to an invoice (FIFO) when it is issued.
     */
    public static function allocateUnallocatedToInvoice(Invoice $invoice): void
    {
        if (! $invoice->client_id) {
            return;
        }

        $invoice->loadMissing(['items', 'payments']);

        $invoiced = AccountingAggregationService::invoiceTotalsPerCurrency($invoice);
        $remaining = AccountingAggregationService::subtractCurrencyMaps(
            $invoiced,
            AccountingAggregationService::invoicePaidPerCurrency($invoice->id),
        );

        if (! array_filter($remaining, static fn (float $v): bool => $v > 0.00001)) {
            return;
        }

        $query = Payment::query()
            ->where('type', 'client_receipt')
            ->where('client_id', $invoice->client_id)
            ->whereNull('invoice_id')
            ->orderBy('paid_at')
            ->orderBy('id');

        if ($invoice->shipment_id) {
            $query->where(function ($q) use ($invoice): void {
                $q->where('shipment_id', $invoice->shipment_id)
                    ->orWhereNull('shipment_id');
            });
        }

        /** @var Collection<int, Payment> $candidates */
        $candidates = $query->get();

        foreach ($candidates as $payment) {
            $cur = strtoupper(trim((string) ($payment->currency_code ?: 'USD')));
            $rem = (float) ($remaining[$cur] ?? 0);
            if ($rem <= 0.00001) {
                continue;
            }

            $payment->invoice_id = $invoice->id;
            if (! $payment->shipment_id && $invoice->shipment_id) {
                $payment->shipment_id = $invoice->shipment_id;
            }
            $payment->save();

            $paid = AccountingAggregationService::invoicePaidPerCurrency($invoice->id);
            $remaining = AccountingAggregationService::subtractCurrencyMaps($invoiced, $paid);
        }

        $invoice->refresh(['items', 'payments']);
        $computed = AccountingAggregationService::invoiceStatementTotals($invoice);
        $invoice->status = $computed['status'];
        $invoice->save();
    }

    /**
     * Unallocated client receipts for a customer (optionally scoped to shipment).
     *
     * @return array<string, float>
     */
    public static function prepaidBalanceByCurrency(int $clientId, ?int $shipmentId = null): array
    {
        $query = Payment::query()
            ->where('type', 'client_receipt')
            ->where('client_id', $clientId)
            ->whereNull('invoice_id');

        if ($shipmentId) {
            $query->where('shipment_id', $shipmentId);
        }

        $map = [];
        foreach ($query->get(['currency_code', 'amount']) as $payment) {
            $cur = strtoupper(trim((string) ($payment->currency_code ?: 'USD')));
            $map[$cur] = (float) ($map[$cur] ?? 0) + (float) $payment->amount;
        }

        return AccountingAggregationService::normalizeCurrencyMap($map);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function serializeAdvancePayments(int $clientId, ?int $shipmentId = null): array
    {
        $query = Payment::query()
            ->with(['sourceAccount', 'shipment'])
            ->where('type', 'client_receipt')
            ->where('client_id', $clientId)
            ->whereNull('invoice_id')
            ->orderByDesc('paid_at')
            ->orderByDesc('id');

        if ($shipmentId) {
            $query->where(function ($q) use ($shipmentId): void {
                $q->where('shipment_id', $shipmentId)
                    ->orWhereNull('shipment_id');
            });
        }

        return $query->get()->map(static function (Payment $p): array {
            $proofUrl = $p->proof_path ? Storage::disk('public')->url($p->proof_path) : null;

            return [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'currency_code' => strtoupper((string) ($p->currency_code ?: 'USD')),
                'method' => $p->method,
                'reference' => $p->reference,
                'notes' => $p->notes,
                'paid_at' => $p->paid_at?->toDateString(),
                'created_at' => $p->created_at?->toDateTimeString(),
                'shipment_id' => $p->shipment_id,
                'shipment_reference' => $p->shipment?->bl_number,
                'is_advance' => true,
                'bank_account_name' => $p->sourceAccount?->account_name,
                'bank_name' => $p->sourceAccount?->bank_name,
                'proof_url' => $proofUrl,
                'proof_filename' => $p->proof_path ? basename((string) $p->proof_path) : null,
            ];
        })->values()->all();
    }
}
