<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['title'] }} #{{ $shipment->id }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #1e293b;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            background: #ffffff;
        }
        .wrap { padding: 0 12px; }
        /* —— Letterhead (default header) —— */
        table.doc-shell {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 16px;
        }
        table.doc-shell > tbody > tr > td.doc-accent {
            width: 5px;
            background: #0c4a6e;
            padding: 0;
        }
        table.doc-shell > tbody > tr > td.doc-body {
            padding: 0 0 0 14px;
            vertical-align: top;
        }
        table.letterhead {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #0c4a6e;
            padding-bottom: 0;
            margin-bottom: 12px;
        }
        table.letterhead td {
            vertical-align: top;
            padding: 0 0 12px;
            border: none;
        }
        .lh-logo img {
            height: 44px;
            width: auto;
            max-width: 100px;
            display: block;
        }
        .lh-brand-name {
            font-size: 15px;
            font-weight: 700;
            color: #0c4a6e;
            letter-spacing: 0.04em;
            line-height: 1.2;
        }
        .lh-brand-sub {
            font-size: 8.5px;
            color: #64748b;
            margin-top: 3px;
            letter-spacing: 0.02em;
        }
        .lh-doc-label {
            font-size: 9px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            text-align: right;
        }
        .lh-doc-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            text-align: right;
            margin-top: 2px;
        }
        .lh-doc-sub {
            font-size: 9px;
            color: #475569;
            text-align: right;
            margin-top: 2px;
        }
        /* Reference strip */
        table.ref-strip {
            width: 100%;
            border-collapse: collapse;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        table.ref-strip td {
            width: 25%;
            padding: 8px 10px;
            vertical-align: top;
            border-right: 1px solid #e2e8f0;
            font-size: 9px;
        }
        table.ref-strip td:last-child { border-right: none; }
        .ref-k {
            display: block;
            font-size: 7.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 2px;
        }
        .ref-v {
            font-size: 10px;
            font-weight: 600;
            color: #0f172a;
        }
        .body-pad {
            padding: 0 0 14px 0;
        }
        /* Sections */
        .sec {
            margin: 0 0 14px;
        }
        .sec-h {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.11em;
            color: #0c4a6e;
            margin: 0 0 6px;
            padding: 0 0 4px;
            border-bottom: 1px solid #cbd5e1;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            border: 1px solid #e2e8f0;
        }
        table.data th,
        table.data td {
            border: 1px solid #e2e8f0;
            padding: 7px 9px;
            vertical-align: top;
        }
        table.data th {
            background: #f1f5f9;
            font-size: 8px;
            font-weight: 700;
            color: #475569;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        table.data td {
            font-size: 10px;
            color: #0f172a;
            background: #ffffff;
        }
        table.data + table.data {
            margin-top: -1px;
        }
        .lbl {
            color: #334155;
            font-weight: 600;
        }
        .cell-muted {
            color: #94a3b8;
        }
        .block-text {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .notes-box {
            border: 1px solid #e2e8f0;
            border-top: none;
            background: #fafafa;
            padding: 10px 12px;
            font-size: 10px;
            line-height: 1.55;
            color: #334155;
        }
        .notes-box strong {
            color: #0c4a6e;
            font-weight: 700;
        }
        .footer {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 8.5px;
            color: #64748b;
        }
        .footer-h {
            font-weight: 700;
            color: #0c4a6e;
            margin: 0 0 6px;
            font-size: 8.5px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .footer table { width: 100%; border-collapse: collapse; }
        .footer table td {
            padding: 2px 8px 2px 0;
            vertical-align: top;
            border: none;
            font-size: 8.5px;
        }
        .footer strong { color: #334155; font-weight: 600; }
    </style>
</head>
<body>
    @php
        $logoPath = base_path('../front/src/assets/logo_darkmode.png');
        $logoSrc = file_exists($logoPath) ? 'file://'.str_replace('\\', '/', $logoPath) : null;
        $sdNo = $shipment->sdForm?->sd_number ?? ($shipment->sd_form_id ? 'SD-'.$shipment->sd_form_id : '—');
        $genAt = now()->format('d/m/Y H:i');
        $bookingD = optional($shipment->booking_date)->format('d/m/Y') ?? '—';
        $loadingD = optional($shipment->loading_date)->format('d/m/Y') ?? '—';
    @endphp

    <div class="wrap">
        @if(!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <table class="doc-shell" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="doc-accent"></td>
                    <td class="doc-body">
                        <table class="letterhead" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="width:88px;">
                                    @if($logoSrc)
                                        <img src="{{ $logoSrc }}" alt="" class="lh-logo" style="height:44px;width:auto;max-width:100px;display:block;">
                                    @else
                                        <div style="width:72px;height:38px;border:1px solid #e2e8f0;text-align:center;line-height:38px;font-size:7px;color:#64748b;">LOGO</div>
                                    @endif
                                </td>
                                <td style="padding-left:12px;">
                                    <div class="lh-brand-name">AMAZON MARINE</div>
                                    <div class="lh-brand-sub">Shipping and Logistics Solutions</div>
                                </td>
                                <td style="width:38%;">
                                    <div class="lh-doc-label">{{ $labels['doc_subtitle'] }}</div>
                                    <div class="lh-doc-title">{{ $labels['title'] }}</div>
                                    <div class="lh-doc-sub">#{{ $shipment->id }} · {{ $genAt }}</div>
                                </td>
                            </tr>
                        </table>
                        <table class="ref-strip" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <span class="ref-k">{{ $labels['client'] }}</span>
                                    <span class="ref-v">{{ $shipment->client?->company_name ?? $shipment->client?->name ?? '—' }}</span>
                                </td>
                                <td>
                                    <span class="ref-k">{{ $labels['status'] }}</span>
                                    <span class="ref-v">{{ $shipment->status ?? '—' }}</span>
                                </td>
                                <td>
                                    <span class="ref-k">{{ $labels['id'] }}</span>
                                    <span class="ref-v">#{{ $shipment->id }}</span>
                                </td>
                                <td>
                                    <span class="ref-k">{{ $labels['generated'] }}</span>
                                    <span class="ref-v">{{ $genAt }}</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        @endif

        <div class="body-pad">
            <div class="sec">
                <p class="sec-h">{{ $labels['sec_shipment'] }}</p>
                <table class="data" cellpadding="0" cellspacing="0">
                    <tr>
                        <th style="width:33.33%;">{{ $labels['sales_rep'] }}</th>
                        <th style="width:33.33%;">{{ $labels['sd_form'] }}</th>
                        <th style="width:33.33%;">{{ $labels['status'] }}</th>
                    </tr>
                    <tr>
                        <td>{{ $shipment->salesRep?->name ?? '—' }}</td>
                        <td>{{ $sdNo }}</td>
                        <td>{{ $shipment->status ?? '—' }}</td>
                    </tr>
                </table>
            </div>

            <div class="sec">
                <p class="sec-h">{{ $labels['sec_booking'] }}</p>
                <table class="data" cellpadding="0" cellspacing="0">
                    <tr>
                        <th style="width:33.33%;">{{ $labels['booking_date'] }}</th>
                        <th style="width:33.33%;">{{ $labels['booking_number'] }}</th>
                        <th style="width:33.33%;">{{ $labels['bl_number'] }}</th>
                    </tr>
                    <tr>
                        <td>{{ $bookingD }}</td>
                        <td>{{ $shipment->booking_number ?? '—' }}</td>
                        <td>{{ $shipment->bl_number ?? '—' }}</td>
                    </tr>
                </table>
            </div>

            <div class="sec">
                <p class="sec-h">{{ $labels['sec_shipping'] }}</p>
                <table class="data" cellpadding="0" cellspacing="0">
                    <tr>
                        <th style="width:20%;">{{ $labels['mode'] }}</th>
                        <th style="width:20%;">{{ $labels['shipment_type'] }}</th>
                        <th style="width:20%;">{{ $labels['direction'] }}</th>
                        <th style="width:20%;">{{ $labels['shipping_line'] }}</th>
                        <th style="width:20%;">{{ $labels['line_vendor'] }}</th>
                    </tr>
                    <tr>
                        <td>{{ $shipment->mode ?? '—' }}</td>
                        <td>{{ $shipment->shipment_type ?? '—' }}</td>
                        <td>{{ $shipment->shipment_direction ?? '—' }}</td>
                        <td>{{ $shipment->shippingLine?->name ?? '—' }}</td>
                        <td>{{ $shipment->lineVendor?->name ?? '—' }}</td>
                    </tr>
                    @if($shipment->shipment_direction === 'Import' || filled($shipment->acid_number))
                    <tr>
                        <th>{{ $labels['acid'] }}</th>
                        <td colspan="4">{{ $shipment->acid_number ?? '—' }}</td>
                    </tr>
                    @endif
                </table>
                <table class="data" cellpadding="0" cellspacing="0">
                    <tr>
                        <th style="width:25%;">{{ $labels['container_type'] }}</th>
                        <th style="width:25%;">{{ $labels['container_size'] }}</th>
                        <th style="width:25%;">{{ $labels['container_count'] }}</th>
                        <th style="width:25%;">{{ $labels['loading_place'] }}</th>
                    </tr>
                    <tr>
                        <td>{{ $shipment->container_type ?? '—' }}</td>
                        <td>{{ $shipment->container_size ?? '—' }}</td>
                        <td>{{ $shipment->container_count ?? '—' }}</td>
                        <td>{{ $shipment->loading_place ?? '—' }}</td>
                    </tr>
                </table>
            </div>

            <div class="sec">
                <p class="sec-h">{{ $labels['sec_ports'] }}</p>
                <table class="data" cellpadding="0" cellspacing="0">
                    <tr>
                        <th style="width:33.33%;">{{ $labels['pol'] }}</th>
                        <th style="width:33.33%;">{{ $labels['pod'] }}</th>
                        <th style="width:33.33%;">{{ $labels['loading_date'] }}</th>
                    </tr>
                    <tr>
                        <td>{{ $shipment->originPort?->name ?? '—' }}</td>
                        <td>{{ $shipment->destinationPort?->name ?? '—' }}</td>
                        <td>{{ $loadingD }}</td>
                    </tr>
                </table>
            </div>

            <div class="sec">
                <p class="sec-h">{{ $labels['sec_goods'] }}</p>
                <table class="data" cellpadding="0" cellspacing="0">
                    <tr>
                        <th style="width:18%;">{{ $labels['id'] }}</th>
                        <th>{{ $labels['cargo'] }}</th>
                    </tr>
                    <tr>
                        <td class="lbl">#{{ $shipment->id }}</td>
                        <td class="block-text">{!! $shipment->cargo_description ? nl2br(e($shipment->cargo_description)) : '—' !!}</td>
                    </tr>
                </table>
                <div class="notes-box">
                    @if(filled($notesColumn))
                        <strong>{{ $labels['notes'] }}:</strong><br>
                        <span class="block-text">{!! nl2br(e($notesColumn)) !!}</span>
                    @else
                        <strong>{{ $labels['notes'] }}:</strong> <span class="cell-muted">—</span>
                    @endif
                    @if(filled($shipment->route_text))
                        <br><br><strong>{{ $labels['route'] }}:</strong> {{ $shipment->route_text }}
                    @endif
                </div>
            </div>

            <div class="footer">
                @if(!empty($footerHtml))
                    {!! $footerHtml !!}
                @else
                    <p class="footer-h">Contact</p>
                    <table cellpadding="0" cellspacing="0">
                        <tr>
                            <td><strong>Phone</strong> 01200744888</td>
                            <td><strong>Email</strong> mabdrabboh@amazonmarine.ltd</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Address</strong> Villa 129, 2nd District New Cairo, Egypt</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Web</strong> www.amazonmarine.ltd</td>
                        </tr>
                    </table>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
