@extends('pdf.layouts.master')

@section('pdf_content')
    @php
        $L = $labels ?? trans('pdf.invoice', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');

        $logoPath = base_path('../front/src/assets/logo_darkmode.png');
        $logoSrc = file_exists($logoPath) ? 'file://'.str_replace('\\', '/', $logoPath) : null;

        $metaCells = [
            ['label' => $L['no'], 'value' => $invoice->invoice_number, 'highlight' => true],
            ['label' => $L['date'], 'value' => $invoice->issue_date?->toDateString() ?? '—', 'highlight' => false],
            ['label' => $L['due_date'], 'value' => $invoice->due_date?->toDateString() ?? '—', 'highlight' => false],
            ['label' => $L['shipment_bl'], 'value' => $invoice->shipment?->bl_number ?? '—', 'highlight' => false],
        ];
    @endphp

    <div class="pdf-invoice-shell">
        @if(!empty($headerHtml))
            <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
        @else
            @include('pdf.partials.document-header-marine', [
                'logoSrc' => $logoSrc,
                'mhPlaceholder' => $c['mh_placeholder'] ?? 'MH',
                'brand' => $c['brand'],
                'tagline' => $c['tagline'],
                'documentTitle' => $L['document_title'],
                'documentSubtitle' => null,
                'metaCells' => $metaCells,
            ])
        @endif

        @include('pdf.components.section-open', ['title' => $L['billed_to']])
            <div class="pdf-party-inner">
                @include('pdf.components.field', [
                    'label' => '',
                    'value' => $invoice->client?->name ?? '—',
                    'highlight' => false,
                ])
                @if($invoice->client?->address)
                    <div class="pdf-field pdf-field--light">
                        <div class="pdf-label">{{ $c['address'] ?? 'Address' }}</div>
                        <div class="pdf-value">{{ $invoice->client->address }}</div>
                    </div>
                @endif
                @if($invoice->client?->phone)
                    <div class="pdf-field pdf-field--light">
                        <div class="pdf-label">{{ $c['phone'] }}</div>
                        <div class="pdf-value">{{ $invoice->client->phone }}</div>
                    </div>
                @endif
            </div>
        @include('pdf.components.section-close')

        @include('pdf.components.section-open', ['title' => $L['lines_section']])
            <table class="pdf-table pdf-table--zebra" cellpadding="0" cellspacing="0" border="0">
                <thead>
                    <tr>
                        <th class="pdf-col-60">{{ $L['col_description'] }}</th>
                        <th class="pdf-text-end">{{ $L['col_qty'] }}</th>
                        <th class="pdf-text-end">{{ $L['col_unit_price'] }}</th>
                        <th class="pdf-text-end">{{ $L['col_total'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($invoice->items as $item)
                        <tr>
                            <td>
                                {{ $item->description }}
                                @if($item->item && $item->item->name !== $item->description)
                                    <div class="pdf-item-desc-sub">({{ $item->item->name }})</div>
                                @endif
                            </td>
                            <td class="pdf-text-end">{{ $item->quantity }}</td>
                            <td class="pdf-text-end">{{ number_format($item->unit_price, 2) }}</td>
                            <td class="pdf-text-end">{{ number_format($item->line_total, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @include('pdf.components.section-close')

        @include('pdf.components.section-open', ['title' => $L['totals_section']])
            <table class="pdf-totals-wrap" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td colspan="2">
                        <table class="pdf-totals-inner" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td>{{ $L['subtotal'] }}</td>
                                <td class="pdf-text-end">{{ number_format($invoice->total_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                            @if($invoice->is_vat_invoice)
                                <tr>
                                    <td>{{ $L['vat'] }}</td>
                                    <td class="pdf-text-end">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</td>
                                </tr>
                            @endif
                        </table>
                        <table class="pdf-total-box pdf-summary-box" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td>{{ $L['total'] }}</td>
                                <td class="pdf-text-end">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        @include('pdf.components.section-close')

        @if($invoice->notes)
            @include('pdf.components.section-open', ['title' => $L['notes']])
                <div class="pdf-party-inner">
                    {{ $invoice->notes }}
                </div>
            @include('pdf.components.section-close')
        @endif
    </div>
@endsection

@section('pdf_footer')
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
        @include('pdf.partials.standard_footer', ['lang' => $lang ?? 'en', 'showGenerated' => true])
    @endif
@endsection
