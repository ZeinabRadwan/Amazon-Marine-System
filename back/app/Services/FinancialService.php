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

class FinancialService
{
    /**
     * Sync invoice totals from its items.
     */
    public static function syncInvoiceTotals(Invoice $invoice): void
    {
        $sum = $invoice->items()->selectRaw('COALESCE(SUM(line_total), 0) as total')->value('total') ?? 0;

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
        $sum = $bill->items()->selectRaw('COALESCE(SUM(line_total), 0) as total')->value('total') ?? 0;

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
                'source' => 'payment',
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
                'currency_code' => $payment->currency_code,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'notes' => null,
                'entry_date' => $payment->paid_at?->toDateString() ?? now()->toDateString(),
                'created_by_id' => $payment->created_by_id,
            ]);

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

