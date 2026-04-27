@extends('pdf.layouts.master')

@section('pdf_title')
{{ $labels['doc_title'] }} {{ $quote->quote_no }}
@endsection

@push('pdf_head')
<style>
    .quote-pdf-section {
        margin-top: 14px;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 2px solid #11354d;
        font-size: 11px;
        font-weight: 700;
        color: #11354d;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .quote-pdf-header-brand-row img {
        max-height: 42px;
        width: auto;
        display: block;
        margin-bottom: 6px;
    }
    .quote-pdf-meta-compact div {
        margin-bottom: 3px;
    }
    .quote-pdf-route-grid td {
        vertical-align: top;
        padding: 4px 8px 4px 0;
        font-size: 10px;
    }
    .quote-pdf-route-grid .pdf-label-strong {
        display: block;
        margin-bottom: 2px;
        font-size: 9px;
        color: #666666;
        font-weight: 600;
        text-transform: uppercase;
    }
    .quote-pdf-prepared {
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px solid #dddddd;
        font-size: 10px;
    }
    .quote-pdf-terms {
        font-size: 9.5px;
        line-height: 1.45;
        color: #333333;
    }
    .quote-pdf-terms p {
        margin: 0 0 6px 0;
    }
    .quote-pdf-quick-banner {
        margin-top: 10px;
        margin-bottom: 4px;
        padding: 6px 10px;
        background: #fff8e6;
        border: 1px solid #e6a800;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 700;
        color: #7a5a00;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }
</style>
@endpush

@section('content')
@php
    $client = $quote->client;
    $pdfFmtDate = static function ($dt) use ($lang) {
        return $dt
            ? $dt->copy()->timezone(config('app.timezone'))->locale($lang)->isoFormat('L')
            : null;
    };
    $sailingDisplay = '—';
    if ($quote->schedule_type === 'weekly' && is_array($quote->sailing_weekdays) && count($quote->sailing_weekdays)) {
        $sailingDisplay = implode(', ', $quote->sailing_weekdays);
    } elseif ($quote->sailingDates->isNotEmpty()) {
        $sailingDisplay = $quote->sailingDates->pluck('sailing_date')->map(fn ($d) => $pdfFmtDate($d))->filter()->implode(', ');
    }
    $validityStr = '—';
    if ($quote->valid_from && $quote->valid_to) {
        $validityStr = $pdfFmtDate($quote->valid_from).' – '.$pdfFmtDate($quote->valid_to);
    } elseif ($quote->valid_to) {
        $validityStr = $pdfFmtDate($quote->valid_to);
    } elseif ($quote->valid_from) {
        $validityStr = $pdfFmtDate($quote->valid_from);
    }
    $companyPhone = (string) ($companyProfile['phone'] ?? '');
    $companyEmail = (string) ($companyProfile['email'] ?? '');
    $companyAddr = (string) ($companyProfile['address'] ?? '');
@endphp

    <div class="pdf-wrapper">
        {{-- Header: logo + company info | quotation meta --}}
        <table class="pdf-invoice-top">
            <tr>
                <td class="pdf-invoice-brand quote-pdf-header-brand-row" style="width: 58%;">
                    @if(!empty($pdfLogoSrc))
                        <img src="{{ $pdfLogoSrc }}" alt="">
                    @endif
                    @if($companyDisplayName !== '')
                        <div class="pdf-brand-placeholder">{{ $companyDisplayName }}</div>
                    @else
                        <div class="pdf-brand-placeholder">{{ $labels['company_label'] }}</div>
                    @endif
                    @if($companyAddr !== '')
                        <div class="pdf-brand-sub">{!! nl2br(e($companyAddr)) !!}</div>
                    @endif
                    @if($companyPhone !== '')
                        <div class="pdf-brand-sub">{{ $labels['phone'] }}: {{ $companyPhone }}</div>
                    @endif
                    @if($companyEmail !== '')
                        <div class="pdf-brand-sub">{{ $labels['email'] }}: {{ $companyEmail }}</div>
                    @endif
                </td>
                <td class="pdf-invoice-meta pdf-text-end" style="width: 42%; vertical-align: top;">
                    <div class="pdf-invoice-title">{{ $labels['doc_title'] }}</div>
                    <div class="quote-pdf-meta-compact">
                        <div><span class="pdf-label-strong">{{ $labels['quote_no'] }}</span> {{ $quote->quote_no }}</div>
                        <div><span class="pdf-label-strong">{{ $labels['issued_date'] }}</span>
                            {{ $quote->created_at ? $pdfFmtDate($quote->created_at) : '—' }}</div>
                        @if($quote->salesUser)
                            <div><span class="pdf-label-strong">{{ $labels['sales'] }}</span> {{ $quote->salesUser->name }}</div>
                        @endif
                    </div>
                </td>
            </tr>
        </table>

        @if($quote->quick_mode)
            <div class="quote-pdf-quick-banner">{{ $labels['quick_quotation_badge'] }}</div>
        @endif

        {{-- Client / Company --}}
        <div class="quote-pdf-section">{{ $labels['section_client_company'] }}</div>
        <table class="pdf-party-grid">
            <tr>
                <td class="pdf-party-card" style="width: 48%;">
                    <div class="pdf-party-card__label">{{ $labels['client'] }}</div>
                    <div class="pdf-party-card__name">{{ $client?->name ?? '—' }}</div>
                    @if($client?->company_name)
                        <div class="pdf-mt-sm">{{ $client->company_name }}</div>
                    @endif
                    @if($client?->address)
                        <div class="pdf-mt-sm pdf-text-muted">{!! nl2br(e($client->address)) !!}</div>
                    @endif
                    @if($client?->phone)
                        <div class="pdf-mt-sm">{{ $labels['phone'] }}: {{ $client->phone }}</div>
                    @endif
                    @if($client?->email)
                        <div class="pdf-mt-sm">{{ $labels['email'] }}: {{ $client->email }}</div>
                    @endif
                </td>
                <td class="pdf-party-grid__gap"></td>
                <td class="pdf-party-card" style="width: 48%;">
                    <div class="pdf-party-card__label">{{ $labels['company_label'] }}</div>
                    <div class="pdf-party-card__name">{{ $companyDisplayName !== '' ? $companyDisplayName : '—' }}</div>
                    @if($companyAddr !== '')
                        <div class="pdf-mt-sm pdf-text-muted">{!! nl2br(e($companyAddr)) !!}</div>
                    @endif
                    @if($companyPhone !== '')
                        <div class="pdf-mt-sm">{{ $labels['phone'] }}: {{ $companyPhone }}</div>
                    @endif
                    @if($companyEmail !== '')
                        <div class="pdf-mt-sm">{{ $labels['email'] }}: {{ $companyEmail }}</div>
                    @endif
                </td>
            </tr>
        </table>

        {{-- Route details --}}
        <div class="quote-pdf-section">{{ $labels['section_route'] }}</div>
        <table class="pdf-route-grid" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 25%;">
                    <span class="pdf-label-strong">{{ $labels['pol'] }}</span>
                    {{ $quote->pol ?: '—' }}
                </td>
                <td style="width: 25%;">
                    <span class="pdf-label-strong">{{ $labels['pod'] }}</span>
                    {{ $quote->pod ?: '—' }}
                </td>
                <td style="width: 25%;">
                    <span class="pdf-label-strong">{{ $labels['container'] }}</span>
                    {{ $quote->container_type ?? '—' }}
                </td>
                <td style="width: 25%;">
                    <span class="pdf-label-strong">{{ $labels['qty'] }}</span>
                    {{ $quote->qty ?? '—' }}
                </td>
            </tr>
            <tr>
                @if($showCarrier)
                    <td>
                        <span class="pdf-label-strong">{{ $labels['carrier'] }}</span>
                        {{ $quote->shipping_line ?: '—' }}
                    </td>
                    <td>
                        <span class="pdf-label-strong">{{ $labels['transit_time'] }}</span>
                        {{ $quote->transit_time ?: '—' }}
                    </td>
                    <td>
                        <span class="pdf-label-strong">{{ $labels['free_time'] }}</span>
                        {{ $quote->free_time ?: '—' }}
                    </td>
                    <td>
                        <span class="pdf-label-strong">{{ $labels['validity'] }}</span>
                        {{ $validityStr }}
                    </td>
                @else
                    <td colspan="2">
                        <span class="pdf-label-strong">{{ $labels['transit_time'] }}</span>
                        {{ $quote->transit_time ?: '—' }}
                    </td>
                    <td>
                        <span class="pdf-label-strong">{{ $labels['free_time'] }}</span>
                        {{ $quote->free_time ?: '—' }}
                    </td>
                    <td>
                        <span class="pdf-label-strong">{{ $labels['validity'] }}</span>
                        {{ $validityStr }}
                    </td>
                @endif
            </tr>
            <tr>
                <td colspan="4">
                    <span class="pdf-label-strong">{{ $labels['schedule'] }}</span>
                    {{ $sailingDisplay }}
                </td>
            </tr>
        </table>

        {{-- Ocean Freight --}}
        <div class="quote-pdf-section">{{ $labels['section_ocean_freight'] }}</div>
        <table class="pdf-table pdf-table--standalone">
            <thead>
                <tr>
                    <th class="pdf-w-60">{{ $labels['description'] }}</th>
                    <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                    <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                </tr>
            </thead>
            <tbody>
                @forelse($oceanItems as $item)
                    <tr>
                        <td>
                            {{ $item->name }}
                            @if($item->description)
                                <br><span class="pdf-text-muted">{{ $item->description }}</span>
                            @endif
                        </td>
                        <td class="pdf-text-end">{{ number_format((float) $item->amount, 2) }}</td>
                        <td class="pdf-text-end">{{ $item->currency_code ?: 'USD' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="3" class="pdf-text-muted">—</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        {{-- Inland Transport --}}
        <div class="quote-pdf-section">{{ $labels['section_inland_transport'] }}</div>
        <table class="pdf-table pdf-table--standalone">
            <thead>
                <tr>
                    <th class="pdf-w-60">{{ $labels['description'] }}</th>
                    <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                    <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                </tr>
            </thead>
            <tbody>
                @forelse($inlandItems as $item)
                    <tr>
                        <td>
                            {{ $item->name }}
                            @if($item->description)
                                <br><span class="pdf-text-muted">{{ $item->description }}</span>
                            @endif
                        </td>
                        <td class="pdf-text-end">{{ number_format((float) $item->amount, 2) }}</td>
                        <td class="pdf-text-end">{{ $item->currency_code ?: 'USD' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="3" class="pdf-text-muted">—</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        {{-- Customs & other charges --}}
        <div class="quote-pdf-section">{{ $labels['section_customs'] }}</div>
        <table class="pdf-table pdf-table--standalone">
            <thead>
                <tr>
                    <th class="pdf-w-60">{{ $labels['description'] }}</th>
                    <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                    <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                </tr>
            </thead>
            <tbody>
                @forelse($customsItems as $item)
                    <tr>
                        <td>
                            {{ $item->name }}
                            @if($item->description)
                                <br><span class="pdf-text-muted">{{ $item->description }}</span>
                            @endif
                        </td>
                        <td class="pdf-text-end">{{ number_format((float) $item->amount, 2) }}</td>
                        <td class="pdf-text-end">{{ $item->currency_code ?: 'USD' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="3" class="pdf-text-muted">—</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        {{-- Handling fees (separate from customs; included in grand total) --}}
        @if($handlingItems->isNotEmpty())
            <div class="quote-pdf-section">{{ $labels['section_handling_fees'] }}</div>
            <table class="pdf-table pdf-table--standalone">
                <thead>
                    <tr>
                        <th class="pdf-w-60">{{ $labels['description'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($handlingItems as $item)
                        <tr>
                            <td>
                                {{ $item->name }}
                                @if($item->description)
                                    <br><span class="pdf-text-muted">{{ $item->description }}</span>
                                @endif
                            </td>
                            <td class="pdf-text-end">{{ number_format((float) $item->amount, 2) }}</td>
                            <td class="pdf-text-end">{{ $item->currency_code ?: 'USD' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        {{-- Totals --}}
        @php
            $pdfSectionCount = ($oceanItems->isNotEmpty() ? 1 : 0) + ($inlandItems->isNotEmpty() ? 1 : 0) + ($customsItems->isNotEmpty() ? 1 : 0) + ($handlingItems->isNotEmpty() ? 1 : 0);
            $pdfShowSectionBreakdown = $pdfSectionCount > 1;
        @endphp
        <div class="quote-pdf-section">{{ $labels['section_totals'] }}</div>
        <table class="pdf-table pdf-table--standalone">
            <thead>
                <tr>
                    <th class="pdf-w-60">{{ $labels['description'] }}</th>
                    <th class="pdf-w-40 pdf-text-end">{{ $labels['amount'] }}</th>
                </tr>
            </thead>
            <tbody>
                @if($pdfShowSectionBreakdown)
                    @if($oceanItems->isNotEmpty())
                        @foreach($oceanTotalsByCurrency as $cur => $amt)
                            <tr>
                                <td>{{ $labels['section_ocean_freight'] }} ({{ $cur }})</td>
                                <td class="pdf-text-end">{{ number_format($amt, 2) }} {{ $cur }}</td>
                            </tr>
                        @endforeach
                    @endif
                    @if($inlandItems->isNotEmpty())
                        @foreach($inlandTotalsByCurrency as $cur => $amt)
                            <tr>
                                <td>{{ $labels['section_inland_transport'] }} ({{ $cur }})</td>
                                <td class="pdf-text-end">{{ number_format($amt, 2) }} {{ $cur }}</td>
                            </tr>
                        @endforeach
                    @endif
                    @if($customsItems->isNotEmpty())
                        @foreach($customsTotalsByCurrency as $cur => $amt)
                            <tr>
                                <td>{{ $labels['section_customs'] }} ({{ $cur }})</td>
                                <td class="pdf-text-end">{{ number_format($amt, 2) }} {{ $cur }}</td>
                            </tr>
                        @endforeach
                    @endif
                    @if($handlingItems->isNotEmpty())
                        @foreach($handlingTotalsByCurrency as $cur => $amt)
                            <tr>
                                <td>{{ $labels['section_handling_fees'] }} ({{ $cur }})</td>
                                <td class="pdf-text-end">{{ number_format($amt, 2) }} {{ $cur }}</td>
                            </tr>
                        @endforeach
                    @endif
                @endif
                @foreach($grandTotalsByCurrency as $cur => $amt)
                    <tr>
                        <td class="pdf-label-strong">{{ $labels['grand_total'] }} ({{ $cur }})</td>
                        <td class="pdf-text-end pdf-label-strong">{{ number_format($amt, 2) }} {{ $cur }}</td>
                    </tr>
                @endforeach
                @if(count($grandTotalsByCurrency) === 0)
                    <tr>
                        <td colspan="2" class="pdf-text-muted">—</td>
                    </tr>
                @endif
            </tbody>
        </table>

        {{-- Notes --}}
        <div class="quote-pdf-section">{{ $labels['section_notes'] }}</div>
        @if(filled($quote->official_receipts_note))
            <div class="quote-pdf-official-receipts-note" style="font-size: 10px; margin-bottom: 12px; padding: 8px 10px; background: #f8fafc; border-left: 3px solid #64748b;">
                <div class="pdf-label-strong" style="margin-bottom: 4px;">{{ $labels['official_receipts_title'] }}</div>
                <div class="pdf-text-muted">{!! nl2br(e($quote->official_receipts_note)) !!}</div>
            </div>
        @endif
        @if(filled($quote->notes))
            <div class="pdf-text-muted" style="font-size: 10px;">{!! nl2br(e($quote->notes)) !!}</div>
        @elseif(! filled($quote->official_receipts_note))
            <div class="pdf-text-muted" style="font-size: 10px;">—</div>
        @endif

        {{-- Terms & Conditions --}}
        <div class="quote-pdf-section">{{ $labels['section_terms'] }}</div>
        <div class="quote-pdf-terms">{!! $labels['terms_html'] !!}</div>

        {{-- Prepared by --}}
        <div class="quote-pdf-section">{{ $labels['section_prepared_by'] }}</div>
        <div class="quote-pdf-prepared">
            @if($quote->salesUser)
                <div><span class="pdf-label-strong">{{ $labels['sales'] }}</span> {{ $quote->salesUser->name }}</div>
            @else
                <div class="pdf-text-muted">—</div>
            @endif
            <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['date'] }}</span>
                {{ $quote->created_at ? $pdfFmtDate($quote->created_at) : '—' }}</div>
        </div>
    </div>
@endsection
