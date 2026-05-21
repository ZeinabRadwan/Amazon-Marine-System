<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CashReceipt;
use App\Models\Client;
use App\Services\CashReceiptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class CashReceiptController extends Controller
{
    public function eligibleCustomers(Request $request)
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $search = trim((string) $request->query('search', ''));
        $rows = CashReceiptService::eligibleCustomers($search !== '' ? $search : null);

        return response()->json(['data' => $rows]);
    }

    public function index(Request $request)
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $query = CashReceipt::query()
            ->with(['client:id,name,company_name', 'createdBy:id,name'])
            ->withCount('payments')
            ->orderByDesc('created_at');

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', (int) $clientId);
        }

        $rows = $query->limit(200)->get()->map(static function (CashReceipt $r): array {
            return [
                'id' => $r->id,
                'client_id' => $r->client_id,
                'client_name' => $r->client?->company_name ?: $r->client?->name,
                'receipt_number' => $r->receipt_number,
                'receipt_kind' => $r->receipt_kind,
                'totals_by_currency' => $r->totals_by_currency ?? [],
                'payment_count' => (int) ($r->payments_count ?? 0),
                'locale' => $r->locale,
                'created_at' => $r->created_at?->toDateTimeString(),
                'created_by_name' => $r->createdBy?->name,
                'has_pdf' => (bool) $r->pdf_path,
            ];
        });

        return response()->json(['data' => $rows]);
    }

    public function receiptablePayments(Request $request, Client $client)
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $payments = CashReceiptService::receiptablePayments((int) $client->id);

        $receiptedCount = (int) DB::table('cash_receipt_payment')
            ->join('payments', 'payments.id', '=', 'cash_receipt_payment.payment_id')
            ->where('payments.client_id', $client->id)
            ->count();

        $data = $payments->map(static function ($p): array {
            $label = $p->sourceAccount ? trim($p->sourceAccount->primaryDisplayName()) : null;

            return [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'currency_code' => strtoupper((string) ($p->currency_code ?: 'USD')),
                'method' => $p->method,
                'reference' => $p->reference,
                'paid_at' => $p->paid_at?->toDateString(),
                'invoice_id' => $p->invoice_id,
                'is_advance' => ! $p->invoice_id,
                'shipment_id' => $p->shipment_id,
                'shipment_reference' => $p->shipment?->bl_number,
                'invoice_reference' => $p->invoice?->invoice_number,
                'source_account_label' => $label,
            ];
        })->values()->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'receipted_count' => $receiptedCount,
                'available_count' => count($data),
            ],
        ]);
    }

    public function preview(Request $request)
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);

        $validated = $request->validate([
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'payment_ids' => ['required', 'array', 'min:1'],
            'payment_ids.*' => ['integer'],
            'locale' => ['nullable', 'string', 'in:en,ar'],
        ]);

        try {
            $payload = CashReceiptService::buildPayload(
                (int) $validated['client_id'],
                $validated['payment_ids'],
                (string) ($validated['locale'] ?? 'en'),
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first(),
                'errors' => $e->errors(),
            ], 422);
        }

        $payments = $payload['payments'];
        $labels = $payload['labels'];
        $kind = (string) $payload['receipt_kind'];
        $client = $payload['client'];
        $kindLabel = match ($kind) {
            'advance' => $labels['kind_advance'],
            'shipment' => $labels['kind_shipment'],
            default => $labels['kind_mixed'],
        };
        $kindBadge = match ($kind) {
            'advance' => 'ADVANCE',
            'shipment' => 'SHIPMENT',
            default => 'MIXED',
        };

        return response()->json([
            'data' => [
                'receipt_number_preview' => $payload['receipt_number_preview'],
                'receipt_kind' => $kind,
                'receipt_kind_label' => $kindLabel,
                'receipt_kind_badge' => $kindBadge,
                'totals_by_currency' => $payload['totals_by_currency'],
                'client_name' => trim((string) $client->name),
                'company_name' => trim((string) ($client->company_name ?? '')),
                'received_from' => trim((string) ($client->company_name ?: $client->name)),
                'company' => $payload['company'],
                'doc_title' => $labels['doc_title'],
                'payment_methods' => $payments->pluck('method')->filter()->unique()->values()->all(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user && ($user->can('accounting.manage') || $user->can('financial.manage')), 403);

        $validated = $request->validate([
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'payment_ids' => ['required', 'array', 'min:1'],
            'payment_ids.*' => ['integer'],
            'locale' => ['nullable', 'string', 'in:en,ar'],
        ]);

        try {
            $receipt = CashReceiptService::create(
                (int) $validated['client_id'],
                $validated['payment_ids'],
                (int) $user->id,
                (string) ($validated['locale'] ?? 'en'),
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first(),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'data' => [
                'id' => $receipt->id,
                'receipt_number' => $receipt->receipt_number,
                'receipt_kind' => $receipt->receipt_kind,
                'totals_by_currency' => $receipt->totals_by_currency,
                'client_id' => $receipt->client_id,
                'created_at' => $receipt->created_at?->toDateTimeString(),
            ],
        ], 201);
    }

    public function pdf(Request $request, CashReceipt $cashReceipt)
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        if ($cashReceipt->pdf_path && Storage::disk('public')->exists($cashReceipt->pdf_path)) {
            $basename = basename($cashReceipt->pdf_path);

            return Storage::disk('public')->response($cashReceipt->pdf_path, $basename, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$basename.'"',
            ]);
        }

        $binary = CashReceiptService::renderPdfFromReceipt($cashReceipt);

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$cashReceipt->receipt_number.'.pdf"',
        ]);
    }
}
