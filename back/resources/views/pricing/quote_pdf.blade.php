@extends('pdf.layouts.master')

@section('pdf_title')
    {{ $labels['doc_title_en'] }} · {{ $quote->quote_no }}
@endsection

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
    </style>
    <style>
        {{-- Quotation PDF v3 layout (Amazon Marine quotation mockup) — mPDF-safe (tables, no flex/grid) --}} .pdf-quote-doc.pdf-quote-v3 {
            direction: ltr;
            text-align: left;
            font-size: 12px;
            color: #111827;
            border: none;
            border-radius: 0;
            background: #ffffff;
        }

        .pdf-quote-v3-page {
            width: 100%;
            background: #ffffff;
        }

        /* Header */
        .pdf-quote-v3-header {
            width: 100%;
            border-collapse: collapse;
            background: #0f1d36;
            margin: 0;
        }

        .pdf-quote-v3-header td {
            padding: 18px 28px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-header__accent {
            height: 3px;
            background: #e8790a;
            font-size: 0;
            line-height: 0;
        }

        .pdf-quote-v3-logo-img {
            max-height: 48px;
            max-width: 120px;
            vertical-align: middle;
        }

        .pdf-quote-v3-logo-fallback {
            display: inline-block;
            width: 44px;
            height: 44px;
            background: #243858;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            line-height: 44px;
        }

        .pdf-quote-v3-brand-name {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.5px;
            line-height: 1.15;
        }

        .pdf-quote-v3-brand-tag {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.45);
            margin-top: 3px;
            letter-spacing: 0.3px;
        }

        .pdf-quote-v3-doc-en {
            font-size: 18px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1px;
            text-transform: uppercase;
            line-height: 1.1;
        }

        .pdf-quote-v3-doc-ar {
            font-size: 14px;
            color: #e8790a;
            font-weight: 700;
            margin-top: 3px;
            direction: rtl;
            text-align: right;
        }

        .pdf-quote-v3-doc-ref {
            font-size: 9.5px;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 10px;
            letter-spacing: 0.6px;
            font-family: DejaVu Sans Mono, monospace;
        }

        .pdf-quote-v3-badge {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: rgba(232, 121, 10, 0.25);
            color: #f5c77a;
            border-radius: 4px;
        }

        /* Info bar */
        .pdf-quote-v3-infobar {
            width: 100%;
            border-collapse: collapse;
            background: #fafbfc;
            border-bottom: 1.5px solid #e5e7eb;
        }

        .pdf-quote-v3-infobar td {
            padding: 10px 28px;
            vertical-align: top;
            border: none;
        }

        .pdf-quote-v3-info-label {
            font-size: 8px;
            color: #9ca3af;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .pdf-quote-v3-info-val {
            font-size: 11.5px;
            font-weight: 700;
            color: #1b2a4a;
            margin-top: 1px;
        }

        .pdf-quote-v3-info-sub {
            font-size: 8px;
            color: #9ca3af;
            margin-top: 1px;
            direction: rtl;
            text-align: right;
        }

        .pdf-quote-v3-info-mono {
            font-family: DejaVu Sans Mono, monospace;
            letter-spacing: 0.4px;
        }

        /* Body padding */
        .pdf-quote-v3-body {
            padding: 16px 28px 12px;
        }

        /* Parties */
        .pdf-quote-v3-parties {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 14px;
            overflow: hidden;
        }

        .pdf-quote-v3-parties td {
            padding: 12px 16px;
            vertical-align: top;
            border: none;
            background: #ffffff;
        }

        .pdf-quote-v3-party-div {
            width: 1px;
            background: #e5e7eb;
            padding: 0 !important;
        }

        .pdf-quote-v3-party-role {
            font-size: 8.5px;
            font-weight: 700;
            color: #e8790a;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 5px;
        }

        .pdf-quote-v3-party-name {
            font-size: 13px;
            font-weight: 700;
            color: #1b2a4a;
            margin-bottom: 4px;
        }

        .pdf-quote-v3-party-company {
            font-size: 11px;
            font-weight: 700;
            color: #1b2a4a;
            margin-bottom: 4px;
        }

        .pdf-quote-v3-party-detail {
            font-size: 9.5px;
            color: #9ca3af;
            line-height: 1.65;
        }

        /* Route card */
        .pdf-quote-v3-route {
            width: 100%;
            border-collapse: collapse;
            background: #0f1d36;
            border-radius: 8px;
            margin-bottom: 10px;
        }

        .pdf-quote-v3-route td {
            padding: 12px 18px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-port-name {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.1;
        }

        .pdf-quote-v3-port-lbl {
            font-size: 8px;
            color: rgba(255, 255, 255, 0.38);
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .pdf-quote-v3-route-arrow {
            color: #e8790a;
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            width: 28px;
        }

        .pdf-quote-v3-rmeta-val {
            font-size: 11.5px;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
        }

        .pdf-quote-v3-rmeta-lbl {
            font-size: 7.5px;
            color: rgba(255, 255, 255, 0.38);
            margin-top: 2px;
            text-align: center;
            text-transform: uppercase;
        }

        .pdf-quote-v3-rmeta-sep {
            width: 1px;
            background: rgba(255, 255, 255, 0.12);
            padding: 0 !important;
        }

        /* Sailings */
        .pdf-quote-v3-sailings {
            width: 100%;
            border-collapse: collapse;
            background: #fdf3e6;
            border: 1px solid #f5c77a;
            border-radius: 8px;
            margin-bottom: 14px;
        }

        .pdf-quote-v3-sailings td {
            padding: 8px 14px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-sailings-lbl-en {
            font-size: 10px;
            font-weight: 700;
            color: #e8790a;
            white-space: nowrap;
        }

        .pdf-quote-v3-sailings-lbl-ar {
            font-size: 9px;
            color: #9a6200;
            direction: rtl;
            white-space: nowrap;
        }

        .pdf-quote-v3-sailing-pill {
            display: inline-block;
            background: #ffffff;
            border: 1px solid #f5c77a;
            border-radius: 5px;
            padding: 3px 10px;
            font-size: 10px;
            font-weight: 600;
            color: #1b2a4a;
            font-family: DejaVu Sans Mono, monospace;
            margin: 2px 4px 2px 0;
            letter-spacing: 0.2px;
        }

        .pdf-quote-v3-sailing-text {
            font-size: 10px;
            font-weight: 600;
            color: #1b2a4a;
        }

        /* Sections */
        .pdf-quote-v3-section {
            margin-bottom: 14px;
        }

        .pdf-quote-v3-sec-head {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            border-bottom: 2px solid #1b2a4a;
        }

        .pdf-quote-v3-sec-head td {
            padding: 0 0 6px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-sec-num {
            width: 22px;
            height: 22px;
            background: #e8790a;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 700;
            text-align: center;
            vertical-align: middle;
            border-radius: 4px;
        }

        .pdf-quote-v3-sec-title-en {
            font-size: 12px;
            font-weight: 700;
            color: #1b2a4a;
        }

        .pdf-quote-v3-sec-title-ar {
            font-size: 9.5px;
            color: #9ca3af;
            direction: rtl;
            text-align: right;
        }

        .pdf-quote-v3-sec-meta {
            font-size: 8.5px;
            color: #9ca3af;
            font-family: DejaVu Sans Mono, monospace;
            text-align: right;
            letter-spacing: 0.2px;
        }

        /* Pricing table */
        .pdf-quote-v3-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
        }

        .pdf-quote-v3-table thead tr {
            background: #1b2a4a;
        }

        .pdf-quote-v3-table th {
            padding: 6px 10px;
            font-size: 8px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.75);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
            border: none;
        }

        .pdf-quote-v3-table th.qtv3-th-center {
            text-align: center;
        }

        .pdf-quote-v3-table th.qtv3-th-right {
            text-align: right;
        }

        .pdf-quote-v3-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10.5px;
            color: #374151;
            vertical-align: middle;
        }

        .pdf-quote-v3-table tbody tr.qtv3-row-alt td {
            background: #fafbfc;
        }

        .pdf-quote-v3-charge-en {
            font-weight: 600;
            color: #1b2a4a;
            font-size: 10.5px;
        }

        .pdf-quote-v3-charge-ar {
            font-size: 8.5px;
            color: #9ca3af;
            direction: rtl;
            text-align: right;
            margin-top: 1px;
        }

        .pdf-quote-v3-td-center {
            text-align: center;
            font-size: 9.5px;
            color: #9ca3af;
        }

        .pdf-quote-v3-td-right {
            text-align: right;
            font-weight: 700;
            color: #1b2a4a;
            font-family: DejaVu Sans Mono, monospace;
            font-size: 11px;
            white-space: nowrap;
        }

        .pdf-quote-v3-table tr.qtv3-subtotal td {
            background: #fdf3e6 !important;
            border-top: 1.5px solid #f5c77a !important;
            border-bottom: none !important;
            font-weight: 700 !important;
            color: #1b2a4a !important;
            font-size: 10.5px !important;
        }

        .pdf-quote-v3-table tr.qtv3-subtotal td.qtv3-td-right {
            color: #e8790a !important;
            font-size: 12px !important;
        }

        .pdf-quote-v3-sub-ar {
            font-size: 8.5px;
            color: #9a6200;
            direction: rtl;
            margin-left: 6px;
        }

        /* Handling row */
        .pdf-quote-v3-handling {
            width: 100%;
            border-collapse: collapse;
            background: #fafbfc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .pdf-quote-v3-handling td {
            padding: 9px 16px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-handling-en {
            font-size: 11px;
            font-weight: 600;
            color: #1b2a4a;
        }

        .pdf-quote-v3-handling-ar {
            font-size: 9px;
            color: #9ca3af;
            direction: rtl;
            text-align: right;
        }

        .pdf-quote-v3-handling-val {
            font-size: 13px;
            font-weight: 700;
            color: #1b2a4a;
            font-family: DejaVu Sans Mono, monospace;
            text-align: right;
        }

        /* Grand total */
        .pdf-quote-v3-grand {
            width: 100%;
            border-collapse: collapse;
            background: #0f1d36;
            border-radius: 8px;
            margin-bottom: 14px;
        }

        .pdf-quote-v3-grand td {
            padding: 14px 20px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-gt-en {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
        }

        .pdf-quote-v3-gt-ar {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.45);
            direction: rtl;
            text-align: right;
        }

        .pdf-quote-v3-gt-main {
            font-size: 20px;
            font-weight: 700;
            color: #e8790a;
            font-family: DejaVu Sans Mono, monospace;
            text-align: right;
        }

        .pdf-quote-v3-gt-secondary {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            font-family: DejaVu Sans Mono, monospace;
            text-align: right;
            margin-top: 3px;
        }

        /* Receipts note — EN left, AR right */
        .pdf-quote-v3-receipts {
            width: 100%;
            border-collapse: collapse;
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            margin-bottom: 12px;
            font-size: 9.5px;
            color: #14532d;
            line-height: 1.65;
        }

        .pdf-quote-v3-receipts-col {
            padding: 9px 12px;
            vertical-align: top;
        }

        .pdf-quote-v3-receipts-col--en {
            direction: ltr;
            text-align: left;
        }

        .pdf-quote-v3-receipts-col--ar {
            direction: rtl;
            text-align: right;
            font-size: 9px;
            color: #166534;
            line-height: 1.6;
        }

        .pdf-quote-v3-receipts-title {
            font-size: 10.5px;
            font-weight: 700;
            color: #16a34a;
            margin-bottom: 3px;
        }

        /* Terms */
        .pdf-quote-v3-terms {
            background: #fafbfc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 12px;
        }

        .pdf-quote-v3-terms-title {
            font-size: 11px;
            font-weight: 700;
            color: #1b2a4a;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
        }

        .pdf-quote-v3-terms-title-ar {
            font-size: 9.5px;
            color: #9ca3af;
            direction: rtl;
            float: right;
        }

        .pdf-quote-v3-term {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        .pdf-quote-v3-term:last-child {
            margin-bottom: 0;
        }

        .pdf-quote-v3-term td {
            padding: 0;
            vertical-align: top;
            border: none;
        }

        .pdf-quote-v3-term-num {
            width: 18px;
            height: 18px;
            background: #1b2a4a;
            color: #ffffff;
            font-size: 8.5px;
            font-weight: 700;
            text-align: center;
            vertical-align: middle;
            border-radius: 50%;
        }

        .pdf-quote-v3-term-text {
            font-size: 9.5px;
            color: #4b5563;
            line-height: 1.65;
            padding-left: 8px;
        }

        .pdf-quote-v3-term-text strong {
            color: #1b2a4a;
        }

        .pdf-quote-v3-term-ar {
            font-size: 8.5px;
            color: #9ca3af;
            direction: rtl;
            text-align: right;
            margin-top: 2px;
        }

        /* Sales rep */
        .pdf-quote-v3-sales {
            width: 100%;
            border-collapse: collapse;
            background: #fafbfc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 10px;
        }

        .pdf-quote-v3-sales td {
            padding: 12px 16px;
            vertical-align: middle;
            border: none;
        }

        .pdf-quote-v3-sr-avatar {
            width: 36px;
            height: 36px;
            background: #1b2a4a;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            text-align: center;
            vertical-align: middle;
            border-radius: 6px;
        }

        .pdf-quote-v3-sr-title {
            font-size: 8px;
            font-weight: 600;
            color: #e8790a;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .pdf-quote-v3-sr-name {
            font-size: 12px;
            font-weight: 700;
            color: #1b2a4a;
        }

        .pdf-quote-v3-sr-role {
            font-size: 9px;
            color: #9ca3af;
            margin-top: 1px;
        }

        .pdf-quote-v3-sr-contact {
            font-size: 9px;
            color: #4b5563;
            text-align: right;
            line-height: 1.5;
        }

        .pdf-quote-v3-sr-contact span {
            color: #e8790a;
            font-weight: 600;
        }

        /* Footer */
        .pdf-quote-v3-footer {
            width: 100%;
            border-collapse: collapse;
            background: #0f1d36;
            border-top: 2px solid #e8790a;
            margin-top: 8px;
        }

        .pdf-quote-v3-footer td {
            padding: 12px 28px;
            vertical-align: middle;
            border: none;
            font-size: 8.5px;
            color: rgba(255, 255, 255, 0.5);
        }

        .pdf-quote-v3-footer span {
            color: #e8790a;
            font-weight: 600;
        }

        .pdf-quote-v3-footer-brand {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.5px;
            text-align: center;
        }

        .pdf-quote-v3-footer-slogan {
            font-size: 8px;
            color: rgba(255, 255, 255, 0.35);
            text-align: center;
            direction: rtl;
        }

        /* Deferred footnotes */
        .pdf-quote-reefer-deferred-footnote-row td {
            border: none !important;
            padding: 4px 10px 8px !important;
            background: transparent !important;
        }

        .pdf-quote-reefer-deferred-footnote-cell {
            font-size: 9.5px;
            color: #9ca3af;
            text-align: right;
        }

        .pdf-quote-reefer-deferred-footnote__plus {
            font-weight: 700;
            margin-right: 4px;
            color: #6b7280;
        }

        .pdf-quote-reefer-deferred-footnote__power {
            font-style: italic;
            text-decoration: line-through;
            color: #b45309;
        }

        .pdf-quote-ows-deferred-footnote__label {
            font-style: italic;
            text-decoration: line-through;
            color: #6d28d9;
        }
    </style>
@endpush

@section('content')
    @php
        $client = $quote->client;
        $formatBreakdown = $formatBreakdown ?? static fn(array $m): string => '—';
        $currencyOrder = ['USD', 'EGP', 'EUR'];
        $isSeaQuote = $isSeaQuote ?? true;
        $isInlandQuote = $isInlandQuote ?? false;
        $companyProfile = $companyProfile ?? [];
        $salesUser = $quote->salesUser;

        $companyAddress = trim((string) ($companyProfile['address'] ?? ''));
        if ($companyAddress === '') {
            $companyAddress = '5th Settlement, New Cairo, Egypt';
        }
        $companyEmail = trim((string) ($companyProfile['email'] ?? '')) ?: 'cs@amazonmarine.ltd';
        $companyWebsite = trim((string) ($companyProfile['website'] ?? '')) ?: 'www.amazonmarine.ltd';
        $companyPhone = trim((string) ($companyProfile['phone'] ?? '')) ?: '+20 2 25601776';
        $companyPhone2 = trim((string) ($companyProfile['phone_2'] ?? ($companyProfile['mobile'] ?? '')));

        $serviceParts = [];
        if ($isSeaQuote) {
            $serviceParts[] = 'Ocean';
        }
        if ($isInlandQuote || ($inlandItems ?? collect())->isNotEmpty()) {
            $serviceParts[] = 'Inland';
        }
        if (($customsItems ?? collect())->isNotEmpty()) {
            $serviceParts[] = 'Customs';
        }
        $servicesDisplay = $serviceParts !== [] ? implode(' + ', $serviceParts) : '—';

        $routeMetas = [];
        if ($isSeaQuote) {
            if ($showCarrier ?? true) {
                $routeMetas[] = ['val' => $quote->shipping_line ?: '—', 'lbl' => $labels['carrier'] ?? 'Carrier'];
            }
            $routeMetas[] = ['val' => $containerDisplay, 'lbl' => $labels['containers'] ?? 'Container'];
            $routeMetas[] = ['val' => $quote->transit_time ?: '—', 'lbl' => $labels['transit_time'] ?? 'Transit'];
        }
        if (($inlandItems ?? collect())->isNotEmpty()) {
            $inlandRoute = trim(
                implode(
                    ' → ',
                    array_filter([$quote->inland_port ?: $quote->pod, $quote->municipality, $quote->inland_address]),
                ),
            );
            if ($inlandRoute !== '') {
                $routeMetas[] = ['val' => $inlandRoute, 'lbl' => $labels['inland_route'] ?? 'Inland Route'];
            }
        }

        $sections = [];
        $sectionNum = 0;
        if ($isSeaQuote) {
            $sections[] = [
                'key' => 'ocean',
                'num' => ++$sectionNum,
                'items' => $oceanItems,
                'totals' => $oceanTotalsByCurrency,
                'en' => 'Ocean Freight',
                'ar' => 'الشحن البحري',
                'meta' => trim(
                    implode(
                        ' · ',
                        array_filter([
                            ($quote->pol ?: '—') . ' → ' . ($quote->pod ?: '—'),
                            $showCarrier ?? true ? ($quote->shipping_line ?: null) : null,
                            $containerDisplay !== '—' ? $containerDisplay : null,
                        ]),
                    ),
                ),
                'detailsFallback' => $containerDisplay,
            ];
        }
        if ($isInlandQuote || ($inlandItems ?? collect())->isNotEmpty()) {
            $sections[] = [
                'key' => 'inland',
                'num' => ++$sectionNum,
                'items' => $inlandItems,
                'totals' => $inlandTotalsByCurrency,
                'en' => 'Inland Transport',
                'ar' => 'النقل الداخلي',
                'meta' =>
                    trim(
                        implode(
                            ' → ',
                            array_filter([
                                $quote->inland_port ?: $quote->pod,
                                $quote->inland_address ?: $quote->municipality,
                            ]),
                        ),
                    ) ?:
                    '—',
                'detailsFallback' => '—',
            ];
        }
        if (($customsItems ?? collect())->isNotEmpty()) {
            $sections[] = [
                'key' => 'customs',
                'num' => ++$sectionNum,
                'items' => $customsItems,
                'totals' => $customsTotalsByCurrency,
                'en' => 'Customs Clearance',
                'ar' => 'التخليص الجمركي',
                'meta' => '',
                'detailsFallback' => '—',
            ];
        }

        $sailingPills = [];
        if ($isSeaQuote && $quote->sailingDates->isNotEmpty()) {
            foreach ($quote->sailingDates as $row) {
                if ($row->sailing_date) {
                    $sailingPills[] = $row->sailing_date
                        ->copy()
                        ->timezone(config('app.timezone'))
                        ->locale($lang)
                        ->isoFormat('D MMM YYYY');
                }
            }
        }

        $grandMain = null;
        $grandSecondary = [];
        foreach ($currencyOrder as $curCode) {
            $amt = (float) ($grandTotalsByCurrency[$curCode] ?? 0);
            if (abs($amt) <= 1e-9) {
                continue;
            }
            $formatted = number_format($amt, 2) . ' ' . $curCode;
            if ($grandMain === null) {
                $grandMain = $formatted;
            } else {
                $grandSecondary[] = $formatted;
            }
        }
        foreach ($grandTotalsByCurrency as $curCode => $amt) {
            if (in_array($curCode, $currencyOrder, true)) {
                continue;
            }
            if (abs((float) $amt) <= 1e-9) {
                continue;
            }
            $grandSecondary[] = number_format((float) $amt, 2) . ' ' . strtoupper((string) $curCode);
        }

        $showReceiptsNote = trim((string) ($quote->official_receipts_note ?? '')) !== '';

        $salesInitials = '';
        if ($salesUser?->initials) {
            $salesInitials = strtoupper(substr((string) $salesUser->initials, 0, 2));
        } elseif ($salesUser?->name) {
            $parts = preg_split('/\s+/', trim((string) $salesUser->name)) ?: [];
            $salesInitials = strtoupper(
                substr((string) ($parts[0] ?? 'A'), 0, 1) . substr((string) ($parts[1] ?? 'M'), 0, 1),
            );
        } else {
            $salesInitials = 'AM';
        }
    @endphp

    <div class="pdf-wrapper pdf-sd-doc pdf-quote-doc pdf-quote-v3" dir="ltr" lang="{{ $lang }}">
        <div class="pdf-quote-v3-page">

            <table class="pdf-quote-v3-header" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td width="60%">
                        <table width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td width="50" valign="middle">
                                    @if (!empty($pdfLogoSrc))
                                        <img class="pdf-quote-v3-logo-img" src="{{ $pdfLogoSrc }}" alt="">
                                    @else
                                        <span class="pdf-quote-v3-logo-fallback">AMS</span>
                                    @endif
                                </td>
                                <td valign="middle">
                                    <div class="pdf-quote-v3-brand-name">AMAZON MARINE</div>
                                    <div class="pdf-quote-v3-brand-tag">Integrated Ocean Freight &amp; Logistics</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td width="40%" align="right" valign="middle">
                        <div class="pdf-quote-v3-doc-en">{{ $labels['doc_title_en'] }}</div>
                        <div class="pdf-quote-v3-doc-ar">{{ $labels['doc_title_ar'] }}</div>
                        <div class="pdf-quote-v3-doc-ref">REF: {{ $quote->quote_no }}</div>
                        @if ($quote->quick_mode)
                            <span class="pdf-quote-v3-badge">{{ $labels['quick_quotation_badge'] ?? 'Quick' }}</span>
                        @endif
                    </td>
                </tr>
            </table>

            <div class="pdf-quote-v3-header__accent">&nbsp;</div>

            <table class="pdf-quote-v3-infobar" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td width="70%">
                        <table cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="padding-right:24px;" valign="top">
                                    <div class="pdf-quote-v3-info-label">{{ $labels['issued_date'] }}</div>
                                    <div class="pdf-quote-v3-info-val">{{ $issueDateFormatted }}</div>
                                    <div class="pdf-quote-v3-info-sub">
                                        {{ $labels['issued_date_ar'] ?? $labels['issued_date'] }}</div>
                                </td>
                                <td style="padding-right:24px;" valign="top">
                                    <div class="pdf-quote-v3-info-label">{{ $labels['valid_until'] }}</div>
                                    <div class="pdf-quote-v3-info-val">{{ $validUntilFormatted }}</div>
                                    <div class="pdf-quote-v3-info-sub">{{ $labels['valid_until_ar'] }}</div>
                                </td>
                                <td valign="top">
                                    <div class="pdf-quote-v3-info-label">{{ $labels['services_included'] ?? 'Services' }}
                                    </div>
                                    <div class="pdf-quote-v3-info-val">{{ $servicesDisplay }}</div>
                                    <div class="pdf-quote-v3-info-sub">
                                        {{ $labels['services_included_ar'] ?? 'الخدمات المشمولة' }}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td width="30%" align="right" valign="top">
                        <div class="pdf-quote-v3-info-label">{{ $labels['quotation_id'] }}</div>
                        <div class="pdf-quote-v3-info-val pdf-quote-v3-info-mono">{{ $quote->quote_no }}</div>
                        <div class="pdf-quote-v3-info-sub">{{ $labels['quotation_id_ar'] }}</div>
                    </td>
                </tr>
            </table>

            <div class="pdf-quote-v3-body">

                <table class="pdf-quote-v3-parties" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td width="49%">
                            <div class="pdf-quote-v3-party-role">{{ $labels['from_party'] ?? 'From' }} /
                                {{ $labels['from_party_ar'] ?? 'المرسل' }}</div>
                            <div class="pdf-quote-v3-party-name">{{ $companyDisplayName ?? 'Amazon Marine' }}</div>
                            <div class="pdf-quote-v3-party-detail">
                                {{ $companyAddress }}<br>
                                {{ $companyEmail }}<br>
                                {{ $companyWebsite }}<br>
                                {{ $companyPhone }}@if ($companyPhone2 !== '')
                                    &nbsp;·&nbsp; {{ $companyPhone2 }}
                                @endif
                            </div>
                        </td>
                        <td class="pdf-quote-v3-party-div" width="1%"></td>
                        <td width="49%">
                            <div class="pdf-quote-v3-party-role">{{ $labels['prepared_for'] ?? 'Prepared For' }} /
                                {{ $labels['prepared_for_ar'] ?? 'مُعدّ لـ' }}</div>
                            <div class="pdf-quote-v3-party-name">{{ $client?->name ?? '—' }}</div>
                            @if ($client?->company_name)
                                <div class="pdf-quote-v3-party-company">{{ $client->company_name }}</div>
                            @endif
                            <div class="pdf-quote-v3-party-detail">
                                @if ($client?->address)
                                    {!! nl2br(e($client->address)) !!}<br>
                                @endif
                                @if ($client?->phone)
                                    {{ $client->phone }}<br>
                                @endif
                                @if ($client?->email)
                                    {{ $client->email }}
                                @endif
                            </div>
                        </td>
                    </tr>
                </table>

                <table class="pdf-quote-v3-route" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td width="{{ count($routeMetas) > 0 ? '52%' : '100%' }}">
                            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    @if ($isInlandQuote && !$isSeaQuote)
                                        <td valign="middle">
                                            <div class="pdf-quote-v3-port-name">{{ $quote->municipality ?: '—' }}</div>
                                            <div class="pdf-quote-v3-port-lbl">
                                                {{ $labels['governorate'] ?? 'Governorate' }}</div>
                                        </td>
                                        <td class="pdf-quote-v3-route-arrow" valign="middle">→</td>
                                        <td valign="middle">
                                            <div class="pdf-quote-v3-port-name">{{ $quote->inland_address ?: '—' }}</div>
                                            <div class="pdf-quote-v3-port-lbl">{{ $labels['address'] ?? 'Address' }}</div>
                                        </td>
                                    @else
                                        <td valign="middle">
                                            <div class="pdf-quote-v3-port-name">{{ $quote->pol ?: '—' }}</div>
                                            <div class="pdf-quote-v3-port-lbl">POL</div>
                                        </td>
                                        <td class="pdf-quote-v3-route-arrow" valign="middle">→</td>
                                        <td valign="middle">
                                            <div class="pdf-quote-v3-port-name">{{ $quote->pod ?: '—' }}</div>
                                            <div class="pdf-quote-v3-port-lbl">POD</div>
                                        </td>
                                    @endif
                                </tr>
                            </table>
                        </td>
                        @if (count($routeMetas) > 0)
                            <td width="48%" align="right">
                                <table cellspacing="0" cellpadding="0" border="0" align="right">
                                    <tr>
                                        @foreach ($routeMetas as $idx => $meta)
                                            @if ($idx > 0)
                                                <td class="pdf-quote-v3-rmeta-sep" width="1">&nbsp;</td>
                                            @endif
                                            <td style="padding:0 10px;" valign="middle">
                                                <div class="pdf-quote-v3-rmeta-val">{{ $meta['val'] }}</div>
                                                <div class="pdf-quote-v3-rmeta-lbl">{{ $meta['lbl'] }}</div>
                                            </td>
                                        @endforeach
                                    </tr>
                                </table>
                            </td>
                        @endif
                    </tr>
                </table>

                @if ($isSeaQuote && ($sailingPills !== [] || ($sailingDisplay ?? '—') !== '—'))
                    <table class="pdf-quote-v3-sailings" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td>
                                <span class="pdf-quote-v3-sailings-lbl-en">{{ $labels['available_sailing_en'] }}</span>
                                <span class="pdf-quote-v3-sailings-lbl-ar">/ {{ $labels['available_sailing_ar'] }}</span>
                                @if ($sailingPills !== [])
                                    @foreach ($sailingPills as $pill)
                                        <span class="pdf-quote-v3-sailing-pill">{{ $pill }}</span>
                                    @endforeach
                                @else
                                    <span class="pdf-quote-v3-sailing-text">{{ $sailingDisplay }}</span>
                                @endif
                            </td>
                        </tr>
                    </table>
                @endif

                @foreach ($sections as $section)
                    @if ($section['items']->isNotEmpty())
                        <div class="pdf-quote-v3-section">
                            <table class="pdf-quote-v3-sec-head" width="100%" cellspacing="0" cellpadding="0"
                                border="0">
                                <tr>
                                    <td width="28" valign="middle">
                                        <table cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td class="pdf-quote-v3-sec-num">
                                                    {{ str_pad((string) $section['num'], 2, '0', STR_PAD_LEFT) }}</td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td valign="middle">
                                        <div class="pdf-quote-v3-sec-title-en">{{ $section['en'] }}</div>
                                        <div class="pdf-quote-v3-sec-title-ar">{{ $section['ar'] }}</div>
                                    </td>
                                    @if (($section['meta'] ?? '') !== '')
                                        <td class="pdf-quote-v3-sec-meta" valign="middle">{{ $section['meta'] }}</td>
                                    @endif
                                </tr>
                            </table>
                            @include('pricing.partials.quote_pdf_items_table', [
                                'items' => $section['items'],
                                'sectionEn' => $section['en'],
                                'totals' => $section['totals'],
                                'formatBreakdown' => $formatBreakdown,
                                'detailsFallback' => $section['detailsFallback'],
                                'showReeferDeferredPower' =>
                                    $section['key'] === 'ocean' && !empty($showReeferDeferredPower),
                                'reeferPowerPerDay' => $reeferPowerPerDay ?? null,
                                'reeferFreePowerDaysLabel' => $reeferFreePowerDaysLabel ?? null,
                                'showOwsDeferred' => $section['key'] === 'ocean' && !empty($showOwsDeferred),
                                'owsDeferredLines' => $section['key'] === 'ocean' ? $owsDeferredLines ?? [] : [],
                                'labels' => $labels,
                            ])
                        </div>
                    @endif
                @endforeach

                @if ($handlingItems->isNotEmpty())
                    <table class="pdf-quote-v3-handling" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td>
                                <div class="pdf-quote-v3-handling-en">{{ $labels['section_handling_fees_en'] }}</div>
                                <div class="pdf-quote-v3-handling-ar">{{ $labels['section_handling_fees_ar'] }}</div>
                            </td>
                            <td class="pdf-quote-v3-handling-val" width="35%">
                                {{ $formatBreakdown($handlingTotalsByCurrency) }}</td>
                        </tr>
                    </table>
                @endif

                <table class="pdf-quote-v3-grand" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td width="38%">
                            <div class="pdf-quote-v3-gt-en">{{ $labels['grand_total'] ?? 'Grand Total' }}</div>
                            <div class="pdf-quote-v3-gt-ar">{{ $labels['grand_total_ar'] ?? 'الإجمالي الكلي' }}</div>
                        </td>
                        <td width="62%" align="right">
                            <div class="pdf-quote-v3-gt-main">{{ $grandMain ?? '—' }}</div>
                            @if ($grandSecondary !== [])
                                <div class="pdf-quote-v3-gt-secondary">+ {{ implode(' · ', $grandSecondary) }}</div>
                            @endif
                        </td>
                    </tr>
                </table>

                @if ($showReceiptsNote)
                    @include('pricing.partials.quote_pdf_customs_note')
                @endif

                <div class="pdf-quote-v3-terms">
                    <div class="pdf-quote-v3-terms-title">
                        Terms &amp; Conditions
                        <span class="pdf-quote-v3-terms-title-ar">الشروط والأحكام</span>
                    </div>

                    @if ($isInlandQuote || ($inlandItems ?? collect())->isNotEmpty())
                        <table class="pdf-quote-v3-term" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td width="22" valign="top">
                                    <table cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td class="pdf-quote-v3-term-num">2</td>
                                        </tr>
                                    </table>
                                </td>
                                <td class="pdf-quote-v3-term-text">
                                    <strong>Vehicle Detention &amp; Waiting Time:</strong>
                                    A free waiting period is granted for loading / unloading operations.
                                    Should loading operations exceed the agreed period, a detention penalty (بيات) will be
                                    applied
                                    based on the actual number of additional hours.
                                    <div class="pdf-quote-v3-term-ar">
                                        فترة سماح مجانية لعمليات التحميل. في حال تجاوز المدة المتفق عليها،
                                        يتم احتساب غرامة بيات على حسب عدد ساعات التأخير الفعلية.
                                    </div>
                                </td>
                            </tr>
                        </table>
                    @endif

                    <table class="pdf-quote-v3-term" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td width="22" valign="top">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td class="pdf-quote-v3-term-num">5</td>
                                    </tr>
                                </table>
                            </td>
                            <td class="pdf-quote-v3-term-text">
                                <strong>Quotation Validity:</strong>
                                This quotation is valid until {{ $validUntilFormatted }}.
                                Ocean freight rates are subject to confirmation by the shipping line at the time of actual
                                booking.
                                Any booking placed after the expiry date is subject to re-pricing.
                                <div class="pdf-quote-v3-term-ar">
                                    هذا العرض ساري حتى {{ $validUntilFormatted }}.
                                    أسعار الشحن البحري خاضعة لتأكيد الخط الملاحي وقت الحجز الفعلي.
                                    أي حجز بعد انتهاء الصلاحية يخضع لإعادة التسعير.
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                @if ($salesUser)
                    <table class="pdf-quote-v3-sales" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td width="55%">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td width="42" valign="middle">
                                            <table cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td class="pdf-quote-v3-sr-avatar">{{ $salesInitials }}</td>
                                                </tr>
                                            </table>
                                        </td>
                                        <td valign="middle">
                                            <div class="pdf-quote-v3-sr-title">
                                                {{ $labels['prepared_by'] ?? 'Prepared By' }} /
                                                {{ $labels['prepared_by_ar'] ?? 'مُعدّ بواسطة' }}</div>
                                            <div class="pdf-quote-v3-sr-name">{{ $salesUser->name }}</div>
                                            <div class="pdf-quote-v3-sr-role">
                                                {{ $labels['sales_role'] ?? 'Sales Executive' }} —
                                                {{ $companyDisplayName ?? 'Amazon Marine' }}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td width="45%" align="right">
                                @if ($salesUser->email)
                                    <div class="pdf-quote-v3-sr-contact"><span>Email:</span> {{ $salesUser->email }}</div>
                                @endif
                                <div class="pdf-quote-v3-sr-contact"><span>Office:</span> {{ $companyPhone }}</div>
                            </td>
                        </tr>
                    </table>
                @endif

            </div>

            <table class="pdf-quote-v3-footer" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td width="33%" valign="middle">
                        <div><span>Location:</span> {{ $companyAddress }}</div>
                        <div><span>Email:</span> {{ $companyEmail }}</div>
                    </td>
                    <td width="34%" align="center" valign="middle">
                        <div class="pdf-quote-v3-footer-brand">AMAZON MARINE</div>
                        <div class="pdf-quote-v3-footer-slogan">
                            {{ $labels['footer_slogan'] ?? 'Your Trusted Logistics Partner — شريكك اللوجستي الموثوق' }}
                        </div>
                    </td>
                    <td width="33%" align="right" valign="middle">
                        <div><span>Web:</span> {{ $companyWebsite }}</div>
                        <div><span>Phone:</span> {{ $companyPhone }}@if ($companyPhone2 !== '')
                                &nbsp;/&nbsp; {{ $companyPhone2 }}
                            @endif
                        </div>
                    </td>
                </tr>
            </table>

        </div>
    </div>
@endsection
