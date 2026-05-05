@extends('pdf.layouts.master')

@section('pdf_title')
{{ $labels['doc_title'] }} {{ $invoice->invoice_number }}
@endsection

@section('content')
    @php
        $sectionLabels = [
            'shipping' => 'Shipping Line Cost / تكلفة الخط الملاحي',
            'inland' => 'Inland Transport / النقل الداخلي',
            'customs' => 'Customs Clearance / التخليص الجمركي',
            'insurance' => 'Insurance / التأمين',
            'handling' => 'Handling Fees / رسوم الخدمة والمتابعة',
            'other' => 'Additional Cost Types / تكاليف إضافية',
        ];

        $shippingCodes = ['of', 'thc', 'power', 'bl', 'telex', 'dhl'];
        $inlandCodes = ['inlandfreight', 'genset', 'receipts', 'overnight'];
        $customsCodes = ['customs', 'declaration', 'clearance', 'broker'];
        $insuranceCodes = ['insurance', 'premium'];
        $handlingCodes = ['handling fee', 'fee handling', 'handling fees'];

        $grouped = [
            'shipping' => [],
            'inland' => [],
            'customs' => [],
            'insurance' => [],
            'handling' => [],
            'other' => [],
        ];

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
        <table class="pdf-invoice-top">
            <tr>
                <td class="pdf-invoice-brand">
                    @if(!empty($headerHtml))
                        {!! $headerHtml !!}
                    @else
                        <div class="pdf-brand-placeholder">{{ $labels['company_name'] }}</div>
                        <div class="pdf-brand-sub">{{ $labels['company_tagline'] }}</div>
                    @endif
                </td>
                <td class="pdf-invoice-meta">
                    <div class="pdf-invoice-title">{{ $labels['invoice_title'] }}</div>
                    <div><span class="pdf-label-strong">{{ $labels['invoice_no'] }}</span> {{ $invoice->invoice_number }}</div>
                    <div><span class="pdf-label-strong">{{ $labels['date'] }}</span> {{ $invoice->issue_date?->format('d/m/Y') }}</div>
                    @if($invoice->due_date)
                        <div><span class="pdf-label-strong">{{ $labels['due_date'] }}</span> {{ $invoice->due_date?->format('d/m/Y') }}</div>
                    @endif
                    @if($invoice->shipment)
                        <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['shipment_bl'] }}</span> {{ $invoice->shipment->bl_number }}</div>
                    @endif
                </td>
            </tr>
        </table>

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
                @php
                    $sectionTotals = [];
                    foreach ($bucketItems as $line) {
                        $cur = strtoupper((string) ($invoice->currency_code ?: 'USD'));
                        $sectionTotals[$cur] = ($sectionTotals[$cur] ?? 0) + (float) $line->line_total;
                    }
                @endphp
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
                            <tr>
                                <td>{{ $item->description }}</td>
                                <td class="pdf-text-end">{{ number_format($item->quantity, 2) }}</td>
                                <td class="pdf-text-end">{{ number_format($item->unit_price, 2) }}</td>
                                <td class="pdf-text-end">{{ number_format($item->line_total, 2) }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
                <div class="pdf-notes-block" style="margin-top:6px;">
                    <div><strong>Section Totals / إجمالي القسم:</strong>
                        @foreach($sectionTotals as $cur => $total)
                            <span style="margin-inline-end:10px;">{{ $cur }} {{ number_format($total, 2) }}</span>
                        @endforeach
                    </div>
                </div>
            @endif
        @endforeach

        <table class="pdf-invoice-top">
            <tr>
                <td class="pdf-w-spacer"></td>
                <td class="pdf-w-totals">
                    <table class="pdf-summary-table">
                        <tr>
                            <td>{{ $labels['subtotal'] }}</td>
                            <td class="pdf-text-end">{{ number_format($invoice->total_amount, 2) }} {{ $invoice->currency_code }}</td>
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
                        <span class="pdf-total-box__amount">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</span>
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
            <table class="pdf-table pdf-table--standalone" style="margin-top:8px;">
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
            <div style="font-size:12px; line-height:1.55; margin-top:6px;">
                <div>1) Payment Due: Payment is due by the date specified above. Late payments may be subject to additional charges.<br>الدفع مستحق في التاريخ المحدد — التأخر قد يترتب عليه رسوم إضافية.</div>
                <div style="margin-top:4px;">2) Official Receipts: Government official receipts are not included in this invoice and will be charged at actual cost with original receipts provided.<br>الإيصالات الرسمية الحكومية غير شاملة في هذه الفاتورة — تُحتسب بقيمتها الفعلية مع تقديم الأصول للعميل.</div>
                <div style="margin-top:4px;">3) Currency: Payments must be made in the currency specified per charge. Exchange rate conversions are subject to the agreed rate on the day of payment.<br>يتم الدفع بالعملة المحددة لكل بند — تحويل العملات يخضع للسعر المتفق عليه يوم الدفع.</div>
                <div style="margin-top:4px;">4) Validity: This invoice is valid for 30 days from the issue date. Any disputes must be raised within 7 days of receipt.<br>هذه الفاتورة سارية لمدة 30 يوماً من تاريخ الإصدار — أي اعتراض يجب رفعه خلال 7 أيام من الاستلام.</div>
            </div>
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
