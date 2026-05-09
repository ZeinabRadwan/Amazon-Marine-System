@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
        /* Invoice PDF — English / LTR layout (structure aligned with amazon_marine_invoice_template.html) */
        body.pdf-body .pdf-page-header {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            line-height: 0;
        }
        body.pdf-body .pdf-page-header__img {
            display: block;
            margin: 0;
            padding: 0;
            border: none;
            vertical-align: bottom;
        }
        .pdf-inv-html {
            direction: ltr;
            text-align: left;
            margin-left: -12px;
            margin-right: -12px;
            width: auto;
            box-sizing: border-box;
        }
        /* theme `.pdf-wrapper` adds border:1px on all sides — removes thin line above logo/header */
        .pdf-wrapper.pdf-inv-html {
            border: none !important;
            border-top: none !important;
            padding: 0 !important;
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            outline: none !important;
        }
        .pdf-wrapper.pdf-inv-html::before,
        .pdf-wrapper.pdf-inv-html::after {
            display: none !important;
            content: none !important;
        }
        .pdf-inv-html .pdf-inv-bg-navy {
            background: #0f2d4a;
            color: #ffffff;
        }
        .pdf-inv-html .pdf-inv-orange {
            color: #ec7f00;
        }
        .pdf-inv-html .pdf-inv-border {
            border-color: #dde3ed;
        }

        .pdf-inv-header {
            background: #ffffff;
            padding: 6px 0;
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        .pdf-inv-header td {
            vertical-align: middle;
            border: none;
            padding: 2px 0;
        }
        .pdf-inv-header__logo img {
            height: auto;
            max-height: 8px;
            width: auto;
            max-width: 18px;
            display: block;
            object-fit: contain;
        }
        .pdf-inv-header__logo-fallback {
            width: 11px;
            height: 7px;
            border: 1px solid #ec7f00;
            border-radius: 2px;
            text-align: center;
            line-height: 5px;
            font-size: 4px;
            font-weight: 800;
            color: #0f2d4a;
            background: #f8fafc;
        }
        .pdf-inv-title-primary {
            font-size: 14px;
            font-weight: 700;
            color: #0f2d4a;
            letter-spacing: 0.02em;
            line-height: 1.25;
            margin: 0;
            padding: 0;
        }
        .pdf-inv-brand-sub {
            margin-top: 4px;
            font-size: 11px;
            color: #0f2d4a;
            line-height: 1.25;
        }
        .pdf-inv-brand-sub strong {
            font-weight: 700;
        }
        .pdf-inv-tagline {
            margin-top: 2px;
            font-size: 9px;
            font-weight: 600;
            color: #475569;
            letter-spacing: 0.05em;
            line-height: 1.25;
        }
        .pdf-inv-header__doc {
            text-align: right;
            vertical-align: middle;
        }
        .pdf-inv-tax-title-row {
            text-align: right;
            line-height: 1.25;
            white-space: nowrap;
        }
        .pdf-inv-tax-label {
            font-size: 17px;
            font-weight: 700;
            color: #ec7f00;
            letter-spacing: 0.05em;
            margin: 0;
            padding: 0;
            display: inline;
        }
        .pdf-inv-tax-ar {
            display: inline;
            margin-left: 10px;
            font-size: 15px;
            font-weight: 700;
            color: #0f2d4a;
            direction: rtl;
            unicode-bidi: embed;
        }
        .pdf-inv-inv-ref {
            font-size: 10.5px;
            color: #0f2d4a;
            margin-top: 4px;
            font-family: DejaVu Sans Mono, monospace;
            font-weight: 600;
            letter-spacing: 0.03em;
        }

        .pdf-inv-meta-row {
            width: 100%;
            border-collapse: collapse;
            background: #f8fafc;
            border: none !important;
            border-bottom: 1px solid #e8edf3;
            margin: 0;
            table-layout: fixed;
        }
        .pdf-inv-meta-row tr td.pdf-inv-meta-cell {
            vertical-align: middle;
            padding: 5px 6px;
            border: none;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
        }
        .pdf-inv-meta-row tr td.pdf-inv-meta-sep {
            width: 1px;
            min-width: 1px;
            max-width: 1px;
            padding: 0 !important;
            background: #cbd5e1;
            vertical-align: middle;
            border: none;
            font-size: 0;
            line-height: 0;
        }
        .pdf-inv-meta-en {
            font-size: 7.5px;
            font-weight: 700;
            color: #b91c1c;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1.1;
            margin: 0;
        }
        .pdf-inv-meta-ar {
            font-size: 7px;
            color: #64748b;
            line-height: 1.1;
            margin: 0 0 2px;
            direction: rtl;
            unicode-bidi: embed;
            text-align: center;
        }
        .pdf-inv-meta-val {
            font-size: 9.5px;
            font-weight: 700;
            color: #0f2d4a;
            line-height: 1.15;
            white-space: nowrap;
        }
        .pdf-inv-meta-val-mono {
            font-family: DejaVu Sans Mono, monospace;
            font-size: 9.5px;
        }

        .pdf-inv-parties {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #0f2d4a;
            border-radius: 14px;
            overflow: hidden;
            margin: 10px 0;
            background: #0f2d4a;
        }
        .pdf-inv-parties td {
            vertical-align: top;
            padding: 14px 18px;
            border: none;
            background: #0f2d4a;
            color: #ffffff;
        }
        .pdf-inv-party-div {
            width: 2px;
            min-width: 2px;
            max-width: 2px;
            background: rgba(255, 255, 255, 0.28);
            padding: 0 !important;
            border: none;
        }
        .pdf-inv-parties .pdf-inv-party-role,
        .pdf-inv-parties .pdf-inv-party-role-ar,
        .pdf-inv-parties .pdf-inv-party-name,
        .pdf-inv-parties .pdf-inv-party-detail,
        .pdf-inv-parties .pdf-inv-party-company {
            color: #ffffff;
        }
        .pdf-inv-parties .pdf-inv-party-detail strong {
            color: #ffffff;
            font-weight: 700;
        }
        .pdf-inv-party-role {
            font-size: 9px;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 3px;
            line-height: 1.2;
        }
        .pdf-inv-party-role-ar {
            font-size: 8px;
            font-weight: 600;
            color: #ffffff;
            letter-spacing: 0.02em;
            margin-bottom: 8px;
            line-height: 1.25;
            direction: rtl;
            unicode-bidi: embed;
        }
        .pdf-inv-party-right .pdf-inv-party-role-ar {
            text-align: right;
        }
        .pdf-inv-party-name {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 6px;
        }
        .pdf-inv-party-detail {
            font-size: 10px;
            color: #ffffff;
            line-height: 1.55;
        }
        .pdf-inv-party-company {
            margin-bottom: 6px;
            font-weight: 600;
            font-size: 10px;
            color: #ffffff;
            line-height: 1.45;
        }
        .pdf-inv-party-right {
            text-align: right;
        }
        .pdf-inv-party-right .pdf-inv-party-role,
        .pdf-inv-party-right .pdf-inv-party-name,
        .pdf-inv-party-right .pdf-inv-party-detail {
            text-align: right;
        }

        .pdf-inv-ship-row {
            width: 100%;
            border-collapse: collapse;
            background: #fafbfc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            margin-bottom: 12px;
            overflow: hidden;
            table-layout: fixed;
        }
        .pdf-inv-ship-row tr td.pdf-inv-ship-cell {
            vertical-align: middle;
            padding: 6px 8px;
            border: none;
            background: #fafbfc;
            text-align: center;
            white-space: nowrap;
        }
        .pdf-inv-ship-row tr td.pdf-inv-ship-sep {
            width: 1px;
            min-width: 1px;
            max-width: 1px;
            padding: 0 !important;
            background: #cbd5e1;
            vertical-align: middle;
            border: none;
            font-size: 0;
            line-height: 0;
        }
        .pdf-inv-ship-lbl {
            font-size: 8px;
            font-weight: 600;
            color: #64748b;
            line-height: 1.2;
            margin: 0 0 3px;
            text-transform: none;
            letter-spacing: 0.01em;
        }
        .pdf-inv-ship-val {
            font-size: 10px;
            font-weight: 700;
            color: #0f2d4a;
            line-height: 1.2;
        }

        .pdf-inv-charges-shell {
            border: 1px solid #dde3ed;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 12px;
        }

        .pdf-inv-sec-head {
            width: 100%;
            border-collapse: collapse;
            background: #0f2d4a;
        }
        .pdf-inv-sec-head td {
            padding: 8px 12px;
            vertical-align: middle;
            border: none;
        }
        .pdf-inv-sec-title-stack {
            text-align: left;
        }
        .pdf-inv-sec-title-en {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.25;
        }
        .pdf-inv-sec-title-ar {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 3px;
            direction: rtl;
            unicode-bidi: embed;
            text-align: left;
        }
        .pdf-inv-sec-total {
            text-align: right;
            font-size: 11px;
            font-weight: 700;
            color: #ec7f00;
            font-family: DejaVu Sans Mono, monospace;
            white-space: nowrap;
        }

        .pdf-inv-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            table-layout: fixed;
        }
        .pdf-inv-table th {
            background: #f1f5f9;
            padding: 7px 10px;
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            border-bottom: 1px solid #dde3ed;
        }
        .pdf-inv-table th.pdf-inv-th-num,
        .pdf-inv-table td.pdf-inv-td-num {
            text-align: right;
        }
        .pdf-inv-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 10.5px;
            vertical-align: top;
            overflow-wrap: anywhere;
            word-break: break-word;
        }
        .pdf-inv-table tbody tr:nth-child(even) td {
            background: #f8fafc;
        }
        .pdf-inv-table .pdf-inv-col-item {
            width: 38%;
        }
        .pdf-inv-table .pdf-inv-col-amt {
            width: 47%;
        }
        .pdf-inv-table .pdf-inv-col-cur {
            width: 15%;
        }
        .pdf-inv-table .pdf-inv-subtotal-row td {
            background: #fef3e8 !important;
            border-top: 3px solid #ec7f00;
            font-weight: 800;
            font-size: 12px;
            color: #0f2d4a;
            padding: 11px 12px !important;
            vertical-align: middle;
        }
        .pdf-inv-table .pdf-inv-subtotal-row .pdf-inv-sub-label {
            font-size: 12px;
            letter-spacing: 0.02em;
        }
        .pdf-inv-table .pdf-inv-subtotal-row .pdf-inv-sub-amt {
            text-align: right;
            font-family: DejaVu Sans Mono, monospace;
            font-weight: 800;
            font-size: 13px;
            color: #9a3412;
            letter-spacing: 0.02em;
        }

        .pdf-inv-grand {
            width: 100%;
            border-collapse: collapse;
            background: #0f2d4a;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0 14px;
            border: 2px solid #1b3a5c;
        }
        .pdf-inv-grand td {
            padding: 16px 20px;
            vertical-align: top;
            border: none;
        }
        .pdf-inv-grand-title {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.03em;
        }
        .pdf-inv-grand-breakdown {
            width: 100%;
            border-collapse: collapse;
        }
        .pdf-inv-grand-breakdown td {
            padding: 5px 0;
            font-size: 10.5px;
            color: rgba(255, 255, 255, 0.72);
        }
        .pdf-inv-grand-breakdown .pdf-inv-gtr-val {
            text-align: right;
            font-family: DejaVu Sans Mono, monospace;
            color: #ffffff;
            font-weight: 600;
            white-space: nowrap;
        }
        .pdf-inv-grand-divider td {
            padding: 6px 0 !important;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            font-size: 0;
            line-height: 0;
        }
        .pdf-inv-grand-cur td {
            padding-top: 6px !important;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff !important;
        }
        .pdf-inv-grand-cur .pdf-inv-gtr-val {
            color: #ec7f00 !important;
            font-size: 14px;
            font-weight: 800;
        }
        .pdf-inv-grand-vat {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.85);
        }

        .pdf-inv-bank-wrap {
            border: 1px solid #dde3ed;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 12px;
        }
        .pdf-inv-bank-head {
            background: #1b3a5c;
            padding: 8px 14px;
        }
        .pdf-inv-bank-head-en {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.02em;
            line-height: 1.35;
        }
        .pdf-inv-bank-head-ar {
            font-size: 10px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.55);
            margin-top: 4px;
            line-height: 1.35;
            direction: rtl;
            text-align: left;
        }
        .pdf-inv-bank-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .pdf-inv-bank-table th {
            background: #f1f5f9;
            padding: 7px 10px;
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            border-bottom: 1px solid #dde3ed;
        }
        .pdf-inv-bank-table td {
            padding: 8px 12px;
            font-size: 11px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
            overflow-wrap: anywhere;
            font-family: DejaVu Sans Mono, monospace;
        }
        .pdf-inv-bank-table tr:last-child td {
            border-bottom: none;
        }
        .pdf-inv-cur-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            font-family: DejaVu Sans, sans-serif;
            border: 1px solid transparent;
        }
        /* Match amazon_marine_invoice_template.html .cur-badge mapping */
        .pdf-inv-cur-badge--egp {
            background: #dbeafe;
            color: #1d4ed8;
            border-color: rgba(29, 78, 216, 0.15);
        }
        .pdf-inv-cur-badge--usd {
            background: #d1fae5;
            color: #0d7a55;
            border-color: rgba(13, 122, 85, 0.18);
        }
        .pdf-inv-cur-badge--eur {
            background: #fef3c7;
            color: #92400e;
            border-color: rgba(146, 64, 14, 0.2);
        }

        .pdf-inv-terms-wrap {
            background: #f8fafc;
            border: 1px solid #dde3ed;
            border-radius: 8px;
            padding: 10px 14px 12px;
            margin-bottom: 8px;
        }
        .pdf-inv-terms-title {
            font-size: 11px;
            font-weight: 700;
            color: #0f2d4a;
            margin-bottom: 10px;
            text-align: left;
            letter-spacing: 0.02em;
            line-height: 1.45;
        }
        .pdf-inv-terms-table {
            width: 100%;
            border-collapse: collapse;
        }
        .pdf-inv-terms-table td {
            vertical-align: top;
            padding: 0 0 10px;
            border: none;
            font-size: 10px;
            line-height: 1.6;
            color: #475569;
            text-align: left;
        }
        .pdf-inv-terms-table tr:last-child td {
            padding-bottom: 0 !important;
        }
        .pdf-inv-term-num-cell {
            width: 22px;
            padding-right: 8px !important;
            padding-bottom: 10px !important;
        }
        .pdf-inv-term-num {
            width: 16px;
            height: 16px;
            background: #0f2d4a;
            border-radius: 50%;
            color: #ffffff;
            font-size: 8px;
            font-weight: 700;
            text-align: center;
            line-height: 16px;
        }
        .pdf-inv-term-ar {
            font-size: 9px;
            color: #94a3b8;
            direction: rtl;
            text-align: right;
            margin-top: 4px;
            line-height: 1.55;
        }

        .pdf-inv-notes {
            margin: 12px 0;
            padding: 10px 12px;
            border: 1px solid #dde3ed;
            border-radius: 8px;
            background: #fbfdff;
            font-size: 10.2px;
            line-height: 1.55;
        }
        .pdf-inv-notes__title {
            font-weight: 700;
            color: #0f2d4a;
            margin-bottom: 6px;
            font-size: 10.5px;
        }
    </style>
