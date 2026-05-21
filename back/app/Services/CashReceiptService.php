<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\CashReceipt;
use App\Models\Client;
use App\Models\Payment;
use App\Support\PdfLogo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Mpdf\Mpdf;

class CashReceiptService
{
    /**
     * Clients with at least one payment not yet on a cash receipt.
     *
     * @return list<array<string, mixed>>
     */
    public static function eligibleCustomers(?string $search = null, int $limit = 40): array
    {
        $receiptedPaymentIds = DB::table('cash_receipt_payment')->pluck('payment_id');

        $availableRows = Payment::query()
            ->where('type', 'client_receipt')
            ->whereNotNull('client_id')
            ->when($receiptedPaymentIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $receiptedPaymentIds))
            ->selectRaw('client_id, COUNT(*) as cnt')
            ->groupBy('client_id')
            ->having('cnt', '>', 0)
            ->pluck('cnt', 'client_id');

        if ($availableRows->isEmpty()) {
            return [];
        }

        $receiptedRows = Payment::query()
            ->join('cash_receipt_payment', 'payments.id', '=', 'cash_receipt_payment.payment_id')
            ->where('payments.type', 'client_receipt')
            ->selectRaw('payments.client_id, COUNT(*) as cnt')
            ->groupBy('payments.client_id')
            ->pluck('cnt', 'client_id');

        $query = Client::query()->whereIn('id', $availableRows->keys()->all());
        $term = trim((string) $search);
        if ($term !== '') {
            $like = '%'.$term.'%';
            $query->where(function ($q) use ($like, $term): void {
                $q->where('name', 'like', $like)
                    ->orWhere('company_name', 'like', $like);
                if (ctype_digit($term)) {
                    $q->orWhere('id', (int) $term);
                }
            });
        }

