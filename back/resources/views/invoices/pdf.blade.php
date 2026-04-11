@extends('pdf.layouts.master')

@section('pdf_content')
    @php
        $L = $labels ?? trans('pdf.invoice', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');
    @endphp
    <div class="pdf-invoice-shell">
        <table class="pdf-invoice-header-table">
            <tr>
                <td class="pdf-invoice-company">
                    @if(!empty($headerHtml))
                        {!! $headerHtml !!}
                    @else
                        <div class="pdf-invoice-company-name">{{ $c['brand'] }}</div>
                        <div>{{ $c['company_line'] }}</div>
                    @endif
                </td>
                <td class="pdf-invoice-meta">
                    <div class="pdf-invoice-doc-title">{{ $L['document_title'] }}</div>
                    <div><span class="pdf-meta-label">{{ $L['no'] }}</span><br><span class="pdf-capsule pdf-capsule--accent">{{ $invoice->invoice_number }}</span></div>
                    <div><span class="pdf-meta-label">{{ $L['date'] }}</span><br><span class="pdf-meta-val">{{ $invoice->issue_date?->toDateString() }}</span></div>
                    @if($invoice->due_date)
                        <div><span class="pdf-meta-label">{{ $L['due_date'] }}</span><br><span class="pdf-meta-val">{{ $invoice->due_date?->toDateString() }}</span></div>
                    @endif
                    @if($invoice->shipment)
                        <div><span class="pdf-meta-label">{{ $L['shipment_bl'] }}</span><br><span class="pdf-meta-val">{{ $invoice->shipment->bl_number }}</span></div>
                    @endif
                </td>
            </tr>
        </table>

        <table class="pdf-party-table">
            <tr>
                <td class="pdf-party-box" colspan="3">
                    <div class="pdf-party-label">{{ $L['billed_to'] }}</div>
                    <div class="pdf-party-name">{{ $invoice->client?->name ?? '—' }}</div>
                    @if($invoice->client?->address)
                        <div>{{ $invoice->client->address }}</div>
                    @endif
                    @if($invoice->client?->phone)
                        <div>{{ $invoice->client->phone }}</div>
                    @endif
                </td>
            </tr>
        </table>

        <table class="pdf-table pdf-table--zebra">
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

        <table class="pdf-totals-wrap">
            <tr>
                <td class="pdf-col-60"></td>
                <td class="pdf-col-40">
                    <table class="pdf-totals-inner">
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
                    <table class="pdf-total-box">
                        <tr>
                            <td>{{ $L['total'] }}</td>
                            <td class="pdf-text-end">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        @if($invoice->notes)
            <div class="pdf-notes-section">
                <div class="pdf-notes-section__title">{{ $L['notes'] }}</div>
                <div>{{ $invoice->notes }}</div>
            </div>
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