@endpush

@section('pdf_title')
Tax Invoice {{ $invoice->invoice_number }}
@endsection

@section('content')
    @php
        $sectionMeta = [
            'shipping' => ['en' => 'Ocean Freight', 'ar' => 'الشحن البحري'],
            'inland' => ['en' => 'Inland Transport', 'ar' => 'النقل الداخلي'],
            'handling' => ['en' => 'Handling Fees', 'ar' => 'رسوم الخدمة والمتابعة'],
            'other' => ['en' => 'Additional Costs', 'ar' => 'تكاليف إضافية'],
            'customs' => ['en' => 'Customs Clearance', 'ar' => 'التخليص الجمركي'],
            'insurance' => ['en' => 'Insurance', 'ar' => 'التأمين'],
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
            if ($map === []) {
                return '—';
            }
            ksort($map);
            $parts = [];
            foreach ($map as $cur => $amt) {
                $parts[] = strtoupper((string) $cur).' '.number_format((float) $amt, 2);
            }

            return implode(' · ', $parts);
        };

        foreach ($invoice->items as $item) {
            $bucket = strtolower(trim((string) ($item->section_key ?? '')));
            if (! array_key_exists($bucket, $grouped)) {
                $bucket = 'other';
            }
            $grouped[$bucket][] = $item;
        }

        $shipment = $invoice->shipment;
        $shipmentRef = $shipment?->bl_number ?: '—';
        $pol = $shipment?->originPort?->name ?: '—';
        $pod = $shipment?->destinationPort?->name ?: '—';
        $shipLine = $shipment?->shippingLine?->name ?: '—';
        $cc = $shipment?->container_count;
        $csz = trim((string) ($shipment?->container_size ?? ''));
        $cty = trim((string) ($shipment?->container_type ?? ''));
        $containerMid = trim($csz.' '.$cty);
        $container = ($cc !== null && $cc !== '') ? ((string) $cc.' × '.$containerMid) : ($containerMid !== '' ? $containerMid : '—');
        $container = trim(preg_replace('/\s+/', ' ', $container)) ?: '—';
        $transitTime = $shipment?->route_text ?: '—';
        $sailingDate = $shipment?->loading_date ?? $shipment?->booking_date;
        $issueDateFormatted = $invoice->issue_date?->format('F j, Y') ?? '—';
        $sailingFormatted = $sailingDate?->format('F j, Y') ?? '—';

        $grandByCurrency = [];
        foreach ($invoice->items as $item) {
            $cur = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
            $grandByCurrency[$cur] = ($grandByCurrency[$cur] ?? 0) + (float) $item->line_total;
        }

        $currencyOrder = ['USD', 'EGP', 'EUR'];
    @endphp
    <div class="pdf-wrapper pdf-inv-html" dir="ltr" lang="en" style="direction:ltr;text-align:left;">
        @php
            $logoSrc = \App\Support\PdfLogo::imgSrc();
        @endphp
        @if(!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <table class="pdf-inv-header" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                <tr>
                    <td width="22%" class="pdf-inv-header__logo">
                        @if ($logoSrc)
                            <img src="{{ $logoSrc }}" alt="">
                        @else
                            <div class="pdf-inv-header__logo-fallback">AM</div>
                        @endif
                    </td>
                    <td width="46%">
                        <div class="pdf-inv-title-primary">Amazon Marine</div>
                        <div class="pdf-inv-brand-sub"><strong>Amazon Marine</strong></div>
                        <div class="pdf-inv-tagline">Shipping Agency</div>
                    </td>
                    <td width="32%" class="pdf-inv-header__doc">
                        <div class="pdf-inv-tax-title-row">
                            <span class="pdf-inv-tax-label">Tax Invoice</span><span class="pdf-inv-tax-ar"><strong>فاتورة ضريبية</strong></span>
                        </div>
                        <div class="pdf-inv-inv-ref">REF: {{ $invoice->invoice_number }}</div>
                    </td>
                </tr>
            </table>
        @endif

        <table class="pdf-inv-meta-row" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-inv-meta-cell" width="24%">
                    <div class="pdf-inv-meta-en">Invoice Number</div>
                    <div class="pdf-inv-meta-ar">الفاتورة</div>
                    <div class="pdf-inv-meta-val pdf-inv-meta-val-mono">{{ $invoice->invoice_number }}</div>
                </td>
                <td class="pdf-inv-meta-sep"></td>
                <td class="pdf-inv-meta-cell" width="24%">
                    <div class="pdf-inv-meta-en">Issue Date</div>
                    <div class="pdf-inv-meta-ar">تاريخ الإصدار</div>
                    <div class="pdf-inv-meta-val">{{ $issueDateFormatted }}</div>
                </td>
                <td class="pdf-inv-meta-sep"></td>
                <td class="pdf-inv-meta-cell" width="24%">
                    <div class="pdf-inv-meta-en">Shipping Date</div>
                    <div class="pdf-inv-meta-ar">تاريخ الإبحار</div>
                    <div class="pdf-inv-meta-val">{{ $sailingFormatted }}</div>
                </td>
                <td class="pdf-inv-meta-sep"></td>
                <td class="pdf-inv-meta-cell" width="24%">
                    <div class="pdf-inv-meta-en">Containers</div>
                    <div class="pdf-inv-meta-ar">عدد الحاويات</div>
                    <div class="pdf-inv-meta-val">{{ $container }}</div>
                </td>
            </tr>
        </table>

        <table class="pdf-inv-parties" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td width="49%">
                    <div class="pdf-inv-party-role">From Issue By</div>
                    <div class="pdf-inv-party-role-ar">مصدر بواسطة</div>
                    <div class="pdf-inv-party-name">Amazon Marine</div>
                    <div class="pdf-inv-party-detail">
                        <strong>Address:</strong> 5th Settlement, New Cairo<br>
                        <strong>Email:</strong> cs@amazonmarine.ltd<br>
                        <strong>Website:</strong> www.amazonmarine.ltd<br>
                        <strong>Phone:</strong> +20 2 25601776
                    </div>
                </td>
                <td class="pdf-inv-party-div"></td>
                <td width="49%" class="pdf-inv-party-right">
                    <div class="pdf-inv-party-role">Build To</div>
                    <div class="pdf-inv-party-role-ar">فاتورة إلى</div>
                    <div class="pdf-inv-party-name">{{ $invoice->client?->name ?? '—' }}</div>
                    @if($invoice->client?->company_name)
                        <div class="pdf-inv-party-company">{{ $invoice->client->company_name }}</div>
                    @endif
                    <div class="pdf-inv-party-detail">
                        @if($invoice->client?->address)
                            <span>{{ $invoice->client->address }}</span><br>
                        @endif
                        @if($invoice->client?->phone)
                            <span>{{ $invoice->client->phone }}</span>
                        @endif
                        @if($invoice->client?->email)
                            @if($invoice->client?->phone)<br>@endif
                            <span>{{ $invoice->client->email }}</span>
                        @endif
                    </div>
                </td>
            </tr>
        </table>

        <table class="pdf-inv-ship-row" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-inv-ship-cell" width="24%">
                    <div class="pdf-inv-ship-lbl">Port of Loading</div>
                    <div class="pdf-inv-ship-val">{{ $pol }}</div>
                </td>
                <td class="pdf-inv-ship-sep"></td>
                <td class="pdf-inv-ship-cell" width="24%">
                    <div class="pdf-inv-ship-lbl">Port of Discharge</div>
                    <div class="pdf-inv-ship-val">{{ $pod }}</div>
                </td>
                <td class="pdf-inv-ship-sep"></td>
                <td class="pdf-inv-ship-cell" width="24%">
                    <div class="pdf-inv-ship-lbl">Transit Time</div>
                    <div class="pdf-inv-ship-val">{{ $transitTime }}</div>
                </td>
                <td class="pdf-inv-ship-sep"></td>
                <td class="pdf-inv-ship-cell" width="24%">
                    <div class="pdf-inv-ship-lbl">Shipment Ref</div>
                    <div class="pdf-inv-ship-val">{{ $shipmentRef }}</div>
                </td>
            </tr>
        </table>

        <div class="pdf-inv-charges-shell">
            @foreach($grouped as $bucket => $bucketItems)
                @if(count($bucketItems) > 0)
                    @php
                        $sectionTotals = [];
                        $meta = $sectionMeta[$bucket] ?? ['en' => ucfirst($bucket), 'ar' => ''];
                    @endphp
                    <table class="pdf-inv-sec-head" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                        <tr>
                            <td class="pdf-inv-sec-title-stack">
                                <div class="pdf-inv-sec-title-en">{{ $meta['en'] }}</div>
                                @if(!empty($meta['ar']))
                                    <div class="pdf-inv-sec-title-ar">{{ $meta['ar'] }}</div>
                                @endif
                            </td>
                            <td class="pdf-inv-sec-total" style="width:38%;">
                                @foreach($bucketItems as $item)
                                    @php
                                        $c = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
                                        $sectionTotals[$c] = ($sectionTotals[$c] ?? 0) + (float) $item->line_total;
                                    @endphp
                                @endforeach
                                {{ $formatBreakdown($sectionTotals) }}
                            </td>
                        </tr>
                    </table>
                    <table class="pdf-inv-table pdf-table pdf-table--standalone" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                        <thead>
                            <tr>
                                <th class="pdf-inv-col-item">Item name</th>
                                <th class="pdf-inv-col-amt pdf-inv-th-num">Amount</th>
                                <th class="pdf-inv-col-cur pdf-inv-th-num">Currency</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($bucketItems as $item)
                                @php
                                    $cur = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
                                    $itemDesc = trim((string) ($item->description ?? ''));
                                    $itemTitle = trim((string) ($item->title ?? ''));
                                    $catalogName = trim((string) ($item->item?->name ?? ''));
                                    $tokenLooksAbbrev = $itemDesc !== ''
                                        && strlen($itemDesc) <= 5
                                        && ! str_contains($itemDesc, ' ');
                                    $itemName = $itemDesc;
                                    if ($tokenLooksAbbrev) {
                                        $itemName = $itemTitle !== '' ? $itemTitle : ($catalogName !== '' ? $catalogName : $itemDesc);
                                    }
                                    if ($itemName === '') {
                                        $itemName = $itemTitle !== '' ? $itemTitle : $catalogName;
                                    }
                                @endphp
                                <tr>
                                    <td class="pdf-inv-col-item">{{ $itemName }}</td>
                                    <td class="pdf-inv-col-amt pdf-inv-td-num">{{ number_format((float) $item->line_total, 2) }}</td>
                                    <td class="pdf-inv-col-cur pdf-inv-td-num">{{ $cur }}</td>
                                </tr>
                            @endforeach
                            <tr class="pdf-inv-subtotal-row">
                                <td class="pdf-inv-sub-label"><strong>{{ $meta['en'] }} Total</strong></td>
                                <td colspan="2" class="pdf-inv-sub-amt">{{ $formatBreakdown($sectionTotals) }}</td>
                            </tr>
                        </tbody>
                    </table>
                @endif
            @endforeach
        </div>

        @php
            $invoiceSections = $invoiceData['sections'] ?? [];
        @endphp
        <table class="pdf-inv-grand" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td width="34%">
                    <div class="pdf-inv-grand-title">Grand Total</div>
                </td>
                <td width="66%">
                    <table class="pdf-inv-grand-breakdown" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                        @foreach($invoiceSections as $sec)
                            @php
                                $sellMap = $sec['selling_by_currency'] ?? [];
                                if ($sellMap === [] || ($sec['items'] ?? []) === []) {
                                    continue;
                                }
                                $sk = (string) ($sec['key'] ?? '');
                                $sm = $sectionMeta[$sk] ?? ['en' => ucfirst($sk)];
                                $lineLabel = (string) ($sm['en'] ?? $sk);
                            @endphp
                            <tr>
                                <td>{{ trim($lineLabel) }}</td>
                                <td class="pdf-inv-gtr-val">{{ $formatBreakdown($sellMap) }}</td>
                            </tr>
                        @endforeach
                        <tr class="pdf-inv-grand-divider"><td colspan="2"></td></tr>
                        @foreach($currencyOrder as $curCode)
                            @php
                                $amt = (float) ($grandByCurrency[$curCode] ?? 0);
                            @endphp
                            <tr class="pdf-inv-grand-cur">
                                <td>Total {{ $curCode }}</td>
                                <td class="pdf-inv-gtr-val">{{ number_format($amt, 2) }} {{ $curCode }}</td>
                            </tr>
                        @endforeach
                        @foreach($grandByCurrency as $curCode => $amt)
                            @if(! in_array($curCode, $currencyOrder, true) && (float) $amt != 0.0)
                                <tr class="pdf-inv-grand-cur">
                                    <td>Total {{ $curCode }}</td>
                                    <td class="pdf-inv-gtr-val">{{ number_format((float) $amt, 2) }} {{ $curCode }}</td>
                                </tr>
                            @endif
                        @endforeach
                    </table>
                    @if($invoice->is_vat_invoice)
                        <div class="pdf-inv-grand-vat">
                            VAT: {{ number_format($invoice->tax_amount, 2) }} {{ strtoupper((string) $invoice->currency_code) }}
                        </div>
                    @endif
                </td>
            </tr>
        </table>

        @if($invoice->notes)
            <div class="pdf-inv-notes">
                <div class="pdf-inv-notes__title">Notes</div>
                <div>{{ $invoice->notes }}</div>
            </div>
        @endif

        <div class="pdf-inv-bank-wrap">
            <div class="pdf-inv-bank-head">
                <div class="pdf-inv-bank-head-en">Payment Instructions — Bank Details</div>
                <div class="pdf-inv-bank-head-ar">تعليمات الدفع — بيانات الحساب البنكي</div>
            </div>
            <table class="pdf-inv-bank-table" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                <thead>
                    <tr>
                        <th style="width:14%;">Currency / العملة</th>
                        <th style="width:22%;">Beneficiary Account</th>
                        <th style="width:14%;">Account No.</th>
                        <th style="width:30%;">IBAN No.</th>
                        <th style="width:20%;">SWIFT Code</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="pdf-inv-cur-badge pdf-inv-cur-badge--egp">EGP</span></td>
                        <td>Amazon Marine</td>
                        <td>100053729837</td>
                        <td>EG1300100154000000100053729837</td>
                        <td>CIBEEGCX154</td>
                    </tr>
                    <tr>
                        <td><span class="pdf-inv-cur-badge pdf-inv-cur-badge--usd">USD</span></td>
                        <td>Amazon Marine</td>
                        <td>100053729848</td>
                        <td>EG0700100154000000100053729848</td>
                        <td>CIBEEGCX154</td>
                    </tr>
                    <tr>
                        <td><span class="pdf-inv-cur-badge pdf-inv-cur-badge--eur">EUR</span></td>
                        <td>Amazon Marine</td>
                        <td>100053729864</td>
                        <td>EG6000100154000000100053729864</td>
                        <td>CIBEEGCX154</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="pdf-inv-terms-wrap">
            <div class="pdf-inv-terms-title">Terms &amp; Conditions / الشروط والأحكام</div>
            <table class="pdf-inv-terms-table" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                <tr>
                    <td class="pdf-inv-term-num-cell"><div class="pdf-inv-term-num">1</div></td>
                    <td>
                        <strong>Payment Due:</strong> Payment is due by the date specified above. Late payments may be subject to additional charges.
                        <div class="pdf-inv-term-ar">الدفع مستحق في التاريخ المحدد — التأخر قد يترتب عليه رسوم إضافية.</div>
                    </td>
                </tr>
                <tr>
                    <td class="pdf-inv-term-num-cell"><div class="pdf-inv-term-num">2</div></td>
                    <td>
                        <strong>Official Receipts:</strong> Government official receipts are not included in this invoice and will be charged at actual cost with original receipts provided.
                        <div class="pdf-inv-term-ar">الإيصالات الرسمية الحكومية غير شاملة في هذه الفاتورة — تُحتسب بقيمتها الفعلية مع تقديم الأصول للعميل.</div>
                    </td>
                </tr>
                <tr>
                    <td class="pdf-inv-term-num-cell"><div class="pdf-inv-term-num">3</div></td>
                    <td>
                        <strong>Currency:</strong> Payments must be made in the currency specified per charge. Exchange rate conversions are subject to the agreed rate on the day of payment.
                        <div class="pdf-inv-term-ar">يتم الدفع بالعملة المحددة لكل بند — تحويل العملات يخضع للسعر المتفق عليه يوم الدفع.</div>
                    </td>
                </tr>
                <tr>
                    <td class="pdf-inv-term-num-cell"><div class="pdf-inv-term-num">4</div></td>
                    <td>
                        <strong>Validity:</strong> This invoice is valid for 30 days from the issue date. Any disputes must be raised within 7 days of receipt.
                        <div class="pdf-inv-term-ar">هذه الفاتورة سارية لمدة 30 يوماً من تاريخ الإصدار — أي اعتراض يجب رفعه خلال 7 أيام من الاستلام.</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
@endsection
