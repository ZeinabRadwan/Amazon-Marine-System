@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
        /* Fonts aligned with amazon_marine_invoice_template.html: --en Inter, --ar Cairo (registered in mPDF via MpdfInvoiceFonts) */
        :root {
            --en: inter, 'DejaVu Sans', sans-serif;
            --ar: cairo, 'DejaVu Sans', sans-serif;
        }
        body.pdf-body {
            font-family: var(--en);
        }
        .pdf-inv-html,
        .pdf-inv-html table,
        .pdf-inv-html td,
        .pdf-inv-html th,
        .pdf-inv-html div,
        .pdf-inv-html p {
            font-family: var(--en);
        }
        .pdf-inv-html *[dir="rtl"],
        .pdf-inv-html .pdf-inv-meta-ar,
        .pdf-inv-html .pdf-inv-party-role-ar,
        .pdf-inv-html .pdf-inv-header-title-ar,
        .pdf-inv-html .pdf-inv-sec-title-ar,
        .pdf-inv-html .pdf-inv-grand-title-ar,
        .pdf-inv-html .pdf-inv-term-ar,
        .pdf-inv-html .pdf-inv-bank-head-ar {
            font-family: var(--ar);
        }
        /* Preserve monospace for amounts / IBANs like the HTML invoice template */
        .pdf-inv-html .pdf-inv-meta-val-mono,
        .pdf-inv-html td.pdf-inv-col-amt,
        .pdf-inv-html td.pdf-inv-col-cur,
        .pdf-inv-html .pdf-inv-grand-breakdown .pdf-inv-gtr-val,
        .pdf-inv-html .pdf-inv-grand-cur .pdf-inv-gtr-val,
        .pdf-inv-html .pdf-inv-sub-amt,
        .pdf-inv-html .pdf-inv-bank-table td,
        .pdf-inv-html .pdf-inv-sec-total {
            font-family: 'DejaVu Sans Mono', monospace;
        }
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

        /*
         * mPDF rounds corners reliably when `border-radius` sits on a bordered wrapper (div / outer shell).
         * Inner navy tables stay square — clips come from `.pdf-inv-*-wrap` / `.pdf-inv-section-card`, not `overflow:hidden` on navy-only layers.
         */

        /* Invoice-only overrides on SD form header (same markup as sd_forms/pdf.blade.php) */
        .pdf-sd-doc .pdf-inv-header-title {
            text-transform: none;
            letter-spacing: 0.04em;
            line-height: 1.25;
            margin: 0 0 6px;
            padding: 0;
        }
        .pdf-sd-doc .pdf-inv-header-title-en {
            display: block;
            font-size: 14px;
            font-weight: 700;
            color: #ec7f00;
        }
        .pdf-sd-doc .pdf-inv-header-title-ar {
            display: block;
            margin-top: 3px;
            font-size: 12px;
            font-weight: 700;
            color: #0f2d4a;
            direction: rtl;
            unicode-bidi: embed;
            text-align: right;
        }

        /* Shared chrome for meta / parties / route — same border + radius as charge cards (mPDF clips inner tables) */
        .pdf-inv-panel-wrap {
            border: 1px solid #dde3ed;
            border-radius: 8px;
            overflow: hidden;
            margin: 0 0 12px;
            background: #ffffff;
        }
        .pdf-inv-meta-row {
            width: 100%;
            border-collapse: collapse;
            background: #ffffff;
            border: none;
            margin: 0;
            table-layout: fixed;
        }
        .pdf-inv-meta-row tr td.pdf-inv-meta-cell {
            vertical-align: middle;
            padding: 8px 6px;
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
            color: #ec7f00;
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
            border-collapse: collapse;
            border-spacing: 0;
            border: none;
            margin: 0;
            background: #ffffff;
        }
        .pdf-inv-parties td {
            vertical-align: top;
            padding: 16px 18px;
            border: none;
            background: #ffffff;
        }
        .pdf-inv-party-div {
            width: 1px;
            min-width: 1px;
            max-width: 1px;
            padding: 0 !important;
            background: #e2e8f0;
            vertical-align: stretch;
            border: none;
            font-size: 0;
            line-height: 0;
        }
        .pdf-inv-party-role {
            font-size: 10px;
            font-weight: 700;
            color: #ec7f00;
            text-transform: none;
            letter-spacing: 0.02em;
            margin: 0 0 3px;
            line-height: 1.25;
        }
        .pdf-inv-party-role-ar {
            font-size: 7.5px;
            font-weight: 500;
            color: #94a3b8;
            margin: 0 0 10px;
            line-height: 1.35;
            direction: rtl;
            unicode-bidi: embed;
        }
        .pdf-inv-party-right .pdf-inv-party-role-ar {
            text-align: right;
        }
        .pdf-inv-party-name {
            font-size: 13px;
            font-weight: 700;
            color: #0f2d4a;
            margin: 0 0 8px;
            line-height: 1.25;
        }
        .pdf-inv-party-company {
            margin: -4px 0 8px;
            font-weight: 700;
            font-size: 11px;
            color: #0f2d4a;
            line-height: 1.35;
        }
        .pdf-inv-party-detail {
            font-size: 9px;
            font-weight: 400;
            color: #64748b;
            line-height: 1.55;
        }
        .pdf-inv-party-detail strong {
            font-weight: 600;
            color: #64748b;
        }
        .pdf-inv-party-right {
            text-align: right;
        }
        .pdf-inv-party-right .pdf-inv-party-role,
        .pdf-inv-party-right .pdf-inv-party-name,
        .pdf-inv-party-right .pdf-inv-party-company,
        .pdf-inv-party-right .pdf-inv-party-detail {
            text-align: right;
        }

        /* Route band — aligned with amazon_marine_invoice_template.html .route-bar / .route-ports / .route-metas */
        .pdf-inv-route-tpl-bar {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin: 0;
            table-layout: fixed;
            background: #0f2d4a;
        }
        .pdf-inv-route-tpl-bar > tbody > tr > td {
            padding: 0;
            border: none;
            vertical-align: middle;
        }
        .pdf-inv-route-tpl-ports-cell {
            width: 52%;
            padding: 10px 10px 10px 18px !important;
        }
        .pdf-inv-route-tpl-metas-cell {
            width: 48%;
            padding: 10px 18px 10px 10px !important;
            text-align: right;
        }
        .pdf-inv-route-tpl-ports {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .pdf-inv-route-tpl-ports td {
            border: none;
            vertical-align: middle;
            padding: 0;
            background: transparent;
        }
        .pdf-inv-route-tpl-port {
            width: 44%;
        }
        .pdf-inv-route-tpl-port--end {
            text-align: right;
        }
        .pdf-inv-route-tpl-port--end .pdf-inv-route-tpl-port-name,
        .pdf-inv-route-tpl-port--end .pdf-inv-route-tpl-port-lbl {
            text-align: right;
        }
        .pdf-inv-route-tpl-port-name {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.2;
            word-break: break-word;
        }
        .pdf-inv-route-tpl-port-lbl {
            font-size: 8px;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 2px;
            line-height: 1.25;
        }
        .pdf-inv-route-tpl-arrow {
            width: 12%;
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            color: #ec7f00;
            line-height: 1;
            padding: 0 4px !important;
        }
        .pdf-inv-route-tpl-metas {
            border-collapse: collapse;
            margin-left: auto;
        }
        .pdf-inv-route-tpl-metas td {
            border: none;
            vertical-align: middle;
            padding: 0;
            background: transparent;
        }
        .pdf-inv-route-tpl-rmeta {
            text-align: center;
            padding: 0 8px !important;
        }
        /* Matches .rmeta-val / .rmeta-lbl in amazon_marine_invoice_template.html */
        .pdf-inv-route-tpl-rmeta-val {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.25;
            word-break: break-word;
        }
        .pdf-inv-route-tpl-rmeta-lbl {
            font-size: 8px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 2px;
            line-height: 1.25;
        }
        .pdf-inv-route-tpl-rmeta-sep {
            width: 1px;
            min-width: 1px;
            max-width: 1px;
            padding: 0 !important;
            background: rgba(255, 255, 255, 0.1);
            font-size: 0;
            line-height: 0;
            overflow: hidden;
        }

        /* Bordered wrapper clips children; navy section head has no radius (avoids overflow+navy on same node) */
        .pdf-inv-section-card {
            border: 1px solid #dde3ed;
            border-radius: 8px;
            margin-bottom: 14px;
            background: #ffffff;
            overflow: hidden;
        }
        .pdf-inv-section-card:last-child {
            margin-bottom: 0;
        }

        .pdf-inv-sec-head {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            background: #0f2d4a;
        }
        .pdf-inv-sec-head td {
            padding: 8px 12px;
            vertical-align: middle;
            border: none;
            background: #0f2d4a;
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
            border-top: 1px solid #dde3ed;
            table-layout: fixed;
        }
        /* Column headers: no fill — text + bottom rule only (beats `.pdf-sd-doc .pdf-table th` navy/grey) */
        .pdf-inv-html .pdf-inv-section-card .pdf-inv-table thead th {
            background: transparent !important;
            color: #64748b !important;
        }
        .pdf-inv-html .pdf-inv-section-card .pdf-inv-table tbody td {
            background: #ffffff;
        }
        .pdf-inv-html .pdf-inv-section-card .pdf-inv-table tbody tr:nth-child(even) td {
            background: #f8fafc !important;
        }
        .pdf-inv-table th {
            padding: 8px 8px;
            font-size: 8.5px;
            font-weight: 700;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            border-bottom: 1px solid #dde3ed;
            background: transparent;
        }
        .pdf-inv-table th.pdf-inv-th-center,
        .pdf-inv-table td.pdf-inv-td-center {
            text-align: center;
        }
        .pdf-inv-table td {
            padding: 8px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 10.5px;
            vertical-align: middle;
            overflow-wrap: anywhere;
            word-break: break-word;
        }
        /* Item names: full template body typography — not downsized vs qty/amount columns */
        .pdf-inv-table td.pdf-inv-col-item {
            font-size: 11px;
            font-weight: 600;
            color: #0f2d4a;
            font-family: var(--en);
            line-height: 1.45;
        }
        .pdf-inv-table td.pdf-inv-col-qty,
        .pdf-inv-table th.pdf-inv-col-qty {
            font-variant-numeric: tabular-nums;
        }
        .pdf-inv-table td.pdf-inv-col-amt,
        .pdf-inv-table td.pdf-inv-col-cur {
            font-size: 9.5px;
            font-weight: 600;
            color: #334155;
            font-family: DejaVu Sans Mono, monospace;
        }
        .pdf-inv-table .pdf-inv-col-item {
            width: 42%;
        }
        .pdf-inv-table .pdf-inv-col-qty {
            width: 11%;
        }
        .pdf-inv-table .pdf-inv-col-amt {
            width: 24%;
        }
        .pdf-inv-table .pdf-inv-col-cur {
            width: 13%;
        }
        .pdf-inv-table .pdf-inv-subtotal-row td {
            background: #fef3e8 !important;
            border-top: 3px solid #ec7f00;
            font-weight: 800;
            font-size: 11px;
            color: #0f2d4a;
            padding: 10px 10px !important;
            vertical-align: middle;
        }
        .pdf-inv-table .pdf-inv-subtotal-row td.pdf-inv-sub-amt {
            text-align: center;
            font-family: DejaVu Sans Mono, monospace;
            font-weight: 800;
            font-size: 12px;
            color: #ec7f00;
            letter-spacing: 0.02em;
        }
        .pdf-inv-table .pdf-inv-subtotal-row .pdf-inv-sub-label {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.02em;
            color: #0f2d4a;
        }

        /* Grand total: rounded border on wrapper only — inner table is navy without radius/overflow */
        .pdf-inv-grand-wrap {
            border: 1px solid rgba(27, 58, 92, 0.9);
            border-radius: 8px;
            overflow: hidden;
            margin: 14px 0 10px;
        }
        .pdf-inv-grand {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: #0f2d4a;
            margin: 0;
            border: none;
        }
        .pdf-inv-grand td {
            padding: 11px 14px;
            vertical-align: middle;
            border: none;
            background: #0f2d4a;
        }
        .pdf-inv-grand-title {
            font-size: 12px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 0.02em;
            line-height: 1.25;
        }
        .pdf-inv-grand-title-ar {
            font-size: 10px;
            font-weight: 700;
            color: #ffffff;
            margin-top: 8px;
            line-height: 1.35;
            direction: rtl;
            unicode-bidi: embed;
            text-align: left;
            opacity: 0.95;
        }
        .pdf-inv-grand-breakdown {
            width: 100%;
            border-collapse: collapse;
        }
        .pdf-inv-grand-breakdown td {
            padding: 2px 0;
            font-size: 9px;
            line-height: 1.35;
            vertical-align: middle;
            border: none;
            background: transparent;
            color: #ffffff !important;
        }
        .pdf-inv-grand-breakdown tr:not(.pdf-inv-grand-cur):not(.pdf-inv-grand-divider) td:first-child {
            font-weight: 600;
        }
        .pdf-inv-grand-breakdown tr:not(.pdf-inv-grand-cur):not(.pdf-inv-grand-divider) .pdf-inv-gtr-val {
            text-align: right;
            font-family: DejaVu Sans Mono, monospace;
            font-size: 9px;
            font-weight: 600;
            white-space: nowrap;
        }
        .pdf-inv-grand-divider td {
            padding: 4px 0 !important;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            font-size: 0;
            line-height: 0;
            height: 1px;
        }
        .pdf-inv-grand-cur td {
            padding: 3px 0 !important;
            font-size: 9px;
            font-weight: 600;
            color: #ffffff !important;
        }
        .pdf-inv-grand-cur td:first-child {
            font-weight: 800;
        }
        .pdf-inv-grand-cur .pdf-inv-gtr-val {
            text-align: right;
            font-family: DejaVu Sans Mono, monospace;
            color: #ffffff !important;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
        }
        .pdf-inv-grand-vat {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.18);
            font-size: 9px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.78);
            line-height: 1.35;
        }

        .pdf-inv-bank-wrap {
            border: 1px solid #dde3ed;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 12px;
            background: #ffffff;
        }
        .pdf-inv-bank-head {
            background: #1b3a5c;
            padding: 8px 14px;
        }
        .pdf-inv-bank-head-row {
            width: 100%;
            border-collapse: collapse;
        }
        .pdf-inv-bank-head-row td {
            padding: 0 0 6px;
            border: none;
            vertical-align: baseline;
        }
        .pdf-inv-bank-head-left {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.02em;
            text-align: left;
            width: 50%;
        }
        .pdf-inv-bank-head-right {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.02em;
            text-align: right;
            width: 50%;
        }
        .pdf-inv-bank-head-sub-row td {
            padding: 0;
            border: none;
            font-size: 10px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.72);
            line-height: 1.35;
        }
        .pdf-inv-bank-head-sub-spacer {
            width: 50%;
        }
        .pdf-inv-bank-head-ar {
            width: 50%;
            text-align: right;
            direction: rtl;
            unicode-bidi: embed;
        }
        .pdf-inv-bank-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .pdf-inv-bank-table th {
            background: transparent;
            padding: 8px 10px;
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
        /* Soft pill badges — no stroke; compact type */
        .pdf-inv-cur-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.06em;
            font-family: var(--en);
            border: none;
            line-height: 1.25;
            box-shadow: 0 1px 3px rgba(15, 45, 74, 0.12);
        }
        .pdf-inv-cur-badge--egp {
            background: #dbeafe;
            color: #1d4ed8;
        }
        .pdf-inv-cur-badge--usd {
            background: #d1fae5;
            color: #0d7a55;
        }
        .pdf-inv-cur-badge--eur {
            background: #fef3c7;
            color: #92400e;
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
        .pdf-inv-terms-list {
            margin: 0;
            padding: 0;
        }
        .pdf-inv-term-line {
            margin: 0 0 10px;
            padding: 0;
            font-size: 10px;
            line-height: 1.6;
            color: #475569;
            text-align: left;
            page-break-inside: avoid;
        }
        .pdf-inv-term-line:last-child {
            margin-bottom: 0;
        }
        .pdf-inv-term-num-plain {
            font-weight: 700;
            color: #0f2d4a;
            margin-right: 6px;
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
            'handling' => ['en' => 'Custom Declaration Opening Fee', 'ar' => 'رسوم فتح الشهادة الجمركية'],
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
        $refShipmentData = trim((string) ($shipment?->booking_number ?? ''));
        if ($refShipmentData === '') {
            $refShipmentData = trim((string) ($shipment?->acid_number ?? ''));
        }
        $refShipmentData = $refShipmentData !== '' ? $refShipmentData : '—';
        $sailingDate = $shipment?->loading_date ?? $shipment?->booking_date;
        $issueDateFormatted = $invoice->issue_date?->format('F j, Y') ?? '—';
        $sailingFormatted = $sailingDate?->format('F j, Y') ?? '—';

        $grandByCurrency = [];
        foreach ($invoice->items as $item) {
            $cur = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
            $grandByCurrency[$cur] = ($grandByCurrency[$cur] ?? 0) + (float) $item->line_total;
        }

        $currencyOrder = ['USD', 'EGP', 'EUR'];

        $logoSrc = \App\Support\PdfLogo::imgSrc();
    @endphp
    <div class="pdf-wrapper pdf-inv-html pdf-sd-doc" dir="ltr" lang="en" style="direction:ltr;text-align:left;">
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
                                <span class="pdf-header__brand-contact">{{ $labels['brand_contact'] }}</span>
                            </div>
                        </td>
                        <td class="pdf-header__doc">
                            <p class="pdf-header__title pdf-inv-header-title">
                                <span class="pdf-inv-header-title-en">Tax Invoice</span>
                                <span class="pdf-inv-header-title-ar">فاتورة ضريبية</span>
                            </p>
                            <div class="pdf-header__sd-big">{{ $invoice->invoice_number }}</div>
                        </td>
                    </tr>
                </table>
            </header>
        @endif

        <div class="pdf-inv-panel-wrap">
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
        </div>

        <div class="pdf-inv-panel-wrap">
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
        </div>

        {{-- Route band — same structure as amazon_marine_invoice_template.html: .route-ports | .route-metas --}}
        <div class="pdf-inv-panel-wrap">
            <table class="pdf-inv-route-tpl-bar" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                <tr>
                    <td class="pdf-inv-route-tpl-ports-cell" valign="middle">
                        <table class="pdf-inv-route-tpl-ports" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                            <tr>
                                <td class="pdf-inv-route-tpl-port" valign="middle">
                                    <div class="pdf-inv-route-tpl-port-name">{{ $pol }}</div>
                                    <div class="pdf-inv-route-tpl-port-lbl">POL — Port of Loading</div>
                                </td>
                                <td class="pdf-inv-route-tpl-arrow" valign="middle">→</td>
                                <td class="pdf-inv-route-tpl-port pdf-inv-route-tpl-port--end" valign="middle">
                                    <div class="pdf-inv-route-tpl-port-name">{{ $pod }}</div>
                                    <div class="pdf-inv-route-tpl-port-lbl">POD — Port of Discharge</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="pdf-inv-route-tpl-metas-cell" valign="middle">
                        <table class="pdf-inv-route-tpl-metas" cellspacing="0" cellpadding="0" border="0" role="presentation" align="right">
                            <tr>
                                <td class="pdf-inv-route-tpl-rmeta" valign="middle">
                                    <div class="pdf-inv-route-tpl-rmeta-val">{{ $shipLine }}</div>
                                    <div class="pdf-inv-route-tpl-rmeta-lbl">Carrier</div>
                                </td>
                                <td class="pdf-inv-route-tpl-rmeta-sep" valign="middle"></td>
                                <td class="pdf-inv-route-tpl-rmeta" valign="middle">
                                    <div class="pdf-inv-route-tpl-rmeta-val">{{ $transitTime }}</div>
                                    <div class="pdf-inv-route-tpl-rmeta-lbl">Transit Time</div>
                                </td>
                                <td class="pdf-inv-route-tpl-rmeta-sep" valign="middle"></td>
                                <td class="pdf-inv-route-tpl-rmeta" valign="middle">
                                    <div class="pdf-inv-route-tpl-rmeta-val">{{ $refShipmentData }}</div>
                                    <div class="pdf-inv-route-tpl-rmeta-lbl">Shipment Ref</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        @foreach($grouped as $bucket => $bucketItems)
            @if(count($bucketItems) > 0)
                @php
                    $sectionTotals = [];
                    $meta = $sectionMeta[$bucket] ?? ['en' => ucfirst($bucket), 'ar' => ''];
                    foreach ($bucketItems as $item) {
                        $c = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
                        $sectionTotals[$c] = ($sectionTotals[$c] ?? 0) + (float) $item->line_total;
                    }
                @endphp
                <div class="pdf-inv-section-card">
                    <table class="pdf-inv-sec-head" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                        <tr>
                            <td class="pdf-inv-sec-title-stack">
                                <div class="pdf-inv-sec-title-en">{{ $meta['en'] }}</div>
                                @if(!empty($meta['ar']))
                                    <div class="pdf-inv-sec-title-ar">{{ $meta['ar'] }}</div>
                                @endif
                            </td>
                            <td class="pdf-inv-sec-total" style="width:38%;">
                                {{ $formatBreakdown($sectionTotals) }}
                            </td>
                        </tr>
                    </table>
                    <table class="pdf-inv-table" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                        <thead>
                            <tr>
                                <th class="pdf-inv-col-item">Item name</th>
                                <th class="pdf-inv-col-qty pdf-inv-th-center">Qty</th>
                                <th class="pdf-inv-col-amt pdf-inv-th-center">Amount</th>
                                <th class="pdf-inv-col-cur pdf-inv-th-center">Currency</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($bucketItems as $item)
                                @php
                                    $cur = strtoupper((string) ($item->currency_code ?: $invoice->currency_code ?: 'USD'));
                                    $itemDesc = trim((string) ($item->description ?? ''));
                                    $itemTitle = trim((string) ($item->title ?? ''));
                                    $catalogName = trim((string) ($item->item?->name ?? ''));
                                    $itemName = $itemDesc !== '' ? $itemDesc : ($itemTitle !== '' ? $itemTitle : $catalogName);
                                    $itemName = $itemName !== '' ? $itemName : '—';
                                    $qtyFloat = (float) ($item->quantity ?? 0);
                                    $qtyDisplay = abs($qtyFloat - round($qtyFloat)) < 0.000001
                                        ? (string) (int) round($qtyFloat)
                                        : rtrim(rtrim(number_format($qtyFloat, 2, '.', ''), '0'), '.');
                                @endphp
                                <tr>
                                    <td class="pdf-inv-col-item">{{ $itemName }}</td>
                                    <td class="pdf-inv-col-qty pdf-inv-td-center">{{ $qtyDisplay }}</td>
                                    <td class="pdf-inv-col-amt pdf-inv-td-center">{{ number_format((float) $item->line_total, 2) }}</td>
                                    <td class="pdf-inv-col-cur pdf-inv-td-center">{{ $cur }}</td>
                                </tr>
                            @endforeach
                            <tr class="pdf-inv-subtotal-row">
                                <td class="pdf-inv-sub-label"><strong>{{ $meta['en'] }} Total</strong></td>
                                <td class="pdf-inv-td-center">—</td>
                                <td colspan="2" class="pdf-inv-sub-amt">{{ $formatBreakdown($sectionTotals) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            @endif
        @endforeach

        @php
            $invoiceSections = $invoiceData['sections'] ?? [];
        @endphp
        <div class="pdf-inv-grand-wrap">
        <table class="pdf-inv-grand" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td width="34%">
                    <div class="pdf-inv-grand-title">Grand Total</div>
                    <div class="pdf-inv-grand-title-ar">الإجمالي الكلي</div>
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
        </div>

        @if($invoice->notes)
            <div class="pdf-inv-notes">
                <div class="pdf-inv-notes__title">Notes</div>
                <div>{{ $invoice->notes }}</div>
            </div>
        @endif

        <div class="pdf-inv-bank-wrap">
            <div class="pdf-inv-bank-head">
                <table class="pdf-inv-bank-head-row" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="pdf-inv-bank-head-left">Payment Structure - Bank Details</td>
                        <td class="pdf-inv-bank-head-ar pdf-inv-bank-head-right">تعليمات الدفع / بيانات الحساب البنكي</td>
                    </tr>
                </table>
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
            <div class="pdf-inv-terms-list">
                <div class="pdf-inv-term-line"><span class="pdf-inv-term-num-plain">1.</span><strong>Payment Due:</strong> Payment is due by the date specified above. Late payments may be subject to additional charges.<div class="pdf-inv-term-ar">الدفع مستحق في التاريخ المحدد — التأخر قد يترتب عليه رسوم إضافية.</div></div>
                <div class="pdf-inv-term-line"><span class="pdf-inv-term-num-plain">2.</span><strong>Official Receipts:</strong> Government official receipts are not included in this invoice and will be charged at actual cost with original receipts provided.<div class="pdf-inv-term-ar">الإيصالات الرسمية الحكومية غير شاملة في هذه الفاتورة — تُحتسب بقيمتها الفعلية مع تقديم الأصول للعميل.</div></div>
                <div class="pdf-inv-term-line"><span class="pdf-inv-term-num-plain">3.</span><strong>Currency:</strong> Payments must be made in the currency specified per charge. Exchange rate conversions are subject to the agreed rate on the day of payment.<div class="pdf-inv-term-ar">يتم الدفع بالعملة المحددة لكل بند — تحويل العملات يخضع للسعر المتفق عليه يوم الدفع.</div></div>
                <div class="pdf-inv-term-line"><span class="pdf-inv-term-num-plain">4.</span><strong>Validity:</strong> This invoice is valid for 30 days from the issue date. Any disputes must be raised within 7 days of receipt.<div class="pdf-inv-term-ar">هذه الفاتورة سارية لمدة 30 يوماً من تاريخ الإصدار — أي اعتراض يجب رفعه خلال 7 أيام من الاستلام.</div></div>
            </div>
        </div>

        @if (!empty($footerHtml))
            <footer class="pdf-footer">
                {!! $footerHtml !!}
            </footer>
        @endif
    </div>
@endsection

@push('pdf_footer_fullbleed')
    @if ($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
        <table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0"
            role="presentation">
            <tr>
                <td class="pdf-footer-fullbleed__cell">
                    <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
                </td>
            </tr>
        </table>
    @endif
@endpush
