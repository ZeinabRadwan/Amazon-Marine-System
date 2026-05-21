<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\VendorBill;
use App\Services\ActivityLogger;
use App\Services\BankPaymentCurrencyService;
use App\Services\FinancialService;
use App\Services\PrepaidPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user && ($user->can('financial.view') || $user->can('accounting.view')), 403);

        $query = Payment::query()->with([
            'invoice',
            'vendorBill',
            'client',
            'vendor',
            'shipment',
            'sourceAccount',
            'targetAccount',
            'createdBy',
        ]);

        if (Schema::hasTable('treasury_entries')) {
            $query->with([
                'treasuryEntries' => static fn ($q) => $q
                    ->select(['id', 'payment_id', 'reference', 'entry_date', 'notes'])
                    ->orderByDesc('id')
                    ->limit(5),
            ]);
        }

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

        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', (int) $shipmentId);
        }

        if ($request->query('unallocated') === '1' || $request->query('unallocated') === 'true') {
            $query->whereNull('invoice_id');
        }

        $payments = $query->orderByDesc('paid_at')->get();

        $data = $payments->map(static function (Payment $p): array {
            $arr = $p->toArray();
            $arr['proof_url'] = $p->proof_path ? Storage::disk('public')->url($p->proof_path) : null;
            $label = $p->sourceAccount ? trim($p->sourceAccount->primaryDisplayName()) : '';
            if ($label !== '') {
                $arr['source_account_label'] = $label;
                $arr['bank_account_name'] = $label;
                $arr['bank_name'] = $label;
            }

            return $arr;
        });

        return response()->json([
            'data' => $data,
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
            'bank_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
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

        if ($validated['type'] === 'client_receipt' && empty($validated['invoice_id']) && empty($validated['client_id'])) {
            if (! empty($validated['shipment_id'])) {
                $shipment = Shipment::query()->find($validated['shipment_id']);
                if ($shipment?->client_id) {
                    $validated['client_id'] = $shipment->client_id;
                }
            }
        }

        if ($validated['type'] === 'client_receipt' && empty($validated['invoice_id']) && empty($validated['client_id'])) {
            throw ValidationException::withMessages([
                'client_id' => [__('Client is required for advance payments.')],
            ]);
        }

        if (! empty($validated['invoice_id']) && empty($validated['client_id'])) {
            $invoice = Invoice::query()->find($validated['invoice_id']);
            if ($invoice) {
                $validated['client_id'] = $invoice->client_id;
                $validated['shipment_id'] = $validated['shipment_id'] ?? $invoice->shipment_id;
            }
        }
        if (! empty($validated['vendor_bill_id']) && empty($validated['vendor_id'])) {
            $bill = VendorBill::query()->find($validated['vendor_bill_id']);
            if ($bill) {
                $validated['vendor_id'] = $bill->vendor_id;
                $validated['shipment_id'] = $validated['shipment_id'] ?? $bill->shipment_id;
            }
        }
        if (! isset($validated['source_account_id']) && ! empty($validated['bank_account_id'])) {
            $validated['source_account_id'] = $validated['bank_account_id'];
        }
        BankPaymentCurrencyService::prepareForBank($validated);

        try {
            $payment = DB::transaction(function () use ($request, $validated, $user) {
                $payment = new Payment;
                $payment->fill($validated);
                if ($request->hasFile('proof_file')) {
                    $path = $request->file('proof_file')->store('payments/proofs', 'public');
                    $payment->proof_path = $path;
                }
                $payment->paid_at = $validated['paid_at'] ?? now();
                $payment->created_by_id = $user->id;
                $payment->save();

                if ($payment->type === 'client_receipt' && ! $payment->invoice_id) {
                    if (empty($payment->notes)) {
                        $payment->notes = __('Advance payment (prepaid)');
                        $payment->save();
                    }
                    PrepaidPaymentService::recordPrepaidCredit($payment);
                }

                FinancialService::handlePaymentPosted($payment);

                return $payment;
            });
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?? __('bank.insufficient_balance_currency'),
                'errors' => $e->errors(),
            ], 422);
        }

        ActivityLogger::log('payment.created', $payment, [
            'type' => $payment->type,
            'amount' => $payment->amount,
        ]);

        $fresh = $payment->fresh(['invoice', 'vendorBill', 'client', 'vendor', 'shipment', 'sourceAccount', 'targetAccount']);
        $payload = $fresh?->toArray() ?? [];
        $payload['proof_url'] = $payment->proof_path ? Storage::disk('public')->url($payment->proof_path) : null;
        $label = $fresh?->sourceAccount ? trim($fresh->sourceAccount->primaryDisplayName()) : '';
        if ($label !== '') {
            $payload['source_account_label'] = $label;
            $payload['bank_account_name'] = $label;
            $payload['bank_name'] = $label;
        }

        return response()->json([
            'data' => $payload,
        ], 201);
    }
}
