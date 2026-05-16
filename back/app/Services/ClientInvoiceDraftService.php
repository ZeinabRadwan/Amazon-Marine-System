<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\CustomerTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Shipment;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ClientInvoiceDraftService
{
    /**
     * Find or create a draft client invoice for the shipment.
     */
    public function ensureDraftInvoice(Shipment $shipment, ?int $currencyId = null): Invoice
    {
        if (! $shipment->client_id) {
            throw new \InvalidArgumentException(__('Shipment has no client.'));
        }

        $invoice = Invoice::query()
            ->where('shipment_id', $shipment->id)
            ->where('client_id', $shipment->client_id)
            ->where('invoice_type', 'client')
            ->where('status', 'draft')
            ->orderByDesc('id')
            ->first();

        if ($invoice) {
            return $invoice;
        }

        $invoice = Invoice::query()
            ->where('shipment_id', $shipment->id)
            ->where('client_id', $shipment->client_id)
            ->where('invoice_type', 'client')
            ->whereIn('status', ['draft', 'unpaid', 'issued', 'partial'])
            ->orderByDesc('id')
            ->first();

        if ($invoice && $invoice->status === 'draft') {
            return $invoice;
        }

        $curId = $currencyId ?: (int) (Currency::query()->where('is_default', true)->value('id') ?? 1);
        $currency = Currency::query()->find($curId);
        $currencyCode = strtoupper((string) ($currency?->code ?: 'USD'));

        $invoice = new Invoice;
        $invoice->invoice_number = $this->generateInvoiceNumber();
        $invoice->invoice_type = 'client';
        $invoice->shipment_id = $shipment->id;
        $invoice->client_id = $shipment->client_id;
        $invoice->issue_date = now()->toDateString();
        $invoice->due_date = null;
        $invoice->status = 'draft';
        $invoice->currency_id = $curId;
        $invoice->currency_code = $currencyCode;
        $invoice->notes = null;
        $invoice->total_amount = 0;
        $invoice->tax_amount = 0;
        $invoice->is_vat_invoice = false;
        $invoice->net_amount = 0;
        $invoice->save();

        if (Schema::hasTable('customer_transactions')) {
            CustomerTransaction::create([
                'customer_id' => $invoice->client_id,
                'invoice_id' => $invoice->id,
                'type' => 'debit',
                'amount' => 0,
                'currency_id' => $invoice->currency_id,
                'description' => __('Invoice :number generated', ['number' => $invoice->invoice_number]),
            ]);
        }

        return $invoice;
    }

    /**
     * @param  array<string,mixed>  $payload
     */
    public function upsertDraft(Shipment $shipment, array $payload, ?int $currencyId = null): Invoice
    {
        return DB::transaction(function () use ($shipment, $payload, $currencyId): Invoice {
            $invoice = $this->ensureDraftInvoice($shipment, $currencyId);

            if (in_array($invoice->status, ['paid', 'cancelled'], true)) {
                throw new \RuntimeException(__('Paid or cancelled invoices cannot be edited.'));
            }

            $metaFill = [];
            if (array_key_exists('notes', $payload)) {
                $metaFill['notes'] = $payload['notes'];
            }
            if (array_key_exists('due_date', $payload)) {
                $metaFill['due_date'] = $payload['due_date'];
            }
            if (array_key_exists('issue_date', $payload)) {
                $metaFill['issue_date'] = $payload['issue_date'];
            }
            if ($metaFill !== []) {
                $invoice->fill($metaFill);
                $invoice->save();
            }

            if (array_key_exists('items', $payload) && is_array($payload['items'])) {
                $mergeKeys = $payload['merge_section_keys'] ?? null;
                $incoming = $this->normalizeIncomingItems($payload['items']);

                if (is_array($mergeKeys) && count($mergeKeys) > 0) {
                    $normalizedKeys = array_map(
                        static fn ($k): string => self::normalizeSectionKey((string) $k),
                        $mergeKeys
                    );
                    $existing = $invoice->items()->get()->map(fn (InvoiceItem $item): array => $this->itemModelToArray($item))->all();
                    $kept = array_values(array_filter(
                        $existing,
                        static fn (array $row): bool => ! in_array(self::normalizeSectionKey((string) ($row['section_key'] ?? 'other')), $normalizedKeys, true)
                    ));
                    $merged = array_merge($kept, $incoming);
                    $this->replaceInvoiceItems($invoice, $merged);
                } else {
                    $this->replaceInvoiceItems($invoice, $incoming);
                }

                $invoice->refresh();
                FinancialService::syncInvoiceTotals($invoice);

                if (Schema::hasTable('customer_transactions')) {
                    CustomerTransaction::query()
                        ->where('invoice_id', $invoice->id)
                        ->where('type', 'debit')
                        ->update([
                            'amount' => $invoice->net_amount,
                            'currency_id' => $invoice->currency_id,
                        ]);
                }

                if ($invoice->shipment_id) {
                    ActivityLogger::log('shipment.client_invoice_items_updated', $invoice->shipment, [
                        'invoice_id' => $invoice->id,
                        'draft' => true,
                    ]);
                }
            }

            return $invoice->fresh(['client', 'shipment', 'items', 'payments']);
        });
    }

    /**
     * @param  list<array<string,mixed>>  $items
     * @return list<array<string,mixed>>
     */
    private function normalizeIncomingItems(array $items): array
    {
        $out = [];
        foreach ($items as $idx => $itemData) {
            if (! is_array($itemData)) {
                continue;
            }
            $qty = (float) ($itemData['quantity'] ?? 0);
            $unitPrice = (float) ($itemData['unit_price'] ?? 0);
            if ($qty < 0 || $unitPrice < 0) {
                continue;
            }
            $section = self::normalizeSectionKey((string) ($itemData['section_key'] ?? 'other'));
            $description = trim((string) ($itemData['description'] ?? $itemData['title'] ?? ''));
            if ($description === '' && $qty <= 0) {
                continue;
            }
            if ($description === '') {
                $description = __('Line item');
            }

            $out[] = [
                'item_id' => $itemData['item_id'] ?? null,
                'description' => $description,
                'title' => $itemData['title'] ?? $description,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'currency_code' => strtoupper((string) ($itemData['currency_code'] ?? 'USD')),
                'section_key' => $section,
                'order_index' => (int) ($itemData['order_index'] ?? $idx),
                'source_key' => $itemData['source_key'] ?? null,
                'cost_unit_price' => (float) ($itemData['cost_unit_price'] ?? 0),
                'cost_line_total' => array_key_exists('cost_line_total', $itemData)
                    ? (float) $itemData['cost_line_total']
                    : round($qty * (float) ($itemData['cost_unit_price'] ?? 0), 2),
            ];
        }

        return $out;
    }

    /**
     * @return array<string,mixed>
     */
    private function itemModelToArray(InvoiceItem $item): array
    {
        return [
            'item_id' => $item->item_id,
            'description' => $item->description,
            'title' => $item->title ?? $item->description,
            'quantity' => (float) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'currency_code' => strtoupper((string) ($item->currency_code ?: 'USD')),
            'section_key' => self::normalizeSectionKey((string) ($item->section_key ?: 'other')),
            'order_index' => (int) ($item->order_index ?? 0),
            'source_key' => $item->source_key,
            'cost_unit_price' => (float) ($item->cost_unit_price ?? 0),
            'cost_line_total' => (float) ($item->cost_line_total ?? 0),
        ];
    }

    /**
     * @param  list<array<string,mixed>>  $items
     */
    private function replaceInvoiceItems(Invoice $invoice, array $items): void
    {
        $invoice->items()->delete();

        foreach ($items as $itemData) {
            $qty = (float) $itemData['quantity'];
            $unitPrice = (float) $itemData['unit_price'];
            $lineTotal = round($qty * $unitPrice, 2);
            $costUnitPrice = (float) ($itemData['cost_unit_price'] ?? 0);
            $costLineTotal = array_key_exists('cost_line_total', $itemData)
                ? round((float) $itemData['cost_line_total'], 2)
                : round($qty * $costUnitPrice, 2);

            $payload = [
                'invoice_id' => $invoice->id,
                'item_id' => $itemData['item_id'] ?? null,
                'description' => $itemData['description'],
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
                'currency_code' => strtoupper((string) $itemData['currency_code']),
                'section_key' => $itemData['section_key'],
                'order_index' => (int) ($itemData['order_index'] ?? 0),
                'source_key' => $itemData['source_key'] ?? null,
                'cost_unit_price' => $costUnitPrice,
                'cost_line_total' => $costLineTotal,
            ];

            if (Schema::hasColumn('invoice_items', 'title')) {
                $payload['title'] = $itemData['title'] ?? null;
            }

            InvoiceItem::create($payload);
        }
    }

    private static function normalizeSectionKey(string $key): string
    {
        $k = strtolower(trim($key));

        return $k !== '' ? $k : 'other';
    }

    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.date('Y');

        $maxSeq = Invoice::query()
            ->where('invoice_number', 'like', $prefix.'-%')
            ->pluck('invoice_number')
            ->map(function (string $number): int {
                if (preg_match('/-(\d+)$/', $number, $m)) {
                    return (int) $m[1];
                }

                return 0;
            })
            ->max() ?? 0;

        return $prefix.'-'.str_pad((string) ($maxSeq + 1), 5, '0', STR_PAD_LEFT);
    }
}
