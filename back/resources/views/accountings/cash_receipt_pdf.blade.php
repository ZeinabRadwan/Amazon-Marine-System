@php
    $isAr = ($locale ?? 'en') === 'ar';
    $receiptNo = $receipt->receipt_number ?? ($receipt_number_preview ?? '—');
    $kind = $receipt_kind ?? 'mixed';
    $kindBand = $kind_band ?? [];
    $bandClass = $kindBand['class'] ?? ($kind === 'advance' ? 'band-adv' : ($kind === 'shipment' ? 'band-shp' : 'band-mix'));
    $clientName = trim((string) ($client->company_name ?: $client->name));
    $clientContactLines = [];
    if (trim((string) ($client->decision_maker_name ?? '')) !== '') {
        $dmTitle = trim((string) ($client->decision_maker_title_other ?? ''));
        $clientContactLines[] = $dmTitle !== ''
            ? trim($client->decision_maker_name).' — '.$dmTitle
            : trim($client->decision_maker_name);
    }
    $clientMeta = array_filter([
        trim((string) ($client->address ?? '')),
        trim((string) ($client->phone ?? '')),
        trim((string) ($client->email ?? '')),
    ], static fn ($v) => $v !== '');
    if ($clientMeta !== []) {
        $clientContactLines[] = implode(' · ', $clientMeta);
    }
    $companyAddr = trim((string) ($company['address'] ?? ''));
    $companyReach = array_filter([
        trim((string) ($company['email'] ?? '')),
        trim((string) ($company['phone'] ?? '')),
    ], static fn ($v) => $v !== '');
    $companyReachStr = $companyReach !== [] ? implode(' · ', $companyReach) : '';
    $companyDetailParts = array_filter([$companyAddr, $companyReachStr], static fn ($v) => $v !== '');
    $companyDetailHtml = $companyDetailParts !== [] ? implode('<br>', array_map('e', $companyDetailParts)) : '';
    $receiptDate = now()->format('d M Y');
    $paymentDate = $payments->sortBy('paid_at')->first()?->paid_at?->format('d M Y') ?? $receiptDate;
    $infobarMeta = $infobar ?? [];
    $infobarThird = $infobarMeta['third'] ?? [];
    $heroMeta = $hero ?? [];
    $heroNotes = $heroMeta['notes'] ?? [];
    $heroAmounts = $heroMeta['amounts'] ?? [];
    $paymentDetailBlocks = $payment_detail_blocks ?? [];
    $confirmMeta = $confirm ?? [];
@endphp
<!DOCTYPE html>
<html lang="{{ $isAr ? 'ar' : 'en' }}" dir="ltr">

