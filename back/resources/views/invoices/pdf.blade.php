@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
    </style>
@endpush

@section('pdf_title')
{{ $labels['doc_title'] }} {{ $invoice->invoice_number }}
@endsection

@section('content')
    @php
        $sectionLabels = [
            'shipping' => 'COST LINE SHIPPING / تكلفة الخط الملاحي',
            'inland' => 'TRANSPORT INLAND / النقل الداخلي',
            'handling' => 'HANDLING FEES / رسوم الخدمة والمتابعة',
            'other' => 'ADDITIONAL COSTS / تكاليف إضافية',
            'customs' => 'CUSTOMS CLEARANCE / التخليص الجمركي',
            'insurance' => 'INSURANCE / التأمين',
        ];

        $shippingCodes = ['of', 'thc', 'power', 'bl', 'telex', 'dhl'];
        $inlandCodes = ['inlandfreight', 'genset', 'receipts', 'overnight'];
        $customsCodes = ['customs', 'declaration', 'clearance', 'broker'];
        $insuranceCodes = ['insurance', 'premium'];
        $handlingCodes = ['handling fee', 'fee handling', 'handling fees'];

        $grouped = [
            'shipping' => [],
            'inland' => [],
            'handling' => [],
            'other' => [],
            'customs' => [],
            'insurance' => [],
        ];

        $costInvoiceItems = $invoice->shipment?->costInvoice?->items;
        $costInvoiceItems = is_array($costInvoiceItems) ? $costInvoiceItems : [];
        $currencyByDesc = [];
        foreach ($costInvoiceItems as $ci) {
            $tpl = strtolower(trim((string) ($ci['template_id'] ?? '')));
            $title = strtolower(trim((string) ($ci['title'] ?? '')));
            $cur = strtoupper(trim((string) ($ci['currency_code'] ?? '')));
            if ($cur === '') {
                continue;
            }
            if ($tpl !== '') {
                $currencyByDesc[$tpl] = $cur;
            }
            if ($title !== '') {
                $currencyByDesc[$title] = $cur;
            }
        }
        $lineCurrency = static function ($desc) use ($currencyByDesc, $invoice) {
            $k = strtolower(trim((string) $desc));
            return $currencyByDesc[$k] ?? strtoupper((string) ($invoice->currency_code ?: 'USD'));
        };
        $formatBreakdown = static function (array $map): string {
            if ($map === []) return '—';
            ksort($map);
            $parts = [];
            foreach ($map as $cur => $amt) {
                $parts[] = strtoupper((string) $cur).' '.number_format((float) $amt, 2);
            }
            return implode(' · ', $parts);
        };

        foreach ($invoice->items as $item) {
            $desc = strtolower(trim((string) $item->description));
            $bucket = 'other';
            if (in_array($desc, $shippingCodes, true)) {
                $bucket = 'shipping';
            } elseif (in_array($desc, $inlandCodes, true)) {
                $bucket = 'inland';
            } elseif (str_contains($desc, 'handling') || in_array($desc, $handlingCodes, true)) {
                $bucket = 'handling';
            } elseif (in_array($desc, $customsCodes, true) || str_contains($desc, 'customs')) {
                $bucket = 'customs';
            } elseif (in_array($desc, $insuranceCodes, true) || str_contains($desc, 'insurance')) {
                $bucket = 'insurance';
            }
            $grouped[$bucket][] = $item;
        }

        $shipment = $invoice->shipment;
        $shipmentRef = $shipment?->bl_number ?: '—';
        $pol = $shipment?->originPort?->name ?: '—';
        $pod = $shipment?->destinationPort?->name ?: '—';
        $shipLine = $shipment?->shippingLine?->name ?: '—';
        $container = trim(($shipment?->container_count ?: '—').' x '.($shipment?->container_size ?: '').' '.($shipment?->container_type ?: ''));
        $transitTime = $shipment?->route_text ?: '—';
    @endphp
    <div class="pdf-wrapper">
        @php
            $logoSrc = \App\Support\PdfLogo::imgSrc();
        @endphp
        @if(!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <header class="pdf-header pdf-header--branded pdf-header--sd">
                <table class="pdf-header__table">
                    <tr>
                        <td class="pdf-header__logo">
                            @if ($logoSrc)
                                <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                            @else
                                <div class="pdf-header__logo-fallback">AM</div>
                            @endif
                        </td>
                        <td class="pdf-header__brand-cell">
                            <div class="pdf-header__brand-stack">
                                <div class="pdf-header__brand-line"><strong>{{ $labels['company_name'] }}</strong></div>
                                <div class="pdf-header__brand-tag">{{ $labels['company_tagline'] }}</div>
                            </div>
                        </td>
                        <td class="pdf-header__doc">
                            <p class="pdf-header__title">{{ $labels['invoice_title'] }}</p>
                            <div class="pdf-header__meta-list">
                                <div class="pdf-header__meta-row">
                                    <span class="pdf-header__meta-label">{{ $labels['invoice_no'] }}</span>
                                    <span class="pdf-header__meta-val">{{ $invoice->invoice_number }}</span>
                                </div>
                                <div class="pdf-header__meta-row">
                                    <span class="pdf-header__meta-label">{{ $labels['date'] }}</span>
                                    <span class="pdf-header__meta-val">{{ $invoice->issue_date?->format('d/m/Y') }}</span>
                                </div>
                                @if($invoice->shipment)
                                    <div class="pdf-header__meta-row">
                                        <span class="pdf-header__meta-label">{{ $labels['shipment_bl'] }}</span>
                                        <span class="pdf-header__meta-val">{{ $invoice->shipment->bl_number }}</span>
                                    </div>
                                @endif
                            </div>
                        </td>
                    </tr>
                </table>
            </header>
        @endif

        <table class="pdf-party-grid">
            <tr>
                <td class="pdf-party-card">
                    <div class="pdf-party-card__label">{{ $labels['billed_to'] }}</div>
                    <div class="pdf-party-card__name">{{ $invoice->client?->name ?? '—' }}</div>
                    @if($invoice->client?->address)
                        <div>{{ $invoice->client->address }}</div>
                    @endif
                    @if($invoice->client?->phone)
                        <div>{{ $invoice->client->phone }}</div>
                    @endif
                </td>
                <td class="pdf-party-grid__gap"></td>
                <td class="pdf-party-card">
                    <div><strong>POL → POD:</strong> {{ $pol }} → {{ $pod }}</div>
                    <div><strong>Shipping Line:</strong> {{ $shipLine }}</div>
                    <div><strong>Container:</strong> {{ $container ?: '—' }}</div>
                    <div><strong>Transit Time:</strong> {{ $transitTime }}</div>
                    <div><strong>Shipment Ref:</strong> {{ $shipmentRef }}</div>
                </td>
            </tr>
        </table>
        @foreach($grouped as $bucket => $bucketItems)
            @if(count($bucketItems) > 0)
                @php $sectionTotals = []; @endphp
                <div class="pdf-notes-block" style="margin-top:10px;">
                    <div class="pdf-notes-block__title">{{ $sectionLabels[$bucket] }}</div>
                </div>
                <table class="pdf-table pdf-table--standalone pdf-table--invoice-items">
                    <thead>
                        <tr>
                            <th class="pdf-w-60">{{ $labels['description'] }}</th>
                            <th class="pdf-w-13 pdf-text-end">{{ $labels['qty'] }}</th>
                            <th class="pdf-w-13 pdf-text-end">{{ $labels['unit_price'] }}</th>
                            <th class="pdf-w-14 pdf-text-end">{{ $labels['line_total'] }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($bucketItems as $item)
                            @php
                                $cur = $lineCurrency($item->description);
                                $sectionTotals[$cur] = ($sectionTotals[$cur] ?? 0) + (float) $item->line_total;
                            @endphp
                            <tr>
                                <td>{{ $item->description }}</td>
                                <td class="pdf-text-end">{{ number_format($item->quantity, 2) }}</td>
                                <td class="pdf-text-end">{{ $cur }} {{ number_format($item->unit_price, 2) }}</td>
                                <td class="pdf-text-end"><strong>{{ $cur }} {{ number_format($item->line_total, 2) }}</strong></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
                <div class="pdf-notes-block" style="margin-top:6px; text-align:right;">
                    <div><strong>Totals Section / إجمالي القسم:</strong> <strong>{{ $formatBreakdown($sectionTotals) }}</strong></div>
                </div>
            @endif
        @endforeach

        @php
            $grandByCurrency = [];
            foreach ($invoice->items as $item) {
                $cur = $lineCurrency($item->description);
                $grandByCurrency[$cur] = ($grandByCurrency[$cur] ?? 0) + (float) $item->line_total;
            }
            $grandBreakdown = $formatBreakdown($grandByCurrency);
        @endphp
        <table class="pdf-invoice-top">
            <tr>
                <td class="pdf-w-spacer"></td>
                <td class="pdf-w-totals">
                    <table class="pdf-summary-table">
                        <tr>
                            <td>{{ $labels['subtotal'] }}</td>
                            <td class="pdf-text-end"><strong>{{ $grandBreakdown }}</strong></td>
                        </tr>
                        @if($invoice->is_vat_invoice)
                            <tr>
                                <td>{{ $labels['vat'] }}</td>
                                <td class="pdf-text-end">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                        @endif
                    </table>
                    <div class="pdf-total-box">
                        <span class="pdf-total-box__label">{{ $labels['grand_total'] }}</span>
                        <span class="pdf-total-box__amount">{{ $grandBreakdown }}</span>
                    </div>
                </td>
            </tr>
        </table>

        @if($invoice->notes)
            <div class="pdf-notes-block">
                <div class="pdf-notes-block__title">{{ $labels['notes'] }}</div>
                <div>{{ $invoice->notes }}</div>
            </div>
        @endif

        <div class="pdf-notes-block">
            <div class="pdf-notes-block__title">Payment Instructions — Bank Details<br>تعليمات الدفع — بيانات الحساب البنكي</div>
            <table class="pdf-table pdf-table--standalone" style="margin-top:8px; table-layout:fixed;">
                <thead>
                    <tr>
                        <th>Currency / العملة</th>
                        <th>Beneficiary Account</th>
                        <th>Account No.</th>
                        <th>IBAN No.</th>
                        <th>SWIFT Code</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>EGP</td><td>Amazon Marine</td><td>100053729837</td><td>EG1300100154000000100053729837</td><td>CIBEEGCX154</td></tr>
                    <tr><td>USD</td><td>Amazon Marine</td><td>100053729848</td><td>EG0700100154000000100053729848</td><td>CIBEEGCX154</td></tr>
                    <tr><td>EUR</td><td>Amazon Marine</td><td>100053729864</td><td>EG6000100154000000100053729864</td><td>CIBEEGCX154</td></tr>
                </tbody>
            </table>
            <div style="margin-top:10px;"><strong>Terms & Conditions / الشروط والأحكام</strong></div>
            <ol style="font-size:12px; line-height:1.55; margin-top:6px; padding-left:18px;">
                <li style="margin-bottom:6px;">Payment Due: Payment is due by the date specified above. Late payments may be subject to additional charges.<br>الدفع مستحق في التاريخ المحدد — التأخر قد يترتب عليه رسوم إضافية.</li>
                <li style="margin-bottom:6px;">Official Receipts: Government official receipts are not included in this invoice and will be charged at actual cost with original receipts provided.<br>الإيصالات الرسمية الحكومية غير شاملة في هذه الفاتورة — تُحتسب بقيمتها الفعلية مع تقديم الأصول للعميل.</li>
                <li style="margin-bottom:6px;">Currency: Payments must be made in the currency specified per charge. Exchange rate conversions are subject to the agreed rate on the day of payment.<br>يتم الدفع بالعملة المحددة لكل بند — تحويل العملات يخضع للسعر المتفق عليه يوم الدفع.</li>
                <li>Validity: This invoice is valid for 30 days from the issue date. Any disputes must be raised within 7 days of receipt.<br>هذه الفاتورة سارية لمدة 30 يوماً من تاريخ الإصدار — أي اعتراض يجب رفعه خلال 7 أيام من الاستلام.</li>
            </ol>
        </div>

        <div class="pdf-footer pdf-footer--fixed">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                {{ $labels['generated'] }} {{ now()->format('d/m/Y H:i:s') }} | {{ $labels['system_credit'] }}
            @endif
        </div>
    </div>
@endsection

@push('pdf_footer_fullbleed')
    @if($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
        <table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-footer-fullbleed__cell">
                    <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
                </td>
            </tr>
        </table>
    @endif
@endpush
