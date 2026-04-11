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

        $metaCells = [
            ['label' => $L['id'], 'value' => '#'.$shipment->id, 'highlight' => true],
            ['label' => $L['generated'], 'value' => $genAt, 'highlight' => false],
            ['label' => $L['client'], 'value' => $shipment->client?->company_name ?? $shipment->client?->name ?? '—', 'highlight' => false],
            ['label' => $L['status'], 'value' => $shipment->status ?? '—', 'highlight' => true],
        ];
    @endphp

    @if(!empty($headerHtml))
        <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
    @else
        @include('pdf.partials.document-header-marine', [
            'logoSrc' => $logoSrc,
            'mhPlaceholder' => $c['mh_placeholder'] ?? 'MH',
            'brand' => $c['brand'],
            'tagline' => $c['tagline'],
            'documentTitle' => $L['title'],
            'documentSubtitle' => $L['doc_subtitle'],
            'metaCells' => $metaCells,
        ])
    @endif

    @include('pdf.components.section-open', ['title' => $L['sec_shipment']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
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
    @include('pdf.components.section-close')

    @include('pdf.components.section-open', ['title' => $L['sec_booking']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
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
    @include('pdf.components.section-close')

    @include('pdf.components.section-open', ['title' => $L['sec_shipping']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
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
        <table class="pdf-grid pdf-grid--flush-top" cellpadding="0" cellspacing="0" border="0">
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
    @include('pdf.components.section-close')

    @include('pdf.components.section-open', ['title' => $L['sec_ports']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
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
    @include('pdf.components.section-close')

    @include('pdf.components.section-open', ['title' => $L['sec_goods']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-22">{{ $L['id'] }}</th>
                <th class="pdf-col-68">{{ $L['cargo'] }}</th>
            </tr>
            <tr>
                <td><span class="pdf-highlight-box">#{{ $shipment->id }}</span></td>
                <td class="pdf-block-text">{!! $shipment->cargo_description ? nl2br(e($shipment->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes-block">
            @if(filled($notesColumn))
                <span class="pdf-label-inline">{{ $L['notes'] }}</span><br>
                <span class="pdf-block-text">{!! nl2br(e($notesColumn)) !!}</span>
            @else
                <span class="pdf-label-inline">{{ $L['notes'] }}</span> <span class="pdf-muted">—</span>
            @endif
            @if(filled($shipment->route_text))
                <br><br><span class="pdf-label-inline">{{ $L['route'] }}</span><br>
                <span class="pdf-block-text">{{ $shipment->route_text }}</span>
            @endif
        </div>
    @include('pdf.components.section-close')
@endsection

@section('pdf_footer')
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
        @include('pdf.partials.standard_footer', ['lang' => $lang ?? 'en'])
    @endif
@endsection
