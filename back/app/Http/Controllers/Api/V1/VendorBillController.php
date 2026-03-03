<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
}

