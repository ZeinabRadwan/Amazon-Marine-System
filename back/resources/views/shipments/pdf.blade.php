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
            color: #11354d;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
            line-height: 1.45;
            background: #ffffff;
        }
        .wrap { padding: 0; }
        table.header-shell {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 16px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
        }
        table.header-strip {
            width: 100%;
            border-collapse: collapse;
        }
        table.header-strip td {
            height: 5px;
            line-height: 5px;
            font-size: 1px;
            padding: 0;
            border: none;
        }
        .header-strip-navy { width: 68%; background: #11354d; }
        .header-strip-accent { width: 32%; background: #ec7f00; }
        table.header-band {
            width: 100%;
            border-collapse: collapse;
            background: transparent;
            margin: 0;
        }
        table.header-band > tbody > tr > td {
            border: none;
            vertical-align: top;
            padding: 0;
        }
        .header-row1 td {
            border: none;
            vertical-align: middle;
            padding: 14px 16px 12px;
        }
        td.header-brand-cell {
            width: 52%;
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
        }
        td.header-doc-cell {
            width: 48%;
            background: #ffffff;
        }
        .header-logo img {
            height: 48px;
            width: auto;
            max-width: 88px;
            display: block;
            padding: 6px 8px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
        }
        .brand-stack {
            line-height: 1.25;
        }
        .brand-line {
            display: block;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.16em;
            color: #ec7f00;
            text-transform: uppercase;
            margin: 0 0 4px;
            padding: 0;
            width: auto;
            max-width: 100%;
        }
        .brand-tag {
            display: block;
            margin: 6px 0 0;
            font-size: 8.5px;
            font-weight: 600;
            letter-spacing: 0.14em;
            color: #11354d;
            text-transform: uppercase;
            opacity: 0.78;
            line-height: 1.45;
        }
        .doc-title {
            font-size: 15px;
            font-weight: 800;
            color: #11354d;
            letter-spacing: 0.04em;
            text-align: right;
            text-transform: uppercase;
            line-height: 1.2;
            border-bottom: 3px solid #ec7f00;
            padding-bottom: 8px;
            display: block;
            width: 100%;
            box-sizing: border-box;
        }
        .doc-title-sub {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-align: right;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-top: 6px;
        }
        td.header-row2 {
            border: none;
            padding: 0 16px 14px !important;
            vertical-align: top;
        }
        table.meta-panel {
            width: 100%;
            border-collapse: collapse;
            background: #ffffff;
            border: 1px solid #e2e8f0;
        }
        table.meta-panel td {
            border: none;
            padding: 8px 12px;
            vertical-align: top;
            width: 50%;
            font-size: 10px;
            color: #11354d;
            border-bottom: 1px solid #e2e8f0;
        }
        table.meta-panel tr:last-child td {
            border-bottom: none;
        }
        table.meta-panel tr:nth-child(odd) td {
            background: #f8fafc;
        }
        table.meta-panel td + td {
            border-left: 1px solid #e2e8f0;
        }
        .meta-icon {
            display: inline-block;
            min-width: 16px;
            height: 16px;
            line-height: 16px;
            text-align: center;
            background: #fff7ed;
            border: 1px solid #fdba74;
            color: #c2410c;
            font-size: 8px;
            font-weight: 800;
            margin-right: 8px;
            vertical-align: middle;
        }
        .meta-item strong {
            color: #475569;
            font-weight: 700;
            font-size: 7.5px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .meta-val {
            color: #11354d;
            font-weight: 700;
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
            background: #ec7f00;
            margin: 0 0 0;
            padding: 6px 10px;
            border-left: 4px solid #11354d;
        }
        table.grid {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        table.grid th,
        table.grid td {
            border: 1px solid #11354d;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.grid th {
            background: #ffffff;
            font-size: 9px;
            font-weight: 700;
            color: #11354d;
            text-align: left;
        }
        table.grid td {
            font-size: 10px;
            color: #11354d;
            background: #eef1f6;
        }
        .lbl {
            color: #11354d;
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
            border: 1px solid #11354d;
            border-top: none;
            background: #eef1f6;
            padding: 8px 10px;
            margin-top: 0;
            font-size: 10px;
            line-height: 1.5;
            color: #11354d;
        }
        .footer {
            margin-top: 12px;
            border-top: 3px solid #ec7f00;
            font-size: 9px;
            color: #11354d;
        }
        .footer-h {
            font-weight: 700;
            color: #11354d;
            margin: 0 0 8px;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .footer p { margin: 2px 0; }
        .footer strong { color: #11354d; }
        table.footer-contact-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: 4px 0;
            table-layout: fixed;
            margin: 0;
        }
        table.footer-contact-grid > tbody > tr > td {
            width: 25%;
            vertical-align: top;
            text-align: center;
            padding: 4px 2px 0;
            border: none;
        }
        table.footer-cc-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 6px;
            border-collapse: collapse;
        }
        table.footer-cc-icon > tbody > tr > td {
            width: 56px;
            height: 56px;
            padding: 0;
            text-align: center;
            vertical-align: middle;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 28px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .footer-cc-text {
            font-size: 8.5px;
            font-weight: 600;
            color: #11354d;
            line-height: 1.35;
            word-wrap: break-word;
        }
        .shipment-pdf-footer-banner {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            padding: 0;
        }
        .shipment-pdf-footer-banner__cell {
            padding: 0;
            margin: 0;
            border: none;
            vertical-align: top;
            width: 100%;
            line-height: 0;
        }
        .shipment-pdf-footer-banner__img {
            width: 100%;
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0;
            padding: 0;
            border: none;
        }
        .shipment-pdf-page-header {
            position: relative;
            z-index: 1;
            width: 100%;
            margin: 0 0 16px;
            padding: 0;
            line-height: 0;
            overflow: hidden;
            font-size: 0;
        }
        .shipment-pdf-page-header__img {
            width: 100%;
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0;
            padding: 0;
            border: none;
        }
    </style>
</head>
<body>
    @php
        $pdfHeaderBanner = \App\Support\PdfLogo::headerImgSrc();
        $logoSrc = \App\Support\PdfLogo::imgSrc();
        $sdNo = $shipment->sdForm?->sd_number ?? ($shipment->sd_form_id ? 'SD-'.$shipment->sd_form_id : '—');
        $genAt = now()->format('d/m/Y H:i');
        $bookingD = optional($shipment->booking_date)->format('d/m/Y') ?? '—';
        $loadingD = optional($shipment->loading_date)->format('d/m/Y') ?? '—';
    @endphp

    <div class="wrap">
        @if($pdfHeaderBanner)
            <div class="shipment-pdf-page-header">
                <img class="shipment-pdf-page-header__img" src="{{ $pdfHeaderBanner }}" alt="">
            </div>
        @endif
        @if(!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <table class="header-shell" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td style="padding:0;border:none;">
                        <table class="header-strip" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="header-strip-navy">&nbsp;</td>
                                <td class="header-strip-accent">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0;border:none;">
                        <table class="header-band" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr class="header-row1">
                                <td class="header-brand-cell">
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                        <tr>
                                            <td class="header-logo" style="width:90px;border:none;vertical-align:middle;">
                                                @if($logoSrc)
                                                    <img src="{{ $logoSrc }}" alt="">
                                                @else
                                                    <div style="width:72px;height:44px;background:#fff7ed;border:1px solid #fdba74;text-align:center;line-height:42px;font-size:8px;font-weight:700;color:#c2410c;">LOGO</div>
                                                @endif
                                            </td>
                                            <td style="border:none;vertical-align:middle;padding-left:10px;padding-right:12px;">
                                                <div class="brand-stack">
                                                    <span class="brand-line">AMAZON MARINE</span>
                                                    <span class="brand-tag">Shipping and Logistics Solutions</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td class="header-doc-cell" style="text-align:right;vertical-align:top;padding-top:14px;padding-right:16px;">
                                    <div class="doc-title">{{ $labels['title'] }}</div>
                                    <div class="doc-title-sub">{{ $labels['doc_subtitle'] }}</div>
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
        </div>

        <div class="footer">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                <p class="footer-h">Contact Information</p>
                <table class="footer-contact-grid" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td>
                            <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74 0-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.2c.27-.27.35-.66.24-1.02A17.32 17.32 0 0 1 4.5 3 2 2 0 0 0 2.5 5v3a19.79 19.79 0 0 0 3.07 8.63 19.51 19.51 0 0 0 6 6 19.79 19.79 0 0 0 8.63 3.07 2 2 0 0 0 2-2v-1.5c0-1.1-.9-2-2-2z"/></svg>
                                    </td>
                                </tr>
                            </table>
                            <div class="footer-cc-text">01200744888</div>
                        </td>
                        <td>
                            <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 7.55L4.06 6h15.88L12 11.55zM20 18V8.44l-8 5.06-8-5.06V18h16z"/></svg>
                                    </td>
                                </tr>
                            </table>
                            <div class="footer-cc-text">mabdrabboh@amazonmarine.ltd</div>
                        </td>
                        <td>
                            <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                    </td>
                                </tr>
                            </table>
                            <div class="footer-cc-text">Villa 129, 2nd District New Cairo, Egypt</div>
                        </td>
                        <td>
                            <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M3.9 12A3.1 3.1 0 017 8.9h3V7H7a5 5 0 100 10h3v-1.9H7A3.1 3.1 0 013.9 12zM8 11h8v2H8v-2zm9-5h-3v1.9h3a3.1 3.1 0 010 6.2h-3V17h3a5 5 0 000-10z"/></svg>
                                    </td>
                                </tr>
                            </table>
                            <div class="footer-cc-text">www.amazonmarine.ltd</div>
                        </td>
                    </tr>
                </table>
            @endif
        </div>
        @if($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
            <table class="shipment-pdf-footer-banner" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                <tr>
                    <td class="shipment-pdf-footer-banner__cell">
                        <img class="shipment-pdf-footer-banner__img" src="{{ $pdfFooterBanner }}" alt="">
                    </td>
                </tr>
            </table>
        @endif
    </div>
</body>
</html>
