@php
    $pdfLang = $pdfLang ?? 'en';
    $pdfDir = $pdfDir ?? 'ltr';
@endphp
<!DOCTYPE html>
<html lang="{{ $pdfLang }}" dir="{{ $pdfDir }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['title'] }} #{{ $shipment->id }}</title>
    @include('pdf.theme-styles')
    @include('pdf.styles-marine-doc')
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
                                <td class="header-brand-cell">
                                    <span class="brand-line">AMAZON MARINE</span><span class="brand-sep">|</span><span class="brand-tag"> {{ $labels['brand_tag'] }}</span>
                                </td>
                                <td class="header-doc-title-cell">
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
                                <td dir="auto">
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
                <div class="sec-h">{{ $labels['sec_shipment'] }}</div>
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
                <div class="sec-h">{{ $labels['sec_booking'] }}</div>
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
                <div class="sec-h">{{ $labels['sec_shipping'] }}</div>
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
                <table class="grid">
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
                <div class="sec-h">{{ $labels['sec_ports'] }}</div>
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
                <div class="sec-h">{{ $labels['sec_goods'] }}</div>
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
                    <p class="footer-h">{{ $labels['footer_contact'] }}</p>
                    <p><strong>{{ $labels['footer_phone'] }}:</strong> 01200744888</p>
                    <p><strong>{{ $labels['footer_email'] }}:</strong> mabdrabboh@amazonmarine.ltd</p>
                    <p><strong>{{ $labels['footer_address'] }}:</strong> Villa 129, 2nd District New Cairo, Egypt</p>
                    <p><strong>{{ $labels['footer_website'] }}:</strong> www.amazonmarine.ltd</p>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
