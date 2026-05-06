<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user && ($user->can('financial.view') || $user->can('accounting.view')), 403);

        $query = Payment::query()->with(['invoice', 'vendorBill', 'client', 'vendor', 'shipment', 'sourceAccount', 'targetAccount', 'createdBy']);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($vendorId = $request->query('vendor_id')) {
            $query->where('vendor_id', $vendorId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('paid_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('paid_at', '<=', $to);
        }

        $payments = $query->orderByDesc('paid_at')->get();

        return response()->json([
            'data' => $payments,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user && ($user->can('financial.manage') || $user->can('accounting.manage')), 403);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:client_receipt,vendor_payment'],
            'invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'vendor_bill_id' => ['nullable', 'integer', 'exists:vendor_bills,id'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_code' => ['required', 'string', 'size:3'],
            'method' => ['nullable', 'string', 'max:40'],
            'source_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'target_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'target_currency_code' => ['nullable', 'string', 'size:3'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'converted_amount' => ['nullable', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'proof_file' => ['nullable', 'file', 'max:10240'],
            'paid_at' => ['nullable', 'date'],
        ]);

        $payment = new Payment();
        if (!empty($validated['invoice_id']) && empty($validated['client_id'])) {
            $invoice = \App\Models\Invoice::query()->find($validated['invoice_id']);
            if ($invoice) {
                $validated['client_id'] = $invoice->client_id;
                $validated['shipment_id'] = $validated['shipment_id'] ?? $invoice->shipment_id;
            }
        }
        if (!empty($validated['vendor_bill_id']) && empty($validated['vendor_id'])) {
            $bill = \App\Models\VendorBill::query()->find($validated['vendor_bill_id']);
            if ($bill) {
                $validated['vendor_id'] = $bill->vendor_id;
                $validated['shipment_id'] = $validated['shipment_id'] ?? $bill->shipment_id;
            }
        }
        $payment->fill($validated);
        if ($request->hasFile('proof_file')) {
            $path = $request->file('proof_file')->store('payments/proofs', 'public');
            $payment->proof_path = $path;
        }
        $payment->paid_at = $validated['paid_at'] ?? now();
        $payment->created_by_id = $request->user()->id;
        $payment->save();

        FinancialService::handlePaymentPosted($payment);

        ActivityLogger::log('payment.created', $payment, [
            'type' => $payment->type,
            'amount' => $payment->amount,
        ]);

        return response()->json([
            'data' => $payment->fresh(['invoice', 'vendorBill', 'client', 'vendor', 'shipment', 'sourceAccount', 'targetAccount'])?->toArray() + [
                'proof_url' => $payment->proof_path ? Storage::disk('public')->url($payment->proof_path) : null,
            ],
        ], 201);
    }
}

