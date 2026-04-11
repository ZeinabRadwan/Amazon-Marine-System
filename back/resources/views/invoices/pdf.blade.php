@extends('pdf.layouts.master')

@section('pdf_title')
{{ $labels['doc_title'] }} {{ $invoice->invoice_number }}
@endsection

@section('content')
    <div class="pdf-wrapper">
        <table class="pdf-invoice-top">
            <tr>
                <td class="pdf-invoice-brand">
                    @if(!empty($headerHtml))
                        {!! $headerHtml !!}
                    @else
                        <div class="pdf-brand-placeholder">{{ $labels['company_name'] }}</div>
                        <div class="pdf-brand-sub">{{ $labels['company_tagline'] }}</div>
                    @endif
                </td>
                <td class="pdf-invoice-meta">
                    <div class="pdf-invoice-title">{{ $labels['invoice_title'] }}</div>
                    <div><span class="pdf-label-strong">{{ $labels['invoice_no'] }}</span> {{ $invoice->invoice_number }}</div>
                    <div><span class="pdf-label-strong">{{ $labels['date'] }}</span> {{ $invoice->issue_date?->toDateString() }}</div>
                    @if($invoice->due_date)
                        <div><span class="pdf-label-strong">{{ $labels['due_date'] }}</span> {{ $invoice->due_date?->toDateString() }}</div>
                    @endif
                    @if($invoice->shipment)
                        <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['shipment_bl'] }}</span> {{ $invoice->shipment->bl_number }}</div>
                    @endif
                </td>
            </tr>
        </table>

        <table class="pdf-party-grid">
            <tr>
                <td class="pdf-party-card">
                    <div class="pdf-party-card__label">{{ $labels['billed_to'] }}</div>
                    <div class="pdf-party-card__name">{{ $invoice->client?->name ?? '—' }}</div>
                    @if($invoice->client?->address)
                        <div>{{ $invoice->client->address }}</div>
                    @endif
                    @if($invoice->client?->phone)
                        <div>{{ $invoice->client->phone }}</div>
                    @endif
                </td>
                <td class="pdf-party-grid__gap"></td>
                <td class="pdf-party-card pdf-party-card--placeholder">&nbsp;</td>
            </tr>
        </table>

        <table class="pdf-table pdf-table--standalone pdf-table--invoice-items">
            <thead>
                <tr>
                    <th class="pdf-w-60">{{ $labels['description'] }}</th>
                    <th class="pdf-w-13 pdf-text-end">{{ $labels['qty'] }}</th>
                    <th class="pdf-w-13 pdf-text-end">{{ $labels['unit_price'] }}</th>
                    <th class="pdf-w-14 pdf-text-end">{{ $labels['line_total'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                    <tr>
                        <td>
                            {{ $item->description }}
                            @if($item->item && $item->item->name !== $item->description)
                                <br><span class="pdf-text-muted">({{ $item->item->name }})</span>
                            @endif
                        </td>
                        <td class="pdf-text-end">{{ $item->quantity }}</td>
                        <td class="pdf-text-end">{{ number_format($item->unit_price, 2) }}</td>
                        <td class="pdf-text-end">{{ number_format($item->line_total, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <table class="pdf-invoice-top">
            <tr>
                <td class="pdf-w-spacer"></td>
                <td class="pdf-w-totals">
                    <table class="pdf-summary-table">
                        <tr>
                            <td>{{ $labels['subtotal'] }}</td>
                            <td class="pdf-text-end">{{ number_format($invoice->total_amount, 2) }} {{ $invoice->currency_code }}</td>
                        </tr>
                        @if($invoice->is_vat_invoice)
                            <tr>
                                <td>{{ $labels['vat'] }}</td>
                                <td class="pdf-text-end">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                        @endif
                    </table>
                    <div class="pdf-total-box">
                        <span class="pdf-total-box__label">{{ $labels['grand_total'] }}</span>
                        <span class="pdf-total-box__amount">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</span>
                    </div>
                </td>
            </tr>
        </table>

        @if($invoice->notes)
            <div class="pdf-notes-block">
                <div class="pdf-notes-block__title">{{ $labels['notes'] }}</div>
                <div>{{ $invoice->notes }}</div>
            </div>
        @endif

        <div class="pdf-footer pdf-footer--fixed">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                {{ $labels['generated'] }} {{ now()->toDateTimeString() }} | {{ $labels['system_credit'] }}
            @endif
        </div>
    </div>
@endsection

@push('pdf_footer_fullbleed')
    @if($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
        <table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-footer-fullbleed__cell">
                    <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
                </td>
            </tr>
        </table>
    @endif
@endpush
