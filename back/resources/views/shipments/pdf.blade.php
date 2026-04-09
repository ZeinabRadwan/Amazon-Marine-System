<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['title'] }} #{{ $shipment->id }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            color: #0f172a;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
            line-height: 1.45;
            background: #ffffff;
        }
        .wrap { padding: 0; }
        table.header-band {
            width: 100%;
            border-collapse: collapse;
            background: #1f2a60;
            margin: 0 0 14px;
        }
        table.header-band > tbody > tr > td {
            border: none;
            vertical-align: top;
            padding: 0;
        }
        .header-row1 td {
            border: none;
            vertical-align: middle;
            padding: 14px 16px 10px;
        }
        .header-logo img {
            height: 48px;
            width: auto;
            max-width: 88px;
            display: block;
        }
        .brand-line {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #ffffff;
            line-height: 1.35;
        }
        .brand-sep {
            color: #f97316;
            font-weight: 400;
            padding: 0 0.35em;
        }
        .brand-tag {
            font-size: 10px;
            font-weight: 400;
            letter-spacing: 0.02em;
            color: #ffffff;
        }
        .doc-title {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.03em;
            text-align: right;
            line-height: 1.3;
        }
        td.header-row2 {
            border: none;
            padding: 0 16px 14px !important;
            vertical-align: top;
        }
        table.meta-panel {
            width: 100%;
            border-collapse: collapse;
            background: #243056;
            border: 1px solid #f97316;
        }
        table.meta-panel td {
            border: none;
            padding: 8px 12px;
            vertical-align: top;
            width: 50%;
            font-size: 10px;
            color: #ffffff;
        }
        table.meta-panel tr + tr td {
            border-top: 1px solid #364785;
        }
        table.meta-panel td + td {
            border-left: 1px solid #364785;
        }
        .meta-icon {
            display: inline-block;
            min-width: 16px;
            height: 16px;
            line-height: 16px;
            text-align: center;
            background: #f97316;
            color: #ffffff;
            font-size: 8px;
            font-weight: 700;
            margin-right: 8px;
            vertical-align: middle;
        }
        .meta-item strong {
            color: #ffffff;
            font-weight: 600;
        }
        .meta-val {
            color: #f1f5f9;
        }
        .body-pad {
            padding: 0 14px 16px;
        }
        .sec {
            margin: 0 0 10px;
        }
        .sec-h {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #ffffff;
            background: #f97316;
            margin: 0 0 0;
            padding: 6px 10px;
            border-left: 4px solid #1f2a60;
        }
        table.grid {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        table.grid th,
        table.grid td {
            border: 1px solid #1f2a60;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.grid th {
            background: #ffffff;
            font-size: 9px;
            font-weight: 700;
            color: #1f2a60;
            text-align: left;
        }
        table.grid td {
            font-size: 10px;
            color: #0f172a;
            background: #eef1f6;
        }
        .lbl {
            color: #1f2a60;
            font-weight: 600;
        }
        .cell-muted {
            color: #94a3b8;
        }
        .block-text {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .notes {
            border: 1px solid #1f2a60;
            border-top: none;
            background: #eef1f6;
            padding: 8px 10px;
            margin-top: 0;
            font-size: 10px;
            line-height: 1.5;
            color: #0f172a;
        }
        .footer {
            margin-top: 12px;
            padding: 10px 14px;
            background: #f1f5f9;
            border-top: 3px solid #f97316;
            font-size: 9px;
            color: #475569;
        }
        .footer-h {
            font-weight: 700;
            color: #1f2a60;
            margin: 0 0 5px;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .footer p { margin: 2px 0; }
        .footer strong { color: #0f172a; }
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
            <table class="header-band">
                <tr>
                    <td>
                        <table class="header-row1" style="width:100%;border-collapse:collapse;">
                            <tr>
                                <td class="header-logo" style="width:90px;border:none;vertical-align:middle;">
                                    @if($logoSrc)
                                        <img src="{{ $logoSrc }}" alt="" style="height:48px;width:auto;max-width:88px;display:block;">
                                    @else
                                        <div style="width:72px;height:40px;background:#fff;border:1px solid #f97316;text-align:center;line-height:40px;font-size:8px;color:#1f2a60;">LOGO</div>
                                    @endif
                                </td>
                                <td style="border:none;vertical-align:middle;padding-left:10px;padding-right:12px;">
                                    <span class="brand-line">AMAZON MARINE</span><span class="brand-sep">|</span><span class="brand-tag"> Shipping and Logistics Solutions</span>
                                </td>
                                <td style="width:32%;border:none;vertical-align:middle;text-align:right;">
                                    <div class="doc-title">{{ $labels['title'] }}</div>
                                    <div class="doc-title" style="font-size:10px;font-weight:600;opacity:0.95;margin-top:2px;">{{ $labels['doc_subtitle'] }}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td class="header-row2">
                        <table class="meta-panel">
                            <tr>
                                <td>
                                    <span class="meta-icon">#</span>
                                    <span class="meta-item"><strong>{{ $labels['id'] }}:</strong> <span class="meta-val">#{{ $shipment->id }}</span></span>
                                </td>
                                <td>
                                    <span class="meta-icon">D</span>
                                    <span class="meta-item"><strong>{{ $labels['generated'] }}:</strong> <span class="meta-val">{{ $genAt }}</span></span>
                                </td>
                            </tr>
                            <tr>
                                <td dir="auto" style="text-align:left;">
                                    <span class="meta-icon">C</span>
                                    <span class="meta-item"><strong>{{ $labels['client'] }}:</strong> <span class="meta-val">{{ $shipment->client?->company_name ?? $shipment->client?->name ?? '—' }}</span></span>
                                </td>
                                <td>
                                    <span class="meta-icon">S</span>
                                    <span class="meta-item"><strong>{{ $labels['status'] }}:</strong> <span class="meta-val">{{ $shipment->status ?? '—' }}</span></span>
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
                <table class="grid">
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
                <table class="grid">
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
                <table class="grid">
                    <tr>
                        <th style="width:25%;">{{ $labels['mode'] }}</th>
                        <th style="width:25%;">{{ $labels['shipment_type'] }}</th>
                        <th style="width:25%;">{{ $labels['direction'] }}</th>
                        <th style="width:25%;">{{ $labels['line_vendor'] }}</th>
                    </tr>
                    <tr>
                        <td>{{ $shipment->mode ?? '—' }}</td>
                        <td>{{ $shipment->shipment_type ?? '—' }}</td>
                        <td>{{ $shipment->shipment_direction ?? '—' }}</td>
                        <td>{{ $shipment->lineVendor?->name ?? '—' }}</td>
                    </tr>
                    @if($shipment->shipment_direction === 'Import' || filled($shipment->acid_number))
                    <tr>
                        <th>{{ $labels['acid'] }}</th>
                        <td colspan="3">{{ $shipment->acid_number ?? '—' }}</td>
                    </tr>
                    @endif
                </table>
                <table class="grid" style="margin-top:-1px;">
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
                <table class="grid">
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
                <table class="grid">
                    <tr>
                        <th style="width:22%;">{{ $labels['id'] }}</th>
                        <th>{{ $labels['cargo'] }}</th>
                    </tr>
                    <tr>
                        <td class="lbl">#{{ $shipment->id }}</td>
                        <td class="block-text">{!! $shipment->cargo_description ? nl2br(e($shipment->cargo_description)) : '—' !!}</td>
                    </tr>
                </table>
                <div class="notes">
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
                    <p class="footer-h">Contact Information</p>
                    <p><strong>Phone:</strong> 01200744888</p>
                    <p><strong>Email:</strong> mabdrabboh@amazonmarine.ltd</p>
                    <p><strong>Address:</strong> Villa 129, 2nd District New Cairo, Egypt</p>
                    <p><strong>Website:</strong> www.amazonmarine.ltd</p>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
