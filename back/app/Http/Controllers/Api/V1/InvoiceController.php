<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        $query = Invoice::query()->with(['client', 'shipment']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }

        if ($currency = $request->query('currency_code')) {
            $query->where('currency_code', $currency);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('issue_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('issue_date', '<=', $to);
        }

        $invoices = $query->orderByDesc('issue_date')->get();

        return response()->json([
            'data' => $invoices,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'invoice_number' => ['required', 'string', 'max:255', 'unique:invoices,invoice_number'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency_code' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($validated, $request) {
            $invoice = new Invoice();
            $invoice->invoice_number = $validated['invoice_number'];
            $invoice->shipment_id = $validated['shipment_id'] ?? null;
            $invoice->client_id = $validated['client_id'];
            $invoice->issue_date = $validated['issue_date'];
            $invoice->due_date = $validated['due_date'] ?? null;
            $invoice->status = 'draft';
            $invoice->currency_code = $validated['currency_code'];
            $invoice->notes = $validated['notes'] ?? null;
            $invoice->total_amount = 0;
            $invoice->tax_amount = 0;
            $invoice->net_amount = 0;
            $invoice->save();

            foreach ($validated['items'] as $itemData) {
                $lineTotal = $itemData['quantity'] * $itemData['unit_price'];

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'line_total' => $lineTotal,
                ]);
            }

            FinancialService::syncInvoiceTotals($invoice);

            ActivityLogger::log('invoice.created', $invoice, [
                'client_id' => $invoice->client_id,
                'shipment_id' => $invoice->shipment_id,
            ]);

            return $invoice;
        });

        return response()->json([
            'data' => $invoice->fresh(['client', 'shipment', 'items']),
        ], 201);
    }

    public function show(Request $request, Invoice $invoice)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        return response()->json([
            'data' => $invoice->load(['client', 'shipment', 'items', 'payments']),
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if (! in_array($invoice->status, ['draft', 'issued'], true)) {
            return response()->json([
                'message' => 'Only draft or issued invoices can be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'due_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        $invoice->fill($validated);
        $invoice->save();

        ActivityLogger::log('invoice.updated', $invoice, [
            'changes' => $invoice->getChanges(),
        ]);

        return response()->json([
            'data' => $invoice->fresh(),
        ]);
    }

    public function issue(Request $request, Invoice $invoice)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft invoices can be issued.',
            ], 422);
        }

        $invoice->status = 'issued';
        $invoice->save();

        ActivityLogger::log('invoice.issued', $invoice);

        return response()->json([
            'data' => $invoice,
        ]);
    }

    public function cancel(Request $request, Invoice $invoice)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if (! in_array($invoice->status, ['draft', 'issued'], true)) {
            return response()->json([
                'message' => 'Only draft or issued invoices can be cancelled.',
            ], 422);
        }

        $invoice->status = 'cancelled';
        $invoice->save();

        ActivityLogger::log('invoice.cancelled', $invoice);

        return response()->json([
            'data' => $invoice,
        ]);
    }
}