<head>
    <meta charset="UTF-8">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: dejavusans, sans-serif;
            font-size: 11px;
            color: #111827;
        }

        svg,
        svg path,
        svg line,
        svg polyline,
        svg rect,
        svg circle {
            stroke: #ffffff;
            fill: none;
        }

        .hd {
            background: #0F1D36;
            padding: 12px 22px;
            width: 100%;
            border-bottom: 2.5px solid #E8790A;
        }

        .hd table {
            width: 100%;
            border-collapse: collapse;
        }

        .hd td {
            vertical-align: middle;
        }

        .hd-brand-inner {
            width: 100%;
            border-collapse: collapse;
        }

        .hd-brand-inner td {
            vertical-align: middle;
        }

        .hd-logo-cell {
            width: 40%;
            text-align: center;
            padding-right: 6px;
        }

        .hd-text-cell {
            width: 60%;
        }

        .hd-logo-img {
            height: 36px;
            max-width: 100%;
        }

        .logo-name {
            font-size: 16px;
            font-weight: 700;
            color: #fff;
            line-height: 1.3;
        }

        .logo-tag {
            font-size: 8px;
            color: rgba(255, 255, 255, 0.45);
            line-height: 1.35;
        }

        .doc-ar {
            font-size: 16px;
            font-weight: 700;
            color: #fff;
            font-family: dejavusans, sans-serif;
            line-height: 1.3;
        }

        .doc-en {
            font-size: 10px;
            font-weight: 700;
            color: #E8790A;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .doc-ref {
            font-size: 9px;
            color: #9CA3AF;
            font-family: monospace;
            margin-top: 4px;
        }

        .hd-doc {
            text-align: right;
            vertical-align: middle;
        }

        .hd-brand {
            width: 55%;
            vertical-align: middle;
        }

        .band {
            padding: 7px 22px;
            width: 100%;
        }

        .band table {
            width: 100%;
            border-collapse: collapse;
        }

        .band-adv {
            background: #FDF3E6;
            border-bottom: 1px solid #F5C77A;
        }

        .band-shp {
            background: #ECFDF5;
            border-bottom: 1px solid #6EE7B7;
        }

        .band-mix {
            background: #EFF6FF;
            border-bottom: 1px solid #BFDBFE;
        }

        .band-ico {
            width: 26px;
            height: 26px;
            border-radius: 6px;
            text-align: center;
            vertical-align: middle;
        }

        .band-ico svg {
            width: 13px;
            height: 13px;
            stroke: #fff;
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            vertical-align: middle;
            margin-top: 6px;
        }

        .band-text {
            padding: 0 8px;
            vertical-align: middle;
        }

        .b-en {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.35;
        }

        .b-adv-en {
            color: #E8790A;
        }

        .b-shp-en {
            color: #059669;
        }

        .b-mix-en {
            color: #2563EB;
        }

        .b-ar {
            font-size: 10px;
            color: #4B5563;
            line-height: 1.4;
            margin-top: 2px;
        }

        .badge {
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            padding: 2px 8px;
            border-radius: 20px;
            color: #fff;
            white-space: nowrap;
        }

        .badge-adv {
            background: #E8790A;
        }

        .badge-shp {
            background: #059669;
        }

        .badge-mix {
            background: #2563EB;
        }

        .band-badge-cell {
            text-align: right;
            vertical-align: middle;
            width: 90px;
        }

        .infobar {
            background: #FAFBFC;
            border-bottom: 1px solid #E5E7EB;
            padding: 8px 22px;
            width: 100%;
        }

        .infobar > table {
            width: 100%;
            border-collapse: collapse;
        }

        .ig table {
            border-collapse: collapse;
        }

        .ig td.ii {
            padding-left: 12px;
            padding-right: 12px;
            vertical-align: top;
        }

        .ig td.ii:first-child {
            padding-left: 0;
        }

        .ig td.ii:last-child {
            padding-right: 0;
        }

        .ii .lbl {
            font-size: 8px;
            color: #9CA3AF;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .ii .val {
            font-size: 11px;
            font-weight: 700;
            color: #1B2A4A;
            margin-top: 1px;
        }

        .ii .val-mono {
            font-family: monospace;
            letter-spacing: 0.5px;
        }

        .ii .val-sm {
            font-size: 10.5px;
        }

        .ii .sub {
            font-size: 8px;
            color: #9CA3AF;
            margin-top: 1px;
        }

        .ii-right {
            text-align: right;
            vertical-align: top;
            width: 140px;
        }

        .ii-right .val {
            letter-spacing: 1px;
        }

        .body {
            padding: 12px 22px;
        }

        .parties {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            width: 100%;
            margin-bottom: 10px;
            border-collapse: separate;
            border-spacing: 0;
            overflow: hidden;
        }

        .party-cell {
            padding: 12px 16px;
            vertical-align: top;
            width: 49%;
        }

        .party-client {
            text-align: right;
        }

        .party-div {
            width: 1px;
            padding: 0;
            background: #E5E7EB;
        }

        .p-role {
            font-size: 9px;
            font-weight: 700;
            color: #E8790A;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            line-height: 1.35;
        }

        .p-name {
            font-size: 14px;
            font-weight: 700;
            color: #1B2A4A;
            line-height: 1.35;
        }

        .p-det {
            font-size: 9.5px;
            color: #9CA3AF;
            line-height: 1.65;
            margin-top: 4px;
        }

        .hero {
            background: #0F1D36;
            border-radius: 8px;
            padding: 14px 20px;
            color: #fff;
            margin-bottom: 10px;
            width: 100%;
        }

        .hero > table {
            width: 100%;
            border-collapse: collapse;
        }

        .hero-left {
            vertical-align: middle;
            width: 55%;
        }

        .hero-right {
            vertical-align: middle;
            text-align: right;
            width: 45%;
        }

        .h-lbl-en {
            font-size: 14px;
            font-weight: 700;
            color: #fff;
            line-height: 1.3;
        }

        .h-lbl-ar {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.45);
            margin-top: 2px;
            line-height: 1.35;
        }

        .h-note {
            font-size: 8.5px;
            color: rgba(255, 255, 255, 0.3);
            margin-top: 5px;
            line-height: 1.4;
        }

        .h-note-ar {
            font-size: 8.5px;
            color: rgba(255, 255, 255, 0.3);
            margin-top: 2px;
            line-height: 1.4;
        }

        .hero-amt {
            font-size: 24px;
            font-weight: 700;
            font-family: monospace;
            line-height: 1.2;
        }

        .hero-amt-o {
            color: #E8790A;
        }

        .hero-amt-g {
            color: #34D399;
        }

        .hero-amt-yellow {
            font-size: 18px;
            color: #FCD34D;
            font-weight: 700;
            font-family: monospace;
        }

        .h-cur {
            font-size: 9.5px;
            color: rgba(255, 255, 255, 0.45);
            margin-top: 1px;
        }

        .h-sep {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 6px 0;
        }

        .hero-amt-block {
            text-align: right;
        }

        .pay-block {
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .bh {
            background: #1B2A4A;
            padding: 6px 14px;
        }

        .bh table {
            border-collapse: collapse;
        }

        .bh svg {
            width: 13px;
            height: 13px;
            stroke: #ffffff;
            fill: none;
            stroke-width: 2;
            vertical-align: middle;
        }

        .bh-en {
            font-size: 8.5px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.55);
            text-transform: uppercase;
            letter-spacing: 0.7px;
        }

        .bh-ar {
            font-size: 10.5px;
            font-weight: 600;
            color: #fff;
        }

        .brow2,
        .brow1 {
            width: 100%;
            border-collapse: collapse;
        }

        .brow2 td,
        .brow1 td {
            border-bottom: 1px solid #E5E7EB;
            vertical-align: middle;
        }

        .brow2 tr:last-child td,
        .brow1 tr:last-child td {
            border-bottom: none;
        }

        .bk {
            background: #F9FAFB;
            padding: 7px 12px;
            width: 22%;
        }

        .bk-sep {
            border-left: 1px solid #E5E7EB;
        }

        .bk-en {
            font-size: 8px;
            font-weight: 700;
            color: #9CA3AF;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            line-height: 1.3;
        }

        .bk-ar {
            font-size: 10.5px;
            font-weight: 600;
            color: #4B5563;
            line-height: 1.35;
        }

        .bv {
            background: #fff;
            padding: 7px 12px;
            font-size: 11.5px;
            font-weight: 500;
            color: #1B2A4A;
            line-height: 1.5;
        }

        .bv-bold {
            font-weight: 700;
            color: #1B2A4A;
            font-size: 12px;
        }

        .bv-mono {
            font-family: monospace;
            font-size: 12px;
            font-weight: 700;
            color: #1B2A4A;
            letter-spacing: 0.3px;
        }

        .bv-muted {
            color: #4B5563;
        }

        .mpill {
            display: inline-block;
            background: #1B2A4A;
            color: #fff;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 10px;
            border-radius: 20px;
        }

        .confirm {
            border-radius: 6px;
            padding: 9px 14px;
            margin-bottom: 10px;
            width: 100%;
        }

        .confirm-adv {
            background: #FDF3E6;
            border: 1px solid #F5C77A;
        }

        .confirm-shp {
            background: #ECFDF5;
            border: 1px solid #6EE7B7;
        }

        .confirm table {
            width: 100%;
            border-collapse: collapse;
        }

        .c-ico-cell {
            width: 40px;
            vertical-align: middle;
            padding-right: 10px;
        }

        .c-ico {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            text-align: center;
            vertical-align: middle;
        }

        .c-ico-g {
            background: #059669;
        }

        .c-ico-o {
            background: #E8790A;
        }

        .c-ico svg {
            width: 15px;
            height: 15px;
            stroke: #fff;
            fill: none;
            stroke-width: 2.5;
            margin-top: 7px;
        }

        .c-en {
            font-size: 10.5px;
            font-weight: 700;
            line-height: 1.45;
        }

        .c-en-g {
            color: #059669;
        }

        .c-en-o {
            color: #E8790A;
        }

        .c-ar {
            font-size: 9.5px;
            color: #4B5563;
            margin-top: 2px;
            line-height: 1.45;
        }

        .ack {
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 10px;
            width: 100%;
        }

        .ack-head {
            background: #1B2A4A;
            padding: 6px 14px;
        }

        .ack-head table {
            border-collapse: collapse;
        }

        .ack-head svg {
            width: 12px;
            height: 12px;
            stroke: #ffffff;
            fill: none;
            stroke-width: 2;
            vertical-align: middle;
        }

        .ack-head-en {
            font-size: 8.5px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.55);
            text-transform: uppercase;
            letter-spacing: 0.7px;
        }

        .ack-head-ar {
            font-size: 10.5px;
            font-weight: 600;
            color: #fff;
        }

        .ack-row {
            width: 100%;
            border-collapse: collapse;
        }

        .ack-cell {
            padding: 8px 14px;
            width: 33%;
            vertical-align: top;
        }

        .ack-cell-div {
            width: 1px;
            background: #E5E7EB;
            padding: 0;
        }

        .ack-lbl {
            font-size: 8px;
            font-weight: 700;
            color: #9CA3AF;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }

        .ack-sign {
            width: 100%;
            border-collapse: collapse;
        }

        .ack-sign-blank {
            height: 38px;
            line-height: 38px;
            font-size: 1px;
            color: #ffffff;
            vertical-align: bottom;
        }

        .ack-sign-rule {
            border-bottom: 2px solid #1B2A4A;
            height: 0;
            line-height: 0;
            padding: 0;
            vertical-align: top;
        }

        .totals {
            background: #EDF1F8;
            border: 1px solid #C7D6EF;
            border-radius: 6px;
            padding: 10px 14px;
        }

        .tot-row {
            font-size: 11px;
            font-weight: 700;
            color: #1B2A4A;
            margin-bottom: 4px;
        }

        .ft {
            background: #0F1D36;
            color: rgba(255, 255, 255, 0.5);
            font-size: 8px;
            padding: 10px 22px;
            border-top: 2px solid #E8790A;
            margin-top: 8px;
        }
    </style>
</head>

<body>

    <div class="hd">
        <table width="100%">
            <tr>
                <td class="hd-brand">
                    <table class="hd-brand-inner">
                        <tr>
                            <td class="hd-logo-cell">
                                @if (!empty($logo_src))
                                    <img src="{{ $logo_src }}" alt="" class="hd-logo-img">
                                @endif
                            </td>
                            <td class="hd-text-cell">
                                <span class="logo-name">{{ strtoupper($company['name'] ?? 'Amazon Marine') }}</span><br>
                                <span class="logo-tag">{{ $company['tagline'] ?? '' }}</span>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="hd-doc" style="width:45%;">
                    <div class="doc-ar">{{ $labels['doc_title'] }}</div>
                    <div class="doc-en">{{ $labels['doc_sub'] }}</div>
                    <div class="doc-ref">{{ $receiptNo }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="band {{ $bandClass }}">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="26" style="vertical-align:middle;">
                    <div class="band-ico" style="background:{{ $kindBand['ico_bg'] ?? '#E8790A' }};">
                        @if ($kind === 'shipment')
                            <svg viewBox="0 0 24 24" stroke="#ffffff" fill="none">
                                <path stroke="#ffffff" fill="none" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle stroke="#ffffff" fill="none" cx="12" cy="10" r="3" />
                            </svg>
                        @elseif ($kind === 'advance')
                            <svg viewBox="0 0 24 24" stroke="#ffffff" fill="none">
                                <path stroke="#ffffff" fill="none" d="M20 12V22H4V12" />
                                <path stroke="#ffffff" fill="none" d="M22 7H2v5h20V7z" />
                                <path stroke="#ffffff" fill="none" d="M12 22V7" />
                                <path stroke="#ffffff" fill="none" d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                                <path stroke="#ffffff" fill="none" d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                            </svg>
                        @else
                            <svg viewBox="0 0 24 24" stroke="#ffffff" fill="none">
                                <path stroke="#ffffff" fill="none" d="M20 12V22H4V12" />
                                <path stroke="#ffffff" fill="none" d="M22 7H2v5h20V7z" />
                                <path stroke="#ffffff" fill="none" d="M12 22V7" />
                            </svg>
                        @endif
                    </div>
                </td>
                <td class="band-text">
                    <div class="b-en {{ $kindBand['en_class'] ?? 'b-adv-en' }}">{{ $kindBand['en'] ?? '' }}</div>
                    <div class="b-ar">{{ $kindBand['ar'] ?? '' }}</div>
                </td>
                <td class="band-badge-cell">
                    <span class="badge badge-{{ $kind === 'shipment' ? 'shp' : ($kind === 'advance' ? 'adv' : 'mix') }}">{{ $kindBand['badge'] ?? 'MIXED' }}</span>
                </td>
            </tr>
        </table>
    </div>

    <div class="infobar">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td>
                    <div class="ig">
                        <table cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="ii">
                                    <div class="lbl">{{ $infobarMeta['receipt_date_lbl'] ?? 'Receipt Date' }}</div>
                                    <div class="val">{{ $receiptDate }}</div>
                                    <div class="sub">{{ $infobarMeta['receipt_date_sub'] ?? 'تاريخ الإيصال' }}</div>
                                </td>
                                <td class="ii">
                                    <div class="lbl">{{ $infobarMeta['payment_date_lbl'] ?? 'Payment Date' }}</div>
                                    <div class="val">{{ $paymentDate }}</div>
                                    <div class="sub">{{ $infobarMeta['payment_date_sub'] ?? 'تاريخ الدفع' }}</div>
                                </td>
                                <td class="ii">
                                    <div class="lbl">{{ $infobarThird['lbl'] ?? 'Type' }}</div>
                                    <div class="val{{ !empty($infobarThird['val_mono']) ? ' val-mono' : '' }}{{ !empty($infobarThird['val_small']) ? ' val-sm' : '' }}">
                                        {{ $infobarThird['val'] ?? '—' }}
                                    </div>
                                    <div class="sub">{{ $infobarThird['sub'] ?? '' }}</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
                <td class="ii ii-right">
                    <div class="lbl">{{ $infobarMeta['receipt_no_lbl'] ?? 'Receipt No.' }}</div>
                    <div class="val val-mono">{{ $receiptNo }}</div>
                    <div class="sub">{{ $infobarMeta['receipt_no_sub'] ?? 'رقم الإيصال' }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="body">
        <table class="parties" cellpadding="0" cellspacing="0">
            <tr>
                <td class="party-cell">
                    <div class="p-role">Received By / استلمت بواسطة</div>
                    <div class="p-name">{{ $company['name'] ?? 'Amazon Marine' }}</div>
                    @if ($companyDetailHtml !== '')
                        <div class="p-det">{!! $companyDetailHtml !!}</div>
                    @endif
                </td>
                <td class="party-div"></td>
                <td class="party-cell party-client">
                    <div class="p-role">Received From / مُستلم من</div>
                    <div class="p-name">{{ $clientName }}</div>
                    @if ($clientContactLines !== [])
                        <div class="p-det">
                            @foreach ($clientContactLines as $line)
                                @if (!$loop->first)
                                    <br>
                                @endif
                                {{ $line }}
                            @endforeach
                        </div>
                    @endif
                </td>
            </tr>
        </table>

        <div class="hero">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="hero-left">
                        <div class="h-lbl-en">Amount Received</div>
                        <div class="h-lbl-ar">المبلغ المستلم</div>
                    </td>
                    <td class="hero-right">
                        @foreach ($heroAmounts as $row)
                            @if (!$loop->first)
                                <div class="h-sep"></div>
                            @endif
                            <div class="hero-amt-block">
                                <div class="hero-amt {{ $row['amt_class'] }}">
                                    {{ $row['formatted'] }} {{ $row['currency'] }}
                                </div>
                                <div class="h-cur">{{ $row['cur_label'] }}</div>
                            </div>
                        @endforeach
                    </td>
                </tr>
            </table>
        </div>

        @foreach ($paymentDetailBlocks as $block)
            <div class="pay-block">
                <div class="bh">
                    <table cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width:18px;padding-right:7px;vertical-align:middle;">
                                <svg viewBox="0 0 24 24" stroke="#ffffff" fill="none">
                                    <rect stroke="#ffffff" fill="none" x="1" y="4" width="22" height="16" rx="2" />
                                    <line stroke="#ffffff" fill="none" x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                            </td>
                            <td style="vertical-align:middle;">
                                <span class="bh-en">Payment Details</span>
                                <span class="bh-ar"> / تفاصيل الدفع</span>
                            </td>
                        </tr>
                    </table>
                </div>

                <table class="brow2" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="bk">
                            <div class="bk-en">Method</div>
                            <div class="bk-ar">طريقة الدفع</div>
                        </td>
                        <td class="bv">
                            <span class="mpill">{{ $block['method_pill'] }}</span>
                        </td>
                        <td class="bk bk-sep">
                            <div class="bk-en">Source Account</div>
                            <div class="bk-ar">حساب المصدر</div>
                        </td>
                        <td class="bv bv-bold">{{ $block['source_account'] }}</td>
                    </tr>
                </table>

                <table class="brow2" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="bk">
                            <div class="bk-en">Currency</div>
                            <div class="bk-ar">العملة</div>
                        </td>
                        <td class="bv bv-bold">{{ $block['currency'] }}</td>
                        <td class="bk bk-sep">
                            <div class="bk-en">Amount</div>
                            <div class="bk-ar">المبلغ</div>
                        </td>
                        <td class="bv bv-mono">{{ $block['amount'] }}</td>
                    </tr>
                </table>

                <table class="brow1" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="bk">
                            <div class="bk-en">Reference</div>
                            <div class="bk-ar">المرجع</div>
                        </td>
                        <td class="bv bv-mono">{{ $block['reference'] }}</td>
                    </tr>
                </table>

                @if (!empty($block['notes']))
                    <table class="brow1" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="bk">
                                <div class="bk-en">Notes</div>
                                <div class="bk-ar">ملاحظات</div>
                            </td>
                            <td class="bv bv-muted">{{ $block['notes'] }}</td>
                        </tr>
                    </table>
                @endif
            </div>
        @endforeach

        @if (!empty($confirmMeta['en']))
            <div class="confirm {{ $confirmMeta['wrap_class'] ?? 'confirm-adv' }}">
                <table cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="c-ico-cell">
                            <div class="c-ico {{ $confirmMeta['ico_class'] ?? 'c-ico-o' }}">
                                <svg viewBox="0 0 24 24" stroke="#ffffff" fill="none">
                                    <polyline stroke="#ffffff" fill="none" points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </td>
                        <td style="vertical-align:middle;">
                            <div class="c-en {{ $confirmMeta['en_class'] ?? 'c-en-o' }}">{{ $confirmMeta['en'] }}</div>
                            <div class="c-ar">{{ $confirmMeta['ar'] ?? '' }}</div>
                        </td>
                    </tr>
                </table>
            </div>
        @endif

        <div class="ack">
            <div class="ack-head">
                <table cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width:16px;padding-right:7px;vertical-align:middle;">
                            <svg viewBox="0 0 24 24" stroke="#ffffff" fill="none">
                                <path stroke="#ffffff" fill="none" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle stroke="#ffffff" fill="none" cx="9" cy="7" r="4" />
                                <path stroke="#ffffff" fill="none" d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path stroke="#ffffff" fill="none" d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </td>
                        <td style="vertical-align:middle;">
                            <span class="ack-head-en">Acknowledgment of Receipt</span>
                            <span class="ack-head-ar"> / إقرار الاستلام</span>
                        </td>
                    </tr>
                </table>
            </div>
            <table class="ack-row" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="ack-cell">
                        <div class="ack-lbl">Received By / اسم المستلم</div>
                        <table class="ack-sign" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="ack-sign-blank" style="height:38px;line-height:38px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ack-sign-rule" style="border-bottom:2px solid #1B2A4A;height:0;line-height:0;"></td>
                            </tr>
                        </table>
                    </td>
                    <td class="ack-cell-div"></td>
                    <td class="ack-cell">
                        <div class="ack-lbl">Company / الشركة</div>
                        <table class="ack-sign" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="ack-sign-blank" style="height:38px;line-height:38px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ack-sign-rule" style="border-bottom:2px solid #1B2A4A;height:0;line-height:0;"></td>
                            </tr>
                        </table>
                    </td>
                    <td class="ack-cell-div"></td>
                    <td class="ack-cell">
                        <div class="ack-lbl">Signature / التوقيع</div>
                        <table class="ack-sign" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="ack-sign-blank" style="height:38px;line-height:38px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ack-sign-rule" style="border-bottom:2px solid #1B2A4A;height:0;line-height:0;"></td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

    </div>

    <div class="ft">
        {{ $company['name'] ?? 'Amazon Marine' }} · {{ $company['email'] ?? '' }} · {{ $company['phone'] ?? '' }}
    </div>

</body>

</html>
