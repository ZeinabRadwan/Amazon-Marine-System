@php
    $pdfLang = $pdfLang ?? 'en';
    $pdfDir = $pdfDir ?? 'ltr';
@endphp
<!DOCTYPE html>
<html lang="{{ $pdfLang }}" dir="{{ $pdfDir }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['invoice_title'] }} {{ $invoice->invoice_number }}</title>
    @include('pdf.theme-styles')
    @include('pdf.styles-invoice')
</head>
<body class="pdf-invoice">
    <div class="inv-shell">
        <table class="inv-deco-table" cellspacing="0" cellpadding="0">
            <tr>
                <td class="inv-deco-tl">
                    <svg width="200" height="64" viewBox="0 0 200 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path fill="#ff8c00" fill-opacity="0.18" d="M0,48 C40,8 100,-4 200,24 L200,0 L0,0 Z"/>
                        <path fill="#ff8c00" fill-opacity="0.1" d="M0,64 C55,20 130,10 200,40 L200,0 L0,0 Z"/>
                    </svg>
                </td>
                <td class="inv-deco-br">
                    <svg width="200" height="56" viewBox="0 0 200 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path fill="#ff8c00" fill-opacity="0.15" d="M0,0 C70,30 140,50 200,12 L200,56 L0,56 Z"/>
                    </svg>
                </td>
            </tr>
        </table>

        <table class="inv-header" cellspacing="0" cellpadding="0">
            <tr>
                <td class="inv-header-brand">
                    @if(!empty($headerHtml))
                        {!! $headerHtml !!}
                    @else
                        <div class="inv-logo-row">
                            <span class="inv-logo-circle">AM</span>
                            <span class="inv-co-block">
                                <div class="inv-co-name">AMAZON MARINE</div>
                                <div class="inv-co-tag">{{ $labels['tagline'] }}</div>
                            </span>
                        </div>
                        <div class="inv-contact-strip">
                            <span class="inv-ci"><span class="inv-ci-dot">●</span> {{ $labels['contact_title'] }}: 01200744888</span>
                            <span class="inv-ci"><span class="inv-ci-dot">●</span> mabdrabboh@amazonmarine.ltd</span>
                            <span class="inv-ci"><span class="inv-ci-dot">●</span> Villa 129, 2nd District New Cairo, Egypt</span>
                            <span class="inv-ci"><span class="inv-ci-dot">●</span> www.amazonmarine.ltd</span>
                        </div>
                    @endif
                </td>
                <td class="inv-header-invoice">
                    <div class="inv-title-main">{{ $labels['invoice_title'] }}</div>
                    <div class="inv-meta-line"><strong>{{ $labels['invoice_no'] }}:</strong> {{ $invoice->invoice_number }}</div>
                    <div class="inv-meta-line"><strong>{{ $labels['date'] }}:</strong> {{ $invoice->issue_date?->toDateString() }}</div>
                    @if($invoice->due_date)
                        <div class="inv-meta-line"><strong>{{ $labels['due_date'] }}:</strong> {{ $invoice->due_date?->toDateString() }}</div>
                    @endif
                    @if($invoice->shipment?->bl_number)
                        <div class="inv-meta-line"><strong>{{ $labels['shipment_bl'] }}:</strong> {{ $invoice->shipment->bl_number }}</div>
                    @endif
                </td>
            </tr>
        </table>

        <table class="inv-bill-panel" cellspacing="0" cellpadding="0">
            <tr>
                <td>
                    <div class="inv-bill-label">{{ $labels['billed_to'] }}</div>
                    <div class="inv-bill-name">{{ $invoice->client?->name ?? '—' }}</div>
                    @if($invoice->client?->address || $invoice->client?->phone)
                        <div class="inv-bill-sub">
                            @if($invoice->client?->address)
                                <div>{{ $invoice->client->address }}</div>
                            @endif
                            @if($invoice->client?->phone)
                                <div style="margin-top:4px;">{{ $invoice->client->phone }}</div>
                            @endif
                        </div>
                    @endif
                </td>
            </tr>
        </table>

        <table class="inv-items" cellspacing="0" cellpadding="0">
            <thead>
                <tr>
                    <th style="width: 52%;">{{ $labels['description'] }}</th>
                    <th style="width: 16%;" class="inv-num">{{ $labels['unit_price'] }}</th>
                    <th style="width: 14%;" class="inv-num">{{ $labels['qty'] }}</th>
                    <th style="width: 18%;" class="inv-num">{{ $labels['total'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                    <tr class="{{ $loop->even ? 'inv-row-alt' : '' }}">
                        <td>
                            {{ $item->description }}
                            @if($item->item && $item->item->name !== $item->description)
                                <div class="inv-item-sub">{{ $item->item->name }}</div>
                            @endif
                        </td>
                        <td class="inv-num">{{ number_format($item->unit_price, 2) }}</td>
                        <td class="inv-num">{{ $item->quantity }}</td>
                        <td class="inv-num">{{ number_format($item->line_total, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <table class="inv-mid" cellspacing="0" cellpadding="0">
            <tr>
                <td class="inv-mid-left">
                    <div class="inv-side-card">
                        <h4>{{ $labels['payment_info'] }}</h4>
                        <p>{{ $labels['payment_hint'] }}</p>
                        <h4>{{ $labels['terms_title'] }}</h4>
                        <p>{{ $labels['terms_body'] }}</p>
                    </div>
                </td>
                <td class="inv-mid-right">
                    <div class="inv-totals-wrap">
                        <table class="inv-totals-mini" cellspacing="0" cellpadding="0">
                            <tr>
                                <td>{{ $labels['subtotal'] }}</td>
                                <td class="inv-num">{{ number_format($invoice->total_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                            @if($invoice->is_vat_invoice)
                                <tr>
                                    <td>{{ $labels['vat'] }}</td>
                                    <td class="inv-num">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</td>
                                </tr>
                            @endif
                        </table>
                        <div class="inv-grand-box">
                            <div class="inv-grand-label">{{ $labels['grand_total'] }}</div>
                            <div class="inv-grand-amt">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</div>
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        @if($invoice->notes)
            <div class="inv-notes">
                <div class="inv-notes-title">{{ $labels['notes'] }}</div>
                <div>{{ $invoice->notes }}</div>
            </div>
        @endif

        <table class="inv-bottom" cellspacing="0" cellpadding="0">
            <tr>
                <td></td>
                <td class="inv-sig-block">
                    <div class="inv-sig-line"></div>
                    <div class="inv-sig-label">{{ $labels['signature'] }}</div>
                </td>
            </tr>
        </table>

        <div class="inv-footer-meta">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                {{ $labels['footer_generated'] }} {{ now()->toDateTimeString() }} · {{ $labels['footer_system'] }}
            @endif
        </div>
    </div>
</body>
</html>
