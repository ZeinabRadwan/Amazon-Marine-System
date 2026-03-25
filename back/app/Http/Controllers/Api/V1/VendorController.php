<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVendorRequest;
use App\Http\Requests\UpdateVendorRequest;
use App\Models\Vendor;
use App\Models\VendorBill;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $query = Vendor::query();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $vendors = $query->orderBy('name')->get();

        return response()->json([
            'data' => $vendors,
        ]);
    }

    public function store(StoreVendorRequest $request)
    {
        $vendor = Vendor::create($request->validated());

        return response()->json([
            'data' => $vendor,
        ], 201);
    }

    public function show(Vendor $vendor)
    {
        return response()->json([
            'data' => $vendor,
        ]);
    }

    public function update(UpdateVendorRequest $request, Vendor $vendor)
    {
        $vendor->fill($request->validated());
        $vendor->save();

        return response()->json([
            'data' => $vendor,
        ]);
    }

    public function destroy(Vendor $vendor)
    {
        $vendor->delete();

        return response()->json([
            'message' => __('Vendor deleted.'),
        ]);
    }

    public function stats(Request $request)
    {
        $query = Vendor::query();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $vendorIds = $query->pluck('id');

        $bills = VendorBill::whereIn('vendor_id', $vendorIds)
            ->whereNotIn('status', ['cancelled'])
            ->select('vendor_id', DB::raw('SUM(net_amount) as total'))
            ->groupBy('vendor_id')
            ->get()
            ->keyBy('vendor_id');

        $paid = Payment::whereNotNull('vendor_bill_id')
            ->whereIn('vendor_bill_id', VendorBill::whereIn('vendor_id', $vendorIds)->pluck('id'))
            ->select('vendor_bill_id', DB::raw('SUM(amount) as total'))
            ->groupBy('vendor_bill_id')
            ->get()
            ->keyBy('vendor_bill_id');

        $billTotals = VendorBill::whereIn('vendor_id', $vendorIds)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $balanceByVendor = [];
        $revenueByVendor = [];
        foreach ($billTotals as $bill) {
            $vid = $bill->vendor_id;
            $net = (float) $bill->net_amount;
            $paidAmount = (float) ($paid->get($bill->id)->total ?? 0);
            $balanceByVendor[$vid] = ($balanceByVendor[$vid] ?? 0) + $net - $paidAmount;
            $revenueByVendor[$vid] = ($revenueByVendor[$vid] ?? 0) + $net;
        }

        $totalBalanceDue = array_sum($balanceByVendor);
        $currency = $request->query('currency', 'USD');
        $topPartner = null;
        $topRevenue = 0;
        foreach ($revenueByVendor as $vid => $rev) {
            if ($rev > $topRevenue) {
                $topRevenue = $rev;
                $topPartner = Vendor::find($vid);
            }
        }

        return response()->json([
            'data' => [
                'total_count' => (int) $query->count(),
                'total_balance_due' => round($totalBalanceDue, 2),
                'currency' => $currency,
                'top_partner' => $topPartner ? [
                    'id' => $topPartner->id,
                    'name' => $topPartner->name,
                    'type' => $topPartner->type,
                    'revenue' => round($topRevenue, 2),
                ] : null,
            ],
        ]);
    }

    public function charts(Request $request)
    {
        $query = Vendor::query();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $byType = (clone $query)->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->get()
            ->map(fn ($row) => ['type' => $row->type ?? 'other', 'count' => (int) $row->count]);

        $months = max(1, (int) $request->query('months', 6));
        $from = now()->subMonths($months - 1)->startOfMonth();

        $vendorIds = (clone $query)->pluck('id');
        $billsByMonth = VendorBill::whereIn('vendor_id', $vendorIds)
            ->whereNotIn('status', ['cancelled'])
            ->whereDate('bill_date', '>=', $from)
            ->get()
            ->groupBy(fn ($b) => $b->bill_date?->format('Y-m-01') ?? '')
            ->map(fn ($group) => (float) $group->sum('net_amount'));

        $labels = [];
        $values = [];
        $cursor = $from->copy();
        while ($cursor <= now()) {
            $key = $cursor->format('Y-m-01');
            $labels[] = $key;
            $values[] = $billsByMonth->get($key, 0);
            $cursor->addMonth();
        }

        return response()->json([
            'data' => [
                'by_type' => $byType,
                'monthly_totals' => [
                    'labels' => $labels,
                    'values' => $values,
                ],
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = Vendor::query();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $hasBalance = $request->query('has_balance');
        $vendors = $query->orderBy('name')->get();

        if ($hasBalance === '1' || $hasBalance === 'true') {
            $vendorIds = $vendors->pluck('id');
            $bills = VendorBill::whereIn('vendor_id', $vendorIds)->whereNotIn('status', ['cancelled'])->get();
            $paid = Payment::whereNotNull('vendor_bill_id')->whereIn('vendor_bill_id', $bills->pluck('id'))->select('vendor_bill_id', DB::raw('SUM(amount) as total'))->groupBy('vendor_bill_id')->get()->keyBy('vendor_bill_id');
            $balanceByVendor = [];
            foreach ($bills as $bill) {
                $net = (float) $bill->net_amount;
                $paidAmount = (float) ($paid->get($bill->id)->total ?? 0);
                $balanceByVendor[$bill->vendor_id] = ($balanceByVendor[$bill->vendor_id] ?? 0) + $net - $paidAmount;
            }
            $vendors = $vendors->filter(fn ($v) => ($balanceByVendor[$v->id] ?? 0) > 0)->values();
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="vendors.csv"',
        ];

        return new StreamedResponse(function () use ($vendors) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['name', 'type', 'email', 'phone', 'address', 'city', 'country', 'payment_terms', 'notes']);
            foreach ($vendors as $v) {
                fputcsv($out, [
                    $v->name,
                    $v->type ?? '',
                    $v->email ?? '',
                    $v->phone ?? '',
                    $v->address ?? '',
                    $v->city ?? '',
                    $v->country ?? '',
                    $v->payment_terms ?? '',
                    $v->notes ?? '',
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }
}

