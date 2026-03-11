<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Shipment;
use App\Services\FinancialService;
use Illuminate\Database\Seeder;

class InvoicesSeeder extends Seeder
{
    public function run(): void
    {
        $client = Client::query()->first();
        if (! $client) {
            $client = Client::create([
                'name' => 'منصور وشركاه للتجارة',
                'company_name' => 'منصور وشركاه للتجارة',
                'status' => 'active',
                'email' => 'client@example.com',
                'phone' => '+201001234567',
            ]);
        }

        $shipment = Shipment::query()->first();
        if (! $shipment) {
            $shipment = Shipment::create([
                'bl_number' => 'BL-2026-0248',
                'client_id' => $client->id,
                'route_text' => 'Alexandria → Jeddah',
                'shipment_direction' => 'Export',
                'mode' => 'Sea',
                'shipment_type' => 'FCL',
                'status' => 'booked',
                'operations_status' => 0,
                'container_count' => 2,
                'container_size' => "40'",
                'container_type' => 'Dry',
                'loading_place' => 'Alexandria',
                'loading_date' => '2026-02-10',
                'cargo_description' => 'General cargo',
                'is_reefer' => false,
                'cost_total' => 0,
                'selling_price_total' => 0,
                'profit_total' => 0,
            ]);
        }

        $this->createInvoice(
            'INV-2026-0094',
            $client,
            $shipment,
            'client',
            'unpaid',
            1,
            'USD',
            '2026-02-19',
            '2026-03-04',
            [
                ['desc' => "Ocean Freight (40'HC×2)", 'qty' => 1, 'price' => 2800],
                ['desc' => 'THC', 'qty' => 2, 'price' => 225],
                ['desc' => 'Inland Transport', 'qty' => 1, 'price' => 600],
                ['desc' => 'Documentation Fee', 'qty' => 1, 'price' => 150],
                ['desc' => 'Service Charge', 'qty' => 1, 'price' => 1050],
            ],
            false
        );

        $this->createInvoice(
            'INV-2026-0093',
            $client,
            $shipment,
            'client',
            'partial',
            1,
            'USD',
            '2026-02-18',
            '2026-03-03',
            [
                ['desc' => 'Full Container Freight', 'qty' => 1, 'price' => 8500],
            ],
            true,
            4000
        );

        $this->createInvoice(
            'INV-2026-0092',
            $client,
            $shipment,
            'client',
            'paid',
            3,
            'EUR',
            '2026-02-17',
            '2026-03-02',
            [
                ['desc' => 'Ocean Freight', 'qty' => 1, 'price' => 7800],
            ],
            true,
            7800
        );
    }

    /**
     * @param array<int, array{desc:string,qty:float,price:float}> $items
     */
    private function createInvoice(string $number, Client $client, Shipment $shipment, string $type, string $status, int $currencyId, string $currencyCode, string $issueDate, ?string $dueDate, array $items, bool $isVatInvoice = false, float $paidAmount = 0.0): void
    {
        $invoice = Invoice::firstOrCreate(
            ['invoice_number' => $number],
            [
                'invoice_type' => $type,
                'client_id' => $client->id,
                'shipment_id' => $shipment->id,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'status' => $status,
                'currency_id' => $currencyId,
                'currency_code' => $currencyCode,
                'tax_amount' => 0,
                'is_vat_invoice' => $isVatInvoice,
                'notes' => null,
            ]
        );

        if ($invoice->wasRecentlyCreated) {
            foreach ($items as $idx => $row) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'description' => $row['desc'],
                    'quantity' => $row['qty'],
                    'unit_price' => $row['price'],
                    'line_total' => $row['qty'] * $row['price'],
                ]);
            }

            FinancialService::syncInvoiceTotals($invoice);
        }

        if ($paidAmount > 0) {
            $existingPaid = (float) $invoice->payments()->sum('amount');
            $remaining = $paidAmount - $existingPaid;

            if ($remaining > 0.0) {
                $payment = new Payment();
                $payment->type = 'client_receipt';
                $payment->invoice_id = $invoice->id;
                $payment->client_id = $invoice->client_id;
                $payment->amount = $remaining;
                $payment->currency_code = $invoice->currency_code;
                $payment->method = 'bank_transfer';
                $payment->reference = $number.'-PAY';
                $payment->paid_at = $invoice->issue_date;
                $payment->created_by_id = null;
                $payment->save();

                FinancialService::handlePaymentPosted($payment);
            }
        }
    }
}

