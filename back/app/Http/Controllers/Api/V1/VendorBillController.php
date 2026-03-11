<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\VendorBill;
use App\Models\VendorBillItem;
use App\Services\ActivityLogger;
use App\Services\FinancialService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorBillController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        $query = VendorBill::query()->with(['vendor', 'shipment']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($vendorId = $request->query('vendor_id')) {
            $query->where('vendor_id', $vendorId);
        }

        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }

        if ($currency = $request->query('currency_code')) {
            $query->where('currency_code', $currency);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('bill_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('bill_date', '<=', $to);
        }

        $bills = $query->orderByDesc('bill_date')->get();

        return response()->json([
            'data' => $bills,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'bill_number' => ['required', 'string', 'max:255', 'unique:vendor_bills,bill_number'],
            'vendor_id' => ['required', 'integer', 'exists:vendors,id'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'bill_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency_code' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $bill = DB::transaction(function () use ($validated) {
            $bill = new VendorBill();
            $bill->bill_number = $validated['bill_number'];
            $bill->vendor_id = $validated['vendor_id'];
            $bill->shipment_id = $validated['shipment_id'] ?? null;
            $bill->bill_date = $validated['bill_date'];
            $bill->due_date = $validated['due_date'] ?? null;
            $bill->status = 'draft';
            $bill->currency_code = $validated['currency_code'];
            $bill->notes = $validated['notes'] ?? null;
            $bill->total_amount = 0;
            $bill->tax_amount = 0;
            $bill->net_amount = 0;
            $bill->save();

            foreach ($validated['items'] as $itemData) {
                $lineTotal = $itemData['quantity'] * $itemData['unit_price'];

                VendorBillItem::create([
                    'vendor_bill_id' => $bill->id,
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'line_total' => $lineTotal,
                ]);
            }

            FinancialService::syncVendorBillTotals($bill);

            ActivityLogger::log('vendor_bill.created', $bill, [
                'vendor_id' => $bill->vendor_id,
                'shipment_id' => $bill->shipment_id,
            ]);

            return $bill;
        });

        return response()->json([
            'data' => $bill->fresh(['vendor', 'shipment', 'items']),
        ], 201);
    }

    public function show(Request $request, VendorBill $vendorBill)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        return response()->json([
            'data' => $vendorBill->load(['vendor', 'shipment', 'items', 'payments']),
        ]);
    }

    public function update(Request $request, VendorBill $vendorBill)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if (! in_array($vendorBill->status, ['draft', 'approved'], true)) {
            return response()->json([
                'message' => 'Only draft or approved vendor bills can be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'due_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        $vendorBill->fill($validated);
        $vendorBill->save();

        ActivityLogger::log('vendor_bill.updated', $vendorBill, [
            'changes' => $vendorBill->getChanges(),
        ]);

        return response()->json([
            'data' => $vendorBill->fresh(),
        ]);
    }

    public function approve(Request $request, VendorBill $vendorBill)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if ($vendorBill->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft vendor bills can be approved.',
            ], 422);
        }

        $vendorBill->status = 'approved';
        $vendorBill->save();

        ActivityLogger::log('vendor_bill.approved', $vendorBill);

        return response()->json([
            'data' => $vendorBill,
        ]);
    }

    public function cancel(Request $request, VendorBill $vendorBill)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        if (! in_array($vendorBill->status, ['draft', 'approved'], true)) {
            return response()->json([
                'message' => 'Only draft or approved vendor bills can be cancelled.',
            ], 422);
        }

        $vendorBill->status = 'cancelled';
        $vendorBill->save();

        ActivityLogger::log('vendor_bill.cancelled', $vendorBill);

        return response()->json([
            'data' => $vendorBill,
        ]);
    }

    public function recordPayment(Request $request, VendorBill $vendorBill)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_code' => ['required', 'string', 'size:3'],
            'method' => ['required', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['nullable', 'date'],
        ]);

        $payment = new Payment();
        $payment->type = 'vendor_payment';
        $payment->vendor_bill_id = $vendorBill->id;
        $payment->vendor_id = $vendorBill->vendor_id;
        $payment->amount = $validated['amount'];
        $payment->currency_code = $validated['currency_code'];
        $payment->method = $validated['method'];
        $payment->reference = $validated['reference'] ?? null;
        $payment->paid_at = $validated['paid_at'] ?? now();
        $payment->created_by_id = $request->user()->id;
        $payment->save();

        FinancialService::handlePaymentPosted($payment);

        ActivityLogger::log('vendor_bill.payment_recorded', $vendorBill, [
            'payment_id' => $payment->id,
        ]);

        return response()->json([
            'data' => $vendorBill->fresh(['vendor', 'shipment', 'items', 'payments']),
        ], 201);
    }

    public function export(Request $request)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        $query = VendorBill::query()->with(['vendor', 'shipment']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($vendorId = $request->query('vendor_id')) {
            $query->where('vendor_id', $vendorId);
        }

        if ($currency = $request->query('currency_code')) {
            $query->where('currency_code', $currency);
        }

        if ($month = $request->query('month')) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $query->whereYear('bill_date', (int) $parts[0])
                    ->whereMonth('bill_date', (int) $parts[1]);
            }
        }

        if ($ids = $request->query('ids')) {
            $idArray = is_array($ids) ? $ids : array_filter(array_map('intval', explode(',', (string) $ids)));
            if ($idArray) {
                $query->whereIn('id', $idArray);
            }
        }

        $bills = $query->orderByDesc('bill_date')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="vendor-bills-export-'.date('Y-m-d').'.csv"',
        ];

        $callback = static function () use ($bills): void {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, [
                'bill_id',
                'bill_number',
                'vendor',
                'shipment_bl',
                'bill_date',
                'due_date',
                'status',
                'net_amount',
                'currency_code',
            ]);

            foreach ($bills as $bill) {
                fputcsv($fh, [
                    $bill->id,
                    $bill->bill_number,
                    $bill->vendor?->name ?? '',
                    $bill->shipment?->bl_number ?? '',
                    $bill->bill_date?->toDateString() ?? '',
                    $bill->due_date?->toDateString() ?? '',
                    $bill->status,
                    $bill->net_amount,
                    $bill->currency_code,
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }
}

