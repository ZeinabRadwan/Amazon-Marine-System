<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        $query = Payment::query()->with(['invoice', 'vendorBill', 'client', 'vendor', 'createdBy']);

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
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:client_receipt,vendor_payment'],
            'invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'vendor_bill_id' => ['nullable', 'integer', 'exists:vendor_bills,id'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_code' => ['required', 'string', 'size:3'],
            'method' => ['nullable', 'string', 'max:20'],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['nullable', 'date'],
        ]);

        if ($validated['type'] === 'client_receipt' && empty($validated['invoice_id']) && empty($validated['client_id'])) {
            return response()->json([
                'message' => 'Client receipt must be linked to an invoice or client.',
            ], 422);
        }

        if ($validated['type'] === 'vendor_payment' && empty($validated['vendor_bill_id']) && empty($validated['vendor_id'])) {
            return response()->json([
                'message' => 'Vendor payment must be linked to a vendor bill or vendor.',
            ], 422);
        }

        $payment = new Payment();
        $payment->fill($validated);
        $payment->paid_at = $validated['paid_at'] ?? now();
        $payment->created_by_id = $request->user()->id;
        $payment->save();

        FinancialService::handlePaymentPosted($payment);

        ActivityLogger::log('payment.created', $payment, [
            'type' => $payment->type,
            'amount' => $payment->amount,
        ]);

        return response()->json([
            'data' => $payment->fresh(['invoice', 'vendorBill', 'client', 'vendor']),
        ], 201);
    }
}

