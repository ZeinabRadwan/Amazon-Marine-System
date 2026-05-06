@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
        .invoice-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .meta-box { border: 1px solid #dbe2ea; border-radius: 8px; padding: 8px; font-size: 10px; line-height: 1.5; }
        .section-title { margin-top: 10px; padding: 6px 8px; background: #11354d; color: #fff; border-radius: 6px 6px 0 0; font-weight: 700; font-size: 10px; }
        .section-empty { border: 1px solid #dbe2ea; border-top: 0; padding: 8px; font-size: 10px; color: #6b7280; }
        .section-table { border-top: 0 !important; border-radius: 0 0 6px 6px !important; table-layout: fixed; }
        .section-table td, .section-table th { font-size: 9.6px; overflow-wrap: anywhere; }
        .totals-row { margin-top: 4px; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 6px; font-size: 10px; }
        .attachments-list { margin: 6px 0 0 16px; padding: 0; font-size: 9.6px; }
        .summary-box { margin-top: 12px; border: 1px solid #dbe2ea; border-radius: 8px; padding: 8px; }
        .summary-box div { font-size: 10px; line-height: 1.6; }
    </style>
@endpush

@section('pdf_title')
{{ $labels['doc_title'] }} {{ $invoice->invoice_number }}
@endsection

@section('content')
    @php
        $data = is_array($invoiceData ?? null) ? $invoiceData : [];
        $sections = is_array($data['sections'] ?? null) ? $data['sections'] : [];
        $sectionLabels = [
            'shipping' => 'Shipping Line',
            'inland' => 'Inland Transportation',
            'customs' => 'Customs Clearance',
            'insurance' => 'Insurance',
            'handling' => 'Handling',
            'other' => 'Other',
        ];
        $formatBreakdown = static function (array $map): string {
            if ($map === []) { return '—'; }
            ksort($map);
            $parts = [];
            foreach ($map as $cur => $amt) {
                $parts[] = strtoupper((string) $cur).' '.number_format((float) $amt, 2);
            }
            return implode(' · ', $parts);
        };
    @endphp

    <div class="pdf-wrapper">
        <div class="invoice-title">{{ $labels['invoice_title'] }} {{ $invoice->invoice_number }}</div>
        <table class="pdf-party-grid">
            <tr>
                <td class="pdf-party-card">
                    <div class="pdf-party-card__label">{{ $labels['billed_to'] }}</div>
                    <div class="pdf-party-card__name">{{ $invoice->client?->name ?? '—' }}</div>
                    <div>{{ $labels['date'] }} {{ $invoice->issue_date?->format('d/m/Y') }}</div>
                    <div>{{ $labels['due_date'] }} {{ $invoice->due_date?->format('d/m/Y') ?: '—' }}</div>
                </td>
                <td class="pdf-party-grid__gap"></td>
                <td class="pdf-party-card">
                    <div class="meta-box">
                        <div><strong>{{ $labels['shipment_bl'] }}</strong> {{ $invoice->shipment?->bl_number ?: '—' }}</div>
                        <div><strong>POL → POD:</strong> {{ $invoice->shipment?->originPort?->name ?: '—' }} → {{ $invoice->shipment?->destinationPort?->name ?: '—' }}</div>
                        <div><strong>Shipping Line:</strong> {{ $invoice->shipment?->shippingLine?->name ?: '—' }}</div>
                    </div>
                </td>
            </tr>
        </table>

        @foreach($sections as $section)
            @php
                $key = (string) ($section['key'] ?? 'other');
                $items = is_array($section['items'] ?? null) ? $section['items'] : [];
                $attachments = is_array($section['attachments'] ?? null) ? $section['attachments'] : [];
            @endphp
            <div class="section-title">{{ $sectionLabels[$key] ?? ucfirst($key) }}</div>
            @if(count($items) === 0)
                <div class="section-empty">No line items.</div>
            @else
                <table class="pdf-table pdf-table--standalone section-table">
                    <thead>
                        <tr>
                            <th class="pdf-w-50">{{ $labels['description'] }}</th>
                            <th class="pdf-w-10 pdf-text-end">{{ $labels['qty'] }}</th>
                            <th class="pdf-w-20 pdf-text-end">{{ $labels['unit_price'] }}</th>
                            <th class="pdf-w-20 pdf-text-end">{{ $labels['line_total'] }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($items as $item)
                            <tr>
                                <td>{{ $item['description'] ?? '—' }}</td>
                                <td class="pdf-text-end">{{ number_format((float) ($item['quantity'] ?? 0), 2) }}</td>
                                <td class="pdf-text-end">{{ strtoupper((string) ($item['currency_code'] ?? 'USD')) }} {{ number_format((float) ($item['unit_price'] ?? 0), 2) }}</td>
                                <td class="pdf-text-end"><strong>{{ strtoupper((string) ($item['currency_code'] ?? 'USD')) }} {{ number_format((float) ($item['line_total'] ?? 0), 2) }}</strong></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif

            <div class="totals-row">
                <div><strong>Cost:</strong> {{ $formatBreakdown((array) ($section['cost_by_currency'] ?? [])) }}</div>
                <div><strong>Selling:</strong> {{ $formatBreakdown((array) ($section['selling_by_currency'] ?? [])) }}</div>
                <div><strong>Markup:</strong> {{ $formatBreakdown((array) ($section['markup_by_currency'] ?? [])) }}</div>
                <div><strong>Profit:</strong> {{ $formatBreakdown((array) ($section['profit_by_currency'] ?? [])) }}</div>
                <div><strong>Attachments:</strong></div>
                @if(count($attachments) === 0)
                    <div>—</div>
                @else
                    <ul class="attachments-list">
                        @foreach($attachments as $attachment)
                            <li>
                                {{ $attachment['name'] ?? 'PDF' }}
                                @if(!empty($attachment['uploaded_at'])) ({{ $attachment['uploaded_at'] }}) @endif
                                @if(!empty($attachment['url'])) - {{ $attachment['url'] }} @endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </div>
        @endforeach

        <div class="summary-box">
            <div><strong>{{ $labels['subtotal'] }}:</strong> {{ $formatBreakdown((array) ($data['financial_overview']['final_selling_price_by_currency'] ?? $data['totals_by_currency'] ?? [])) }}</div>
            <div><strong>Total Cost:</strong> {{ $formatBreakdown((array) ($data['financial_overview']['cost_by_currency'] ?? $data['cost_totals_by_currency'] ?? [])) }}</div>
            <div><strong>Total Profit:</strong> {{ $formatBreakdown((array) ($data['financial_overview']['profit_by_currency'] ?? $data['profit_by_currency'] ?? [])) }}</div>
            @if($invoice->is_vat_invoice)
                <div><strong>{{ $labels['vat'] }}:</strong> {{ number_format((float) $invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</div>
            @endif
            <div><strong>{{ $labels['grand_total'] }}:</strong> {{ $formatBreakdown((array) ($data['financial_overview']['final_selling_price_by_currency'] ?? $data['totals_by_currency'] ?? [])) }}</div>
        </div>
    </div>
@endsection
@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
        .pdf-inv-meta-card {
            border: 1px solid #dbe2ea;
            border-radius: 10px;
            padding: 8px 10px;
            background: #f8fbff;
            line-height: 1.55;
            font-size: 10.3px;
        }
        .pdf-inv-section-title {
            margin-top: 12px;
            padding: 7px 10px;
            border: 1px solid #dbe2ea;
            border-radius: 8px 8px 0 0;
            background: #11354d;
            color: #fff;
            font-weight: 700;
            font-size: 10.1px;
            letter-spacing: .02em;
        }
        .pdf-inv-items {
            border-top: none !important;
            border-radius: 0 0 8px 8px !important;
            table-layout: fixed;
        }
        .pdf-inv-items tbody tr:nth-child(even) td {
            background: #f8fafc;
        }
        .pdf-inv-items td, .pdf-inv-items th {
            overflow-wrap: anywhere;
            word-break: break-word;
        }
        .pdf-inv-items td:first-child {
            width: 58%;
        }
        .pdf-inv-section-total {
            margin-top: 0;
            margin-bottom: 2px;
            text-align: right;
            border: 1px solid #e3e8ef;
            border-top: none;
            border-radius: 0 0 8px 8px;
            padding: 7px 10px;
            background: #f9fbff;
            font-size: 10.2px;
            font-weight: 700;
        }
        .pdf-inv-grand-wrap {
            margin-top: 8px;
        }
        .pdf-inv-bank-table {
            margin-top: 8px;
            table-layout: fixed;
        }
        .pdf-inv-bank-table th, .pdf-inv-bank-table td {
            font-size: 9.8px;
            text-align: center;
            vertical-align: middle;
            overflow-wrap: anywhere;
        }
        .pdf-inv-terms {
            font-size: 11px;
            line-height: 1.6;
            margin-top: 7px;
            padding-left: 18px;
        }
        .pdf-inv-terms li {
            margin-bottom: 6px;
        }
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

        $grouped = [
            'shipping' => [],
            'inland' => [],
            'handling' => [],
            'other' => [],
            'customs' => [],
            'insurance' => [],
        ];
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
            $bucket = strtolower(trim((string) ($item->section_key ?? '')));
            if (!array_key_exists($bucket, $grouped)) $bucket = 'other';
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
                    <div class="pdf-inv-meta-card">
                    <div><strong>POL → POD:</strong> {{ $pol }} → {{ $pod }}</div>
                    <div><strong>Shipping Line:</strong> {{ $shipLine }}</div>
                    <div><strong>Container:</strong> {{ $container ?: '—' }}</div>
                    <div><strong>Transit Time:</strong> {{ $transitTime }}</div>
                    <div><strong>Shipment Ref:</strong> {{ $shipmentRef }}</div>
                    </div>
                </td>
            </tr>
        </table>
        @foreach($grouped as $bucket => $bucketItems)
            @if(count($bucketItems) > 0)
                @php $sectionTotals = []; @endphp
                <div class="pdf-inv-section-title">{{ $sectionLabels[$bucket] }}</div>
                <table class="pdf-table pdf-table--standalone pdf-table--invoice-items pdf-inv-items">
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
                                $cur = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
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
                <div class="pdf-inv-section-total">
                    <strong>Totals Section / إجمالي القسم:</strong> <strong>{{ $formatBreakdown($sectionTotals) }}</strong>
                </div>
            @endif
        @endforeach

        @php
            $grandByCurrency = [];
            foreach ($invoice->items as $item) {
                $cur = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
                $grandByCurrency[$cur] = ($grandByCurrency[$cur] ?? 0) + (float) $item->line_total;
            }
            $grandBreakdown = $formatBreakdown($grandByCurrency);
        @endphp
        <table class="pdf-invoice-top pdf-inv-grand-wrap">
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
            <table class="pdf-table pdf-table--standalone pdf-inv-bank-table">
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
            <ol class="pdf-inv-terms">
                <li>Payment Due: Payment is due by the date specified above. Late payments may be subject to additional charges.<br>الدفع مستحق في التاريخ المحدد — التأخر قد يترتب عليه رسوم إضافية.</li>
                <li>Official Receipts: Government official receipts are not included in this invoice and will be charged at actual cost with original receipts provided.<br>الإيصالات الرسمية الحكومية غير شاملة في هذه الفاتورة — تُحتسب بقيمتها الفعلية مع تقديم الأصول للعميل.</li>
                <li>Currency: Payments must be made in the currency specified per charge. Exchange rate conversions are subject to the agreed rate on the day of payment.<br>يتم الدفع بالعملة المحددة لكل بند — تحويل العملات يخضع للسعر المتفق عليه يوم الدفع.</li>
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
