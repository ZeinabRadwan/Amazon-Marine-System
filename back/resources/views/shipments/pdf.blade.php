@extends('pdf.layouts.master')

@section('pdf_content')
    @php
        $L = $labels ?? trans('pdf.shipment', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');

        $logoPath = base_path('../front/src/assets/logo_darkmode.png');
        $logoSrc = file_exists($logoPath) ? 'file://'.str_replace('\\', '/', $logoPath) : null;
        $sdNo = $shipment->sdForm?->sd_number ?? ($shipment->sd_form_id ? 'SD-'.$shipment->sd_form_id : '—');
        $genAt = now()->format('d/m/Y H:i');
        $bookingD = optional($shipment->booking_date)->format('d/m/Y') ?? '—';
        $loadingD = optional($shipment->loading_date)->format('d/m/Y') ?? '—';
    @endphp

    @if(!empty($headerHtml))
        <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
    @else
        <table class="pdf-header" cellpadding="0" cellspacing="0">
            <tr>
                <td colspan="3">
                    <table class="pdf-header-inner" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="pdf-header__logo-cell">
                                @if($logoSrc)
                                    <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                                @else
                                    <div class="pdf-header__logo-fallback">{{ $c['mh_placeholder'] }}</div>
                                @endif
                            </td>
                            <td>
                                <span class="pdf-header__brand-line">{{ $c['brand'] }}</span><span class="pdf-header__brand-sep">|</span><span class="pdf-header__brand-tag"> {{ $c['tagline'] }}</span>
                            </td>
                            <td class="pdf-header__title-wrap">
                                <div class="pdf-header__title">{{ $L['title'] }}</div>
                                <div class="pdf-header__subtitle">{{ $L['doc_subtitle'] }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td colspan="3">
                    <table class="pdf-meta-panel" cellpadding="0" cellspacing="0">
                        <tr>
                            <td>
                                <span class="pdf-meta-icon">#</span>
                                <span><span class="pdf-meta-strong">{{ $L['id'] }}:</span> <span class="pdf-meta-val">#{{ $shipment->id }}</span></span>
                            </td>
                            <td>
                                <span class="pdf-meta-icon">D</span>
                                <span><span class="pdf-meta-strong">{{ $L['generated'] }}:</span> <span class="pdf-meta-val">{{ $genAt }}</span></span>
                            </td>
                        </tr>
                        <tr>
                            <td dir="auto">
                                <span class="pdf-meta-icon">C</span>
                                <span><span class="pdf-meta-strong">{{ $L['client'] }}:</span> <span class="pdf-meta-val">{{ $shipment->client?->company_name ?? $shipment->client?->name ?? '—' }}</span></span>
                            </td>
                            <td>
                                <span class="pdf-meta-icon">S</span>
                                <span><span class="pdf-meta-strong">{{ $L['status'] }}:</span> <span class="pdf-meta-val">{{ $shipment->status ?? '—' }}</span></span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    @endif

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_shipment'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-33">{{ $L['sales_rep'] }}</th>
                <th class="pdf-col-33">{{ $L['sd_form'] }}</th>
                <th class="pdf-col-33">{{ $L['status'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->salesRep?->name ?? '—' }}</td>
                <td>{{ $sdNo }}</td>
                <td>{{ $shipment->status ?? '—' }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_booking'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-33">{{ $L['booking_date'] }}</th>
                <th class="pdf-col-33">{{ $L['booking_number'] }}</th>
                <th class="pdf-col-33">{{ $L['bl_number'] }}</th>
            </tr>
            <tr>
                <td>{{ $bookingD }}</td>
                <td>{{ $shipment->booking_number ?? '—' }}</td>
                <td>{{ $shipment->bl_number ?? '—' }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_shipping'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-20">{{ $L['mode'] }}</th>
                <th class="pdf-col-20">{{ $L['shipment_type'] }}</th>
                <th class="pdf-col-20">{{ $L['direction'] }}</th>
                <th class="pdf-col-20">{{ $L['shipping_line'] }}</th>
                <th class="pdf-col-20">{{ $L['line_vendor'] }}</th>
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
                    <th>{{ $L['acid'] }}</th>
                    <td colspan="4">{{ $shipment->acid_number ?? '—' }}</td>
                </tr>
            @endif
        </table>
        <table class="pdf-grid pdf-grid--flush-top">
            <tr>
                <th class="pdf-col-25">{{ $L['container_type'] }}</th>
                <th class="pdf-col-25">{{ $L['container_size'] }}</th>
                <th class="pdf-col-25">{{ $L['container_count'] }}</th>
                <th class="pdf-col-25">{{ $L['loading_place'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->container_type ?? '—' }}</td>
                <td>{{ $shipment->container_size ?? '—' }}</td>
                <td>{{ $shipment->container_count ?? '—' }}</td>
                <td>{{ $shipment->loading_place ?? '—' }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_ports'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-33">{{ $L['pol'] }}</th>
                <th class="pdf-col-33">{{ $L['pod'] }}</th>
                <th class="pdf-col-33">{{ $L['loading_date'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->originPort?->name ?? '—' }}</td>
                <td>{{ $shipment->destinationPort?->name ?? '—' }}</td>
                <td>{{ $loadingD }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_goods'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-22">{{ $L['id'] }}</th>
                <th class="pdf-col-68">{{ $L['cargo'] }}</th>
            </tr>
            <tr>
                <td class="pdf-label-strong">#{{ $shipment->id }}</td>
                <td class="pdf-block-text">{!! $shipment->cargo_description ? nl2br(e($shipment->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes-block">
            @if(filled($notesColumn))
                <span class="pdf-label-strong">{{ $L['notes'] }}:</span><br>
                <span class="pdf-block-text">{!! nl2br(e($notesColumn)) !!}</span>
            @else
                <span class="pdf-label-strong">{{ $L['notes'] }}:</span> <span class="pdf-muted">—</span>
            @endif
            @if(filled($shipment->route_text))
                <br><br><span class="pdf-label-strong">{{ $L['route'] }}:</span> {{ $shipment->route_text }}
            @endif
        </div>
    </div>
@endsection

@section('pdf_footer')
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
        @include('pdf.partials.standard_footer', ['lang' => $lang ?? 'en'])
    @endif
@endsection