        return $query->orderByRaw('COALESCE(company_name, name)')->limit($limit)->get()->map(static function (Client $c) use ($availableRows, $receiptedRows): array {
            $id = (int) $c->id;

            $name = trim((string) $c->name);
            $company = trim((string) ($c->company_name ?? ''));

            return [
                'client_id' => $id,
                'client_name' => $name,
                'company_name' => $company,
                'customer_name' => $company !== '' ? $company : $name,
                'available_payments_count' => (int) ($availableRows[$id] ?? 0),
                'receipted_payments_count' => (int) ($receiptedRows[$id] ?? 0),
            ];
        })->values()->all();
    }

    /**
     * @return Collection<int, Payment>
     */
    public static function receiptablePayments(int $clientId): Collection
    {
        $receiptedIds = DB::table('cash_receipt_payment')->pluck('payment_id');

        return Payment::query()
            ->with(['sourceAccount', 'shipment', 'invoice'])
            ->where('type', 'client_receipt')
            ->where('client_id', $clientId)
            ->when($receiptedIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $receiptedIds))
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  list<int>  $paymentIds
     * @return array<string, mixed>
     */
    public static function buildPayload(int $clientId, array $paymentIds, string $locale = 'en'): array
    {
        $payments = self::resolvePaymentsForClient($clientId, $paymentIds);
        $client = Client::query()->findOrFail($clientId);
        $totals = self::totalsByCurrency($payments);
        $kind = self::detectReceiptKind($payments);

        return [
            'client' => $client,
            'payments' => $payments,
            'totals_by_currency' => $totals,
            'receipt_kind' => $kind,
            'locale' => $locale === 'ar' ? 'ar' : 'en',
            'labels' => self::labels($locale === 'ar' ? 'ar' : 'en'),
            'company' => self::companyBlock(),
            'receipt_number_preview' => self::previewReceiptNumber(),
            'logo_src' => PdfLogo::transportInstructionsImgSrc(),
            'kind_band' => self::kindBandMeta($kind, self::labels($locale === 'ar' ? 'ar' : 'en')),
            'infobar' => self::infobarMeta($kind, $payments),
            'hero' => self::heroMeta($kind, $payments, $totals),
            'payment_detail_blocks' => self::paymentDetailBlocks($payments),
            'confirm' => self::confirmMeta($kind),
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function confirmMeta(string $kind): array
    {
        if ($kind === 'shipment') {
            return [
                'wrap_class' => 'confirm-shp',
                'ico_class' => 'c-ico-g',
                'en_class' => 'c-en-g',
                'en' => 'Payment Received & Invoice Settled — Amazon Marine acknowledges full receipt of the above amount.',
                'ar' => 'تم استلام الدفعة وتسوية الفاتورة — تُقرّ أمازون مارين باستلام المبلغ الكامل المذكور أعلاه.',
            ];
        }

        return [
            'wrap_class' => 'confirm-adv',
            'ico_class' => 'c-ico-o',
            'en_class' => 'c-en-o',
            'en' => 'Payment Received & Confirmed — Amazon Marine acknowledges receipt of the above amount.',
            'ar' => 'تم استلام الدفعة وتأكيدها — تُقرّ أمازون مارين باستلام المبلغ المذكور أعلاه.',
        ];
    }

    /**
     * @param  Collection<int, Payment>  $payments
     * @return list<array<string, string|null>>
     */
    public static function paymentDetailBlocks(Collection $payments): array
    {
        $blocks = [];
        foreach ($payments as $payment) {
            $blocks[] = [
                'method_pill' => self::paymentMethodPill((string) ($payment->method ?? '')),
                'source_account' => self::sourceAccountDisplayLabel($payment->sourceAccount),
                'currency' => strtoupper((string) ($payment->currency_code ?: 'USD')),
                'amount' => self::formatPaymentAmountDisplay($payment),
                'reference' => trim((string) ($payment->reference ?? '')) !== ''
                    ? trim((string) $payment->reference)
                    : 'PAY-'.$payment->id,
                'notes' => trim((string) ($payment->notes ?? '')) !== ''
                    ? trim((string) $payment->notes)
                    : null,
            ];
        }

        return $blocks;
    }

    private static function paymentMethodPill(string $method): string
    {
        $key = strtolower(trim($method));

        return match ($key) {
            'bank_transfer' => 'Bank Transfer — تحويل بنكي',
            'cash' => 'Cash — نقداً',
            'cheque', 'check' => 'Cheque — شيك',
            'internal', 'internal_transfer' => 'Internal Transfer — تحويل داخلي',
            '' => '—',
            default => ucwords(str_replace('_', ' ', $key)).' — '.$key,
        };
    }

    private static function sourceAccountDisplayLabel(?BankAccount $account): string
    {
        if ($account === null) {
            return '—';
        }

        $en = trim((string) ($account->name_en ?? ''));
        if ($en === '') {
            $en = trim((string) ($account->bank_name ?? $account->account_name ?? ''));
        }
        $ar = trim((string) ($account->name_ar ?? ''));

        if ($en !== '' && $ar !== '' && $en !== $ar) {
            return $en.' — '.$ar;
        }

        $primary = $account->primaryDisplayName();

        return $primary !== '' ? $primary : '—';
    }

    private static function formatPaymentAmountDisplay(Payment $payment): string
    {
        $code = strtoupper((string) ($payment->currency_code ?: 'USD'));
        $formatted = number_format((float) $payment->amount, 2);

        return match ($code) {
            'USD' => '$'.$formatted,
            'EUR' => '€'.$formatted,
            'EGP' => $formatted.' EGP',
            'GBP' => '£'.$formatted,
            default => $formatted.' '.$code,
        };
    }

    /**
     * @param  array<string, float|int|string>  $totalsByCurrency
     * @return array<string, mixed>
     */
    public static function heroMeta(string $kind, Collection $payments, array $totalsByCurrency): array
    {
        $invoiceRef = self::primaryInvoiceReference($payments);
        $notes = match ($kind) {
            'advance' => [
                'en' => 'This amount will be applied as credit against future invoices',
                'ar' => 'يُطبّق هذا المبلغ كرصيد دائن على الفواتير القادمة',
            ],
            'shipment' => [
                'en' => $invoiceRef ? "Full settlement — Invoice {$invoiceRef}" : 'Full settlement against invoice',
                'ar' => $invoiceRef ? "سداد كامل للفاتورة {$invoiceRef}" : 'سداد كامل للفاتورة',
            ],
            default => [
                'en' => 'Total amount received for selected payments',
                'ar' => 'إجمالي المبلغ المستلم للدفعات المحددة',
            ],
        };

        $amounts = [];
        $index = 0;
        foreach ($totalsByCurrency as $currency => $amount) {
            $code = strtoupper((string) $currency);
            $amounts[] = [
                'formatted' => number_format((float) $amount, 2),
                'currency' => $code,
                'cur_label' => self::currencyHeroLabel($code),
                'amt_class' => match ($index) {
                    0 => 'hero-amt-o',
                    1 => 'hero-amt-g',
                    default => 'hero-amt-yellow',
                },
            ];
            $index++;
        }

        return [
            'notes' => $notes,
            'amounts' => $amounts,
        ];
    }

    private static function currencyHeroLabel(string $code): string
    {
        $ar = match (strtoupper($code)) {
            'USD' => 'دولار أمريكي',
            'EGP' => 'جنيه مصري',
            'EUR' => 'يورو',
            'GBP' => 'جنيه إسترليني',
            'SAR' => 'ريال سعودي',
            'AED' => 'درهم إماراتي',
            default => $code,
        };

        return strtoupper($code).' — '.$ar;
    }

    /**
     * @return array<string, mixed>
     */
    public static function infobarMeta(string $kind, Collection $payments): array
    {
        $third = match ($kind) {
            'shipment' => [
                'lbl' => 'Invoice Ref.',
                'sub' => 'رقم الفاتورة المرتبطة',
                'val' => self::primaryInvoiceReference($payments) ?? '—',
                'val_mono' => true,
                'val_small' => true,
            ],
            'advance' => [
                'lbl' => 'Type',
                'sub' => 'نوع الدفعة',
                'val' => 'Advance / دفعة مقدمة',
                'val_mono' => false,
                'val_small' => false,
            ],
            default => self::infobarThirdMixed($payments),
        };

        return [
            'receipt_date_lbl' => 'Receipt Date',
            'receipt_date_sub' => 'تاريخ الإيصال',
            'payment_date_lbl' => 'Payment Date',
            'payment_date_sub' => 'تاريخ الدفع',
            'receipt_no_lbl' => 'Receipt No.',
            'receipt_no_sub' => 'رقم الإيصال',
            'third' => $third,
        ];
    }

    private static function primaryInvoiceReference(Collection $payments): ?string
    {
        foreach ($payments as $payment) {
            if ($payment->invoice_id && $payment->invoice) {
                $num = trim((string) ($payment->invoice->invoice_number ?? ''));

                return $num !== '' ? $num : null;
            }
        }

        return null;
    }

    /**
     * @return array{lbl: string, sub: string, val: string, val_mono: bool, val_small: bool}
     */
    private static function infobarThirdMixed(Collection $payments): array
    {
        $invoiceRef = self::primaryInvoiceReference($payments);
        $hasAdvance = $payments->contains(static fn ($p) => ! $p->invoice_id);

        if ($invoiceRef && ! $hasAdvance) {
            return [
                'lbl' => 'Invoice Ref.',
                'sub' => 'رقم الفاتورة المرتبطة',
                'val' => $invoiceRef,
                'val_mono' => true,
                'val_small' => true,
            ];
        }

        return [
            'lbl' => 'Type',
            'sub' => 'نوع الدفعة',
            'val' => ($hasAdvance && $invoiceRef)
                ? 'Mixed / دفعات متعددة'
                : ($hasAdvance ? 'Advance / دفعة مقدمة' : ($invoiceRef ?: 'Shipment / دفعة شحنة')),
            'val_mono' => false,
            'val_small' => false,
        ];
    }

    /**
     * @param  list<int>  $paymentIds
     */
    public static function create(int $clientId, array $paymentIds, int $userId, string $locale = 'en'): CashReceipt
    {
        return DB::transaction(function () use ($clientId, $paymentIds, $userId, $locale): CashReceipt {
            $payload = self::buildPayload($clientId, $paymentIds, $locale);
            $payments = $payload['payments'];

            $receipt = new CashReceipt;
            $receipt->client_id = $clientId;
            $receipt->receipt_number = self::nextReceiptNumber();
            $receipt->receipt_kind = $payload['receipt_kind'];
            $receipt->totals_by_currency = $payload['totals_by_currency'];
            $receipt->locale = $payload['locale'];
            $receipt->created_by_id = $userId;
            $receipt->save();

            $receipt->payments()->attach($payments->pluck('id')->all());

            $payload['receipt'] = $receipt;
            $payload['receipt_number_preview'] = $receipt->receipt_number;
            $html = view('accountings.cash_receipt_pdf', $payload)->render();
            $pdfBinary = self::renderPdf($html);
            $path = 'cash-receipts/'.$receipt->receipt_number.'.pdf';
            Storage::disk('public')->put($path, $pdfBinary);
            $receipt->pdf_path = $path;
            $receipt->save();

            ActivityLogger::log('cash_receipt.created', $receipt, [
                'client_id' => $clientId,
                'payment_count' => $payments->count(),
            ]);

            return $receipt->fresh(['client', 'payments', 'createdBy']);
        });
    }

    public static function renderPdfFromReceipt(CashReceipt $receipt): string
    {
        $paymentIds = $receipt->payments()->pluck('payments.id')->all();
        $payload = self::buildPayload((int) $receipt->client_id, $paymentIds, (string) $receipt->locale);
        $payload['receipt'] = $receipt;
        $payload['receipt_number_preview'] = $receipt->receipt_number;
        $html = view('accountings.cash_receipt_pdf', $payload)->render();

        return self::renderPdf($html);
    }

    private static function renderPdf(string $html): string
    {
        // DejaVu Sans handles Latin + Arabic without Cairo-VF OTL (which crashes mPDF).
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_top' => 8,
            'margin_bottom' => 12,
            'margin_left' => 10,
            'margin_right' => 10,
            'default_font' => 'dejavusans',
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
        ]);
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }

    /**
     * @param  list<int>  $paymentIds
     * @return Collection<int, Payment>
     */
    private static function resolvePaymentsForClient(int $clientId, array $paymentIds): Collection
    {
        $ids = array_values(array_unique(array_map('intval', $paymentIds)));
        if ($ids === []) {
            throw ValidationException::withMessages([
                'payment_ids' => [__('Select at least one payment.')],
            ]);
        }

        $receipted = DB::table('cash_receipt_payment')->whereIn('payment_id', $ids)->pluck('payment_id');
        if ($receipted->isNotEmpty()) {
            throw ValidationException::withMessages([
                'payment_ids' => [__('One or more payments already have a cash receipt.')],
            ]);
        }

        $payments = Payment::query()
            ->with(['sourceAccount', 'shipment', 'invoice'])
            ->where('type', 'client_receipt')
            ->where('client_id', $clientId)
            ->whereIn('id', $ids)
            ->get();

        if ($payments->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'payment_ids' => [__('Invalid payment selection for this customer.')],
            ]);
        }

        return $payments->sortByDesc(fn (Payment $p) => $p->paid_at?->timestamp ?? 0)->values();
    }

    /**
     * @param  Collection<int, Payment>  $payments
     * @return array<string, float>
     */
    private static function totalsByCurrency(Collection $payments): array
    {
        $totals = [];
        foreach ($payments as $p) {
            $cur = strtoupper((string) ($p->currency_code ?: 'USD'));
            $totals[$cur] = ($totals[$cur] ?? 0) + (float) $p->amount;
        }

        return $totals;
    }

    /**
     * @param  Collection<int, Payment>  $payments
     */
    private static function detectReceiptKind(Collection $payments): string
    {
        $hasAdvance = $payments->contains(fn (Payment $p) => ! $p->invoice_id);
        $hasInvoice = $payments->contains(fn (Payment $p) => (bool) $p->invoice_id);
        if ($hasAdvance && $hasInvoice) {
            return 'mixed';
        }
        if ($hasAdvance) {
            return 'advance';
        }

        return 'shipment';
    }

    public static function nextReceiptNumber(): string
    {
        $prefix = 'AM-RCP-'.now()->format('Y-m').'-';
        $last = CashReceipt::query()
            ->where('receipt_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('receipt_number');
        $seq = 1;
        if ($last && preg_match('/-(\d+)$/', $last, $m)) {
            $seq = (int) $m[1] + 1;
        }

        return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    public static function previewReceiptNumber(): string
    {
        return self::nextReceiptNumber();
    }

    /**
     * @return array<string, string>
     */
    private static function labels(string $locale): array
    {
        if ($locale === 'ar') {
            return [
                'doc_title' => 'إيصال استلام نقدية',
                'doc_sub' => 'Cash Receipt',
                'received_by' => 'استلمت بواسطة',
                'received_from' => 'مُستلم من',
                'amount_received' => 'المبلغ المستلم',
                'receipt_date' => 'تاريخ الإيصال',
                'payment_date' => 'تاريخ الدفع',
                'receipt_no' => 'رقم الإيصال',
                'payment_details' => 'تفاصيل الدفعات',
                'col_payment' => 'رقم الدفعة',
                'col_type' => 'النوع',
                'col_amount' => 'المبلغ',
                'col_currency' => 'العملة',
                'col_date' => 'تاريخ الدفع',
                'col_shipment' => 'شحنة',
                'col_method' => 'طريقة الدفع',
                'advance' => 'دفعة مقدمة',
                'shipment_linked' => 'مرتبطة بشحنة',
                'total' => 'الإجمالي',
                'kind_advance' => 'دفعة مقدمة — رصيد مدفوع مسبقاً',
                'kind_shipment' => 'دفعة مرتبطة بشحنة',
                'kind_mixed' => 'دفعات متعددة (مقدمة + شحنات)',
                'kind_advance_en' => 'Advance Payment — Prepaid Credit',
                'kind_advance_ar' => 'دفعة مقدمة — رصيد مدفوع مسبقاً',
                'kind_shipment_en' => 'Shipment-Linked Payment',
                'kind_shipment_ar' => 'دفعة مرتبطة بشحنة',
                'kind_mixed_en' => 'Mixed Payments (Advance + Shipments)',
                'kind_mixed_ar' => 'دفعات متعددة (مقدمة + شحنات)',
            ];
        }

        return [
            'doc_title' => 'Cash Receipt',
            'doc_sub' => 'إيصال استلام نقدية',
            'received_by' => 'Received By',
            'received_from' => 'Received From',
            'amount_received' => 'Amount Received',
            'receipt_date' => 'Receipt Date',
            'payment_date' => 'Payment Date',
            'receipt_no' => 'Receipt No.',
            'payment_details' => 'Payment Details',
            'col_payment' => 'Payment',
            'col_type' => 'Type',
            'col_amount' => 'Amount',
            'col_currency' => 'Currency',
            'col_date' => 'Paid Date',
            'col_shipment' => 'Shipment',
            'col_method' => 'Method',
            'advance' => 'Advance',
            'shipment_linked' => 'Shipment-linked',
            'total' => 'Total',
            'kind_advance' => 'Advance Payment — Prepaid Credit',
            'kind_shipment' => 'Shipment-Linked Payment',
            'kind_mixed' => 'Mixed Payments (Advance + Shipments)',
            'kind_advance_en' => 'Advance Payment — Prepaid Credit',
            'kind_advance_ar' => 'دفعة مقدمة — رصيد مدفوع مسبقاً',
            'kind_shipment_en' => 'Shipment-Linked Payment',
            'kind_shipment_ar' => 'دفعة مرتبطة بشحنة',
            'kind_mixed_en' => 'Mixed Payments (Advance + Shipments)',
            'kind_mixed_ar' => 'دفعات متعددة (مقدمة + شحنات)',
        ];
    }

    /**
     * @return array{class: string, badge: string, ico_bg: string, en: string, ar: string, en_class: string}
     */
    public static function kindBandMeta(string $kind, array $labels): array
    {
        return match ($kind) {
            'advance' => [
                'class' => 'band-adv',
                'badge' => 'ADVANCE',
                'ico_bg' => '#E8790A',
                'en' => $labels['kind_advance_en'],
                'ar' => $labels['kind_advance_ar'],
                'en_class' => 'b-adv-en',
            ],
            'shipment' => [
                'class' => 'band-shp',
                'badge' => 'SHIPMENT',
                'ico_bg' => '#059669',
                'en' => $labels['kind_shipment_en'],
                'ar' => $labels['kind_shipment_ar'],
                'en_class' => 'b-shp-en',
            ],
            default => [
                'class' => 'band-mix',
                'badge' => 'MIXED',
                'ico_bg' => '#2563EB',
                'en' => $labels['kind_mixed_en'],
                'ar' => $labels['kind_mixed_ar'],
                'en_class' => 'b-mix-en',
            ],
        };
    }

    /**
     * @return array<string, string>
     */
    private static function companyBlock(): array
    {
        $data = app(AppSettings::class)->getArray(AppSettings::KEY_COMPANY_PROFILE) ?? [];

        return [
            'name' => (string) ($data['company_name'] ?? $data['name'] ?? 'Amazon Marine'),
            'tagline' => (string) ($data['tagline'] ?? 'Integrated Ocean Freight & Logistics'),
            'address' => (string) ($data['address'] ?? '5th Settlement, New Cairo, Egypt'),
            'email' => (string) ($data['email'] ?? 'cs@amazonmarine.ltd'),
            'phone' => (string) ($data['phone'] ?? ''),
        ];
    }
}
