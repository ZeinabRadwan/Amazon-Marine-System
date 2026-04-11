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
        /* Same header layout as SD form PDF (pdf/assets/theme + sd_forms/pdf) */
        .pdf-header {
            width: 100%;
            margin-bottom: 14px;
            border-bottom: 3px solid #ec7f00;
            padding-bottom: 10px;
            background: #ffffff;
        }
        .pdf-header__table {
            width: 100%;
            border-collapse: collapse;
        }
        .pdf-header__table td {
            vertical-align: middle;
            border: none;
            padding: 8px 4px;
        }
        .pdf-header__logo {
            width: 96px;
        }
        .pdf-header__logo-img {
            height: 60px;
            width: auto;
            max-width: 88px;
            display: block;
        }
        .pdf-header__logo-fallback {
            width: 72px;
            height: 40px;
            background: #f2f2f2;
            border: 2px solid #ec7f00;
            text-align: center;
            line-height: 36px;
            font-size: 8px;
            font-weight: 700;
            color: #333333;
        }
        .pdf-header__brand-cell {
            vertical-align: middle;
        }
        .pdf-header__brand-stack {
            line-height: 1.25;
        }
        .pdf-header__brand-line {
            display: block;
            font-size: 14px;
            font-family: 'DejaVu Sans', sans-serif;
            font-weight: bold;
            letter-spacing: 0.14em;
            color: #ec7f00;
            text-transform: uppercase;
            margin: 0 0 4px;
            padding: 0;
            max-width: 100%;
        }
        .pdf-header__brand-line strong {
            font-weight: bold;
            color: inherit;
            letter-spacing: inherit;
        }
        .pdf-header__brand-tag {
            display: block;
            margin: 6px 0 0;
            font-size: 8.5px;
            font-weight: 600;
            letter-spacing: 0.12em;
            color: #11354d;
            text-transform: uppercase;
            opacity: 0.78;
            line-height: 1.45;
        }
        .pdf-header__doc {
            width: 34%;
            text-align: end;
        }
        .pdf-header__title {
            font-size: 16px;
            font-weight: 700;
            color: #ec7f00;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.2;
        }
        .pdf-header__meta-list {
            margin: 10px 0 0;
            padding: 0;
            text-align: inherit;
            width: 100%;
        }
        .pdf-header__meta-row {
            display: block;
            font-size: 10px;
            line-height: 1.55;
            margin: 0 0 5px;
            padding: 0 0 5px;
            border-bottom: 1px solid #e2e8f0;
            text-align: inherit;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        .pdf-header__meta-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .pdf-header__meta-label {
            font-weight: 700;
            color: #11354d;
        }
        .pdf-header__meta-val {
            font-weight: 600;
            color: #11354d;
            margin-inline-start: 0.35em;
        }
        .pdf-cell-dir-auto {
            unicode-bidi: plaintext;
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
            margin-top: 14px;
            padding: 0;
            background: transparent;
            border: none;
            font-size: 9px;
            color: #11354d;
        }
        .footer-h {
            font-weight: 700;
            color: #11354d;
            margin: 0 0 6px;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            border-bottom: 2px solid #ec7f00;
            padding-bottom: 4px;
        }
        .footer p { margin: 2px 0; }
        .footer strong { color: #11354d; }
        table.footer-contact-grid {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin: 0;
            border: none;
            background: transparent;
        }
        table.footer-contact-grid > tbody > tr > td.footer-contact-grid__cell {
            width: 25%;
            vertical-align: top;
            text-align: center;
            padding: 4px 3px 0;
            border: none;
            border-left: 1px solid #e2e8f0;
        }
        table.footer-contact-grid > tbody > tr > td.footer-contact-grid__cell--first {
            border-left: none;
        }
        table.footer-cc-col {
            width: 100%;
            border-collapse: collapse;
            margin: 0 auto;
        }
        table.footer-cc-col td {
            border: none;
            padding: 0;
            text-align: center;
            vertical-align: top;
        }
        td.footer-cc-ico-wrap {
            padding-bottom: 6px !important;
        }
        table.footer-cc-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto;
            border-collapse: collapse;
        }
        table.footer-cc-icon > tbody > tr > td {
            width: 52px;
            height: 52px;
            padding: 0;
            text-align: center;
            vertical-align: middle;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 26px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .footer-cc-line {
            font-size: 8px;
            font-weight: 600;
            color: #11354d;
            line-height: 1.4;
            word-wrap: break-word;
            text-align: center;
            padding-top: 2px;
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
            <header class="pdf-header pdf-header--branded">
                <table class="pdf-header__table" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td class="pdf-header__logo">
                            @if($logoSrc)
                                <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                            @else
                                <div class="pdf-header__logo-fallback">MH</div>
                            @endif
                        </td>
                        <td class="pdf-header__brand-cell">
                            <div class="pdf-header__brand-stack">
                                <div class="pdf-header__brand-line"><strong>{{ $labels['brand'] }}</strong></div>
                                <div class="pdf-header__brand-tag">{{ $labels['brand_tag'] }}</div>
                            </div>
                        </td>
                        <td class="pdf-header__doc">
                            <p class="pdf-header__title">{{ $labels['title'] }}</p>
                            <div class="pdf-header__meta-list">
                                <div class="pdf-header__meta-row">
                                    <span class="pdf-header__meta-label">{{ $labels['id'] }}:</span>
                                    <span class="pdf-header__meta-val">#{{ $shipment->id }}</span>
                                </div>
                                <div class="pdf-header__meta-row">
                                    <span class="pdf-header__meta-label">{{ $labels['generated'] }}:</span>
                                    <span class="pdf-header__meta-val">{{ $genAt }}</span>
                                </div>
                                <div class="pdf-header__meta-row">
                                    <span class="pdf-header__meta-label">{{ $labels['client'] }}:</span>
                                    <span class="pdf-header__meta-val pdf-cell-dir-auto">{{ $shipment->client?->company_name ?? $shipment->client?->name ?? '—' }}</span>
                                </div>
                                <div class="pdf-header__meta-row">
                                    <span class="pdf-header__meta-label">{{ $labels['status'] }}:</span>
                                    <span class="pdf-header__meta-val">{{ $shipment->status ?? '—' }}</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </header>
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
                <p class="footer-h">{{ $labels['footer_contact'] }}</p>
                <table class="footer-contact-grid" width="100%" cellspacing="0" cellpadding="0" border="0" dir="ltr" role="presentation">
                    <colgroup>
                        <col width="25%" />
                        <col width="25%" />
                        <col width="25%" />
                        <col width="25%" />
                    </colgroup>
                    <tr>
                        <td class="footer-contact-grid__cell footer-contact-grid__cell--first" width="25%" style="width:25%;">
                            <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td class="footer-cc-ico-wrap">
                                        <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74 0-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.2c.27-.27.35-.66.24-1.02A17.32 17.32 0 0 1 4.5 3 2 2 0 0 0 2.5 5v3a19.79 19.79 0 0 0 3.07 8.63 19.51 19.51 0 0 0 6 6 19.79 19.79 0 0 0 8.63 3.07 2 2 0 0 0 2-2v-1.5c0-1.1-.9-2-2-2z"/></svg>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="footer-cc-line">01200744888</td>
                                </tr>
                            </table>
                        </td>
                        <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                            <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td class="footer-cc-ico-wrap">
                                        <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 7.55L4.06 6h15.88L12 11.55zM20 18V8.44l-8 5.06-8-5.06V18h16z"/></svg>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="footer-cc-line">mabdrabboh@amazonmarine.ltd</td>
                                </tr>
                            </table>
                        </td>
                        <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                            <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td class="footer-cc-ico-wrap">
                                        <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="footer-cc-line">Villa 129, 2nd District New Cairo, Egypt</td>
                                </tr>
                            </table>
                        </td>
                        <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                            <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td class="footer-cc-ico-wrap">
                                        <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M5 4h14v11H5V4zm1 2h12v7H6V6zm3 12h6v2H9v-2z"/></svg>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="footer-cc-line">www.amazonmarine.ltd</td>
                                </tr>
                            </table>
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
