<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\TreasuryEntry;
use App\Models\VendorBill;
use App\Models\VendorBillItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FinancialService
{
    /**
     * Sync invoice totals from its items.
     */
    public static function syncInvoiceTotals(Invoice $invoice): void
    {
        $sum = (float) InvoiceItem::query()
            ->where('invoice_id', $invoice->id)
            ->sum('line_total');

        $invoice->total_amount = $sum;
        $invoice->tax_amount = $invoice->tax_amount ?? 0;
        $invoice->net_amount = $invoice->total_amount + $invoice->tax_amount;
        $invoice->save();

        self::syncShipmentTotalsForInvoice($invoice);
    }

    /**
     * Sync vendor bill totals from its items.
     */
    public static function syncVendorBillTotals(VendorBill $bill): void
    {
        $sum = (float) VendorBillItem::query()
            ->where('vendor_bill_id', $bill->id)
            ->sum('line_total');

        $bill->total_amount = $sum;
        $bill->tax_amount = $bill->tax_amount ?? 0;
        $bill->net_amount = $bill->total_amount + $bill->tax_amount;
        $bill->save();

        self::syncShipmentTotalsForVendorBill($bill);
    }

    /**
     * Handle side effects when a payment is recorded.
     */
    public static function handlePaymentPosted(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            // Treasury entry
            $entryType = $payment->type === 'client_receipt' ? 'in' : 'out';

            TreasuryEntry::create([
                'entry_type' => $entryType,
                'source' => $payment->source_account_id ? ('bank-'.$payment->source_account_id) : 'payment',
                'account_id' => $payment->source_account_id,
                'counter_account_id' => $payment->target_account_id,
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
                'currency_code' => $payment->currency_code,
                'target_currency_code' => $payment->target_currency_code,
                'exchange_rate' => $payment->exchange_rate,
                'converted_amount' => $payment->converted_amount,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
                'entry_date' => $payment->paid_at?->toDateString() ?? now()->toDateString(),
                'created_by_id' => $payment->created_by_id,
            ]);

            if ($payment->invoice_id) {
                $invoice = Invoice::query()->find($payment->invoice_id);
                if ($invoice) {
                    $computed = AccountingAggregationService::invoiceStatementTotals($invoice);
                    $invoice->status = $computed['status'];
                    if (Schema::hasColumn('invoices', 'paid_amount')) {
                        $invoice->paid_amount = (float) array_sum($computed['total_paid_per_currency']);
                    }
                    $invoice->save();
                }
            }
            if ($payment->vendor_bill_id) {
                $bill = VendorBill::query()->find($payment->vendor_bill_id);
                if ($bill) {
                    $paid = (float) Payment::query()->where('vendor_bill_id', $bill->id)->sum('amount');
                    $target = (float) ($bill->net_amount ?: $bill->total_amount);
                    $bill->status = $paid >= $target && $target > 0 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'unpaid');
                    $bill->save();
                }
            }

            // Recalculate shipment totals if tied to a shipment via invoice or bill
            if ($payment->invoice && $payment->invoice->shipment_id) {
                $shipment = Shipment::find($payment->invoice->shipment_id);
                if ($shipment) {
                    ShipmentService::recalculateTotals($shipment);
                }
            }

            if ($payment->vendorBill && $payment->vendorBill->shipment_id) {
                $shipment = Shipment::find($payment->vendorBill->shipment_id);
                if ($shipment) {
                    ShipmentService::recalculateTotals($shipment);
                }
            }
        });
    }

    protected static function syncShipmentTotalsForInvoice(Invoice $invoice): void
    {
        if (! $invoice->shipment_id) {
            return;
        }

        $shipment = Shipment::find($invoice->shipment_id);
        if ($shipment) {
            ShipmentService::recalculateTotals($shipment);
        }
    }

    protected static function syncShipmentTotalsForVendorBill(VendorBill $bill): void
    {
        if (! $bill->shipment_id) {
            return;
        }

        $shipment = Shipment::find($bill->shipment_id);
        if ($shipment) {
            ShipmentService::recalculateTotals($shipment);
        }
    }
}

