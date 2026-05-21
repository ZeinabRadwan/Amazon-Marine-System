@php
    $isAr = ($locale ?? 'en') === 'ar';
    $receiptNo = $receipt->receipt_number ?? ($receipt_number_preview ?? '—');
    $kind = $receipt_kind ?? 'mixed';
    $kindLabel = match ($kind) {
        'advance' => $labels['kind_advance'],
        'shipment' => $labels['kind_shipment'],
        default => $labels['kind_mixed'],
    };
    $bandClass = $kind === 'advance' ? 'band-adv' : ($kind === 'shipment' ? 'band-shp' : 'band-mix');
    $clientName = $client->company_name ?: $client->name;
    $receiptDate = now()->format('d M Y');
    $paymentDate = $payments->sortBy('paid_at')->first()?->paid_at?->format('d M Y') ?? $receiptDate;
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
            border-bottom: 1px solid #E5E7EB;
        }

        .band-adv {
            background: #FDF3E6;
        }

        .band-shp {
            background: #ECFDF5;
        }

        .band-mix {
            background: #EFF6FF;
        }

        .band-t {
            font-size: 11px;
            font-weight: 700;
            color: #1B2A4A;
        }

        .infobar {
            background: #FAFBFC;
            border-bottom: 1px solid #E5E7EB;
            padding: 8px 22px;
        }

        .infobar table {
            width: 100%;
        }

        .inf lbl {
            font-size: 8px;
            color: #9CA3AF;
            text-transform: uppercase;
            font-weight: 600;
        }

        .inf val {
            font-size: 11px;
            font-weight: 700;
            color: #1B2A4A;
        }

        .body {
            padding: 12px 22px;
        }

        .parties {
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            width: 100%;
            margin-bottom: 10px;
        }

        .parties td {
            padding: 10px 14px;
            vertical-align: top;
            width: 50%;
        }

        .p-role {
            font-size: 8px;
            font-weight: 700;
            color: #E8790A;
            text-transform: uppercase;
            margin-bottom: 3px;
        }

        .p-name {
            font-size: 13px;
            font-weight: 700;
            color: #1B2A4A;
        }

        .hero {
            background: #0F1D36;
            border-radius: 6px;
            padding: 12px 18px;
            color: #fff;
            margin-bottom: 10px;
        }

        .hero table {
            width: 100%;
        }

        .hero-amt {
            font-size: 20px;
            font-weight: 700;
            font-family: monospace;
        }

        .hero-amt-o {
            color: #FB923C;
        }

        .hero-amt-g {
            color: #34D399;
        }

        .tbl {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            margin-bottom: 10px;
        }

        .tbl th {
            background: #1B2A4A;
            color: #fff;
            font-size: 8px;
            padding: 6px 8px;
            text-align: left;
        }

        .tbl td {
            font-size: 10px;
            padding: 6px 8px;
            border-bottom: 1px solid #E5E7EB;
        }

        .tbl tr:last-child td {
            border-bottom: none;
        }

        .badge {
            display: inline-block;
            font-size: 8px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 12px;
        }

        .badge-adv {
            background: #FDF3E6;
            color: #92400E;
        }

        .badge-shp {
            background: #ECFDF5;
            color: #065F46;
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
        <div class="band-t">{{ $kindLabel }}</div>
    </div>

    <div class="infobar">
        <table>
            <tr>
                <td>
                    <div class="inf">
                        <div class="lbl">{{ $labels['receipt_date'] }}</div>
                        <div class="val">{{ $receiptDate }}</div>
                    </div>
                </td>
                <td>
                    <div class="inf">
                        <div class="lbl">{{ $labels['payment_date'] }}</div>
                        <div class="val">{{ $paymentDate }}</div>
                    </div>
                </td>
                <td style="text-align:right;">
                    <div class="inf">
                        <div class="lbl">{{ $labels['receipt_no'] }}</div>
                        <div class="val" style="font-family:monospace;">{{ $receiptNo }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="body">
        <table class="parties">
            <tr>
                <td>
                    <div class="p-role">{{ $labels['received_by'] }}</div>
                    <div class="p-name">{{ $company['name'] ?? 'Amazon Marine' }}</div>
                    <div style="font-size:9px;color:#9CA3AF;">{{ $company['address'] ?? '' }}</div>
                </td>
                <td>
                    <div class="p-role">{{ $labels['received_from'] }}</div>
                    <div class="p-name">{{ $clientName }}</div>
                </td>
            </tr>
        </table>

        <div class="hero">
            <table>
                <tr>
                    <td style="width:50%;vertical-align:middle;">
                        <div style="font-size:12px;font-weight:700;">{{ $labels['amount_received'] }}</div>
                    </td>
                    <td style="text-align:right;vertical-align:middle;">
                        @foreach ($totals_by_currency as $cur => $amt)
                            <div class="hero-amt {{ $loop->first ? 'hero-amt-o' : 'hero-amt-g' }}">
                                {{ number_format((float) $amt, 2) }} {{ $cur }}</div>
                        @endforeach
                    </td>
                </tr>
            </table>
        </div>

        <div style="font-size:9px;font-weight:700;color:#1B2A4A;margin-bottom:6px;text-transform:uppercase;">
            {{ $labels['payment_details'] }}</div>
        <table class="tbl">
            <thead>
                <tr>
                    <th>{{ $labels['col_payment'] }}</th>
                    <th>{{ $labels['col_type'] }}</th>
                    <th>{{ $labels['col_amount'] }}</th>
                    <th>{{ $labels['col_currency'] }}</th>
                    <th>{{ $labels['col_date'] }}</th>
                    <th>{{ $labels['col_method'] }}</th>
                    <th>{{ $labels['col_shipment'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($payments as $p)
                    <tr>
                        <td style="font-family:monospace;">PAY-{{ $p->id }}</td>
                        <td>
                            @if (!$p->invoice_id)
                                <span class="badge badge-adv">{{ $labels['advance'] }}</span>
                            @else
                                <span class="badge badge-shp">{{ $labels['shipment_linked'] }}</span>
                            @endif
                        </td>
                        <td style="font-weight:700;">{{ number_format((float) $p->amount, 2) }}</td>
                        <td>{{ strtoupper($p->currency_code ?? 'USD') }}</td>
                        <td>{{ $p->paid_at?->format('d/m/Y') ?? '—' }}</td>
                        <td>{{ $p->method ?? '—' }}</td>
                        <td>{{ $p->shipment?->bl_number ?? ($p->invoice?->invoice_number ?? '—') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="totals">
            @foreach ($totals_by_currency as $cur => $amt)
                <div class="tot-row">{{ $labels['total'] }} ({{ $cur }}):
                    {{ number_format((float) $amt, 2) }}</div>
            @endforeach
        </div>
    </div>

    <div class="ft">
        {{ $company['name'] ?? 'Amazon Marine' }} · {{ $company['email'] ?? '' }} · {{ $company['phone'] ?? '' }}
    </div>

</body>

</html>
