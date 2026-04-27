@extends('pdf.layouts.master')

@section('pdf_title')
    {{ $labels['doc_title'] }} · {{ $quote->quote_no }}
@endsection

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')

        .pdf-sd-doc .pdf-party-grid td.pdf-party-card {
            background: #ffffff;
            border-color: #e2e8f0;
        }

        .pdf-sd-doc .pdf-sd-badge--quote {
            background: #ec7f00;
            color: #ffffff;
        }

        .pdf-sd-doc .pdf-amount-cell {
            direction: ltr;
            unicode-bidi: isolate;
            text-align: right;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-amount-cell {
            text-align: left;
        }

        .pdf-sd-doc .pdf-quote-terms p {
            margin: 0 0 6px 0;
            line-height: 1.45;
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
        $pdfSectionCount =
            ($oceanItems->isNotEmpty() ? 1 : 0)
            + ($inlandItems->isNotEmpty() ? 1 : 0)
            + ($customsItems->isNotEmpty() ? 1 : 0)
            + ($handlingItems->isNotEmpty() ? 1 : 0);
        $pdfShowSectionBreakdown = $pdfSectionCount > 1;
    @endphp

    <div class="pdf-sd-doc">
        <header class="pdf-header pdf-header--branded pdf-header--sd">
            <table class="pdf-header__table">
                <tr>
                    <td class="pdf-header__logo">
                        @if (! empty($pdfLogoSrc))
                            <img class="pdf-header__logo-img" src="{{ $pdfLogoSrc }}" alt="">
                        @else
                            <div class="pdf-header__logo-fallback">AMS</div>
                        @endif
                    </td>
                    <td class="pdf-header__brand-cell">
                        <div class="pdf-header__brand-stack">
                            <div class="pdf-header__brand-line"><strong>{{ $labels['brand'] }}</strong></div>
                            <div class="pdf-header__brand-tag">{{ $labels['brand_tag'] }}</div>
                            <span class="pdf-header__brand-contact">{{ $labels['brand_contact'] }}</span>
                        </div>
                    </td>
                    <td class="pdf-header__doc">
                        <p class="pdf-header__title">{{ $labels['doc_title'] }}</p>
                        <div class="pdf-header__sd-big">{{ $quote->quote_no }}</div>
                        <div class="pdf-header__meta-list">
                            <div class="pdf-header__date-page-row">
                                <span class="pdf-header__meta-label">{{ $labels['issued_date'] }}</span>
                                <span class="pdf-header__meta-val">{{ $quote->created_at ? $pdfFmtDate($quote->created_at) : '—' }}</span>
                            </div>
                            @if ($quote->salesUser)
                                <div class="pdf-header__date-page-row">
                                    <span class="pdf-header__meta-label">{{ $labels['sales'] }}</span>
                                    <span class="pdf-header__meta-val pdf-cell-dir-auto">{{ $quote->salesUser->name }}</span>
                                </div>
                            @endif
                            @if ($quote->quick_mode)
                                <div class="pdf-sd-header-badges">
                                    <span class="pdf-sd-badge pdf-sd-badge--quote">{{ $labels['quick_quotation_badge'] }}</span>
                                </div>
                            @endif
                        </div>
                    </td>
                </tr>
            </table>
        </header>

        {{-- 1. Client / company (same two-column party layout as quotation UI) --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_client_company'] }}</p>
            <table class="pdf-party-grid" style="width:100%; border-collapse:collapse;">
                <tr>
                    <td class="pdf-party-card" style="width: 48%;">
                        <div class="pdf-party-card__label">{{ $labels['client'] }}</div>
                        <div class="pdf-party-card__name pdf-cell-dir-auto">{{ $client?->name ?? '—' }}</div>
                        @if ($client?->company_name)
                            <div class="pdf-mt-sm pdf-cell-dir-auto">{{ $client->company_name }}</div>
                        @endif
                        @if ($client?->address)
                            <div class="pdf-mt-sm pdf-text-muted">{!! nl2br(e($client->address)) !!}</div>
                        @endif
                        @if ($client?->phone)
                            <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['phone'] }}:</span> <span class="pdf-cell-dir-auto">{{ $client->phone }}</span></div>
                        @endif
                        @if ($client?->email)
                            <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['email'] }}:</span> <span class="pdf-cell-dir-auto">{{ $client->email }}</span></div>
                        @endif
                    </td>
                    <td class="pdf-party-grid__gap"></td>
                    <td class="pdf-party-card" style="width: 48%;">
                        <div class="pdf-party-card__label">{{ $labels['company_label'] }}</div>
                        <div class="pdf-party-card__name pdf-cell-dir-auto">{{ $companyDisplayName !== '' ? $companyDisplayName : '—' }}</div>
                        @if ($companyAddr !== '')
                            <div class="pdf-mt-sm pdf-text-muted">{!! nl2br(e($companyAddr)) !!}</div>
                        @endif
                        @if ($companyPhone !== '')
                            <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['phone'] }}:</span> <span class="pdf-cell-dir-auto">{{ $companyPhone }}</span></div>
                        @endif
                        @if ($companyEmail !== '')
                            <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['email'] }}:</span> <span class="pdf-cell-dir-auto">{{ $companyEmail }}</span></div>
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        {{-- 2. Route & schedule --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_route'] }}</p>
            <table class="pdf-table pdf-table--flush-top">
                <tr>
                    <th class="pdf-w-25">{{ $labels['pol'] }}</th>
                    <th class="pdf-w-25">{{ $labels['pod'] }}</th>
                    <th class="pdf-w-25">{{ $labels['container'] }}</th>
                    <th class="pdf-w-25">{{ $labels['qty'] }}</th>
                </tr>
                <tr>
                    <td class="pdf-cell-dir-auto">{{ $quote->pol ?: '—' }}</td>
                    <td class="pdf-cell-dir-auto">{{ $quote->pod ?: '—' }}</td>
                    <td class="pdf-cell-dir-auto">{{ $quote->container_type ?? '—' }}</td>
                    <td class="pdf-amount-cell">{{ $quote->qty ?? '—' }}</td>
                </tr>
                <tr>
                    @if ($showCarrier)
                        <th>{{ $labels['carrier'] }}</th>
                        <th>{{ $labels['transit_time'] }}</th>
                        <th>{{ $labels['free_time'] }}</th>
                        <th>{{ $labels['validity'] }}</th>
                    @else
                        <th colspan="2">{{ $labels['transit_time'] }}</th>
                        <th>{{ $labels['free_time'] }}</th>
                        <th>{{ $labels['validity'] }}</th>
                    @endif
                </tr>
                <tr>
                    @if ($showCarrier)
                        <td class="pdf-cell-dir-auto">{{ $quote->shipping_line ?: '—' }}</td>
                        <td class="pdf-cell-dir-auto">{{ $quote->transit_time ?: '—' }}</td>
                        <td class="pdf-cell-dir-auto">{{ $quote->free_time ?: '—' }}</td>
                        <td class="pdf-cell-dir-auto">{{ $validityStr }}</td>
                    @else
                        <td colspan="2" class="pdf-cell-dir-auto">{{ $quote->transit_time ?: '—' }}</td>
                        <td class="pdf-cell-dir-auto">{{ $quote->free_time ?: '—' }}</td>
                        <td class="pdf-cell-dir-auto">{{ $validityStr }}</td>
                    @endif
                </tr>
                <tr>
                    <th colspan="4">{{ $labels['schedule'] }}</th>
                </tr>
                <tr>
                    <td colspan="4" class="pdf-cell-dir-auto">{{ $sailingDisplay }}</td>
                </tr>
            </table>
        </div>

        {{-- 3. Ocean freight --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_ocean_freight'] }}</p>
            <table class="pdf-table pdf-table--flush-top">
                <thead>
                    <tr>
                        <th class="pdf-w-60">{{ $labels['description'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($oceanItems as $item)
                        <tr>
                            <td>
                                <span class="pdf-cell-dir-auto">{{ $item->name }}</span>
                                @if ($item->description)
                                    <br><span class="pdf-text-muted pdf-cell-dir-auto">{{ $item->description }}</span>
                                @endif
                            </td>
                            <td class="pdf-text-end pdf-amount-cell">{{ number_format((float) $item->amount, 2) }}</td>
                            <td class="pdf-text-end pdf-cell-dir-auto">{{ $item->currency_code ?: 'USD' }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" class="pdf-text-muted">—</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        {{-- 4. Inland transport --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_inland_transport'] }}</p>
            <table class="pdf-table pdf-table--flush-top">
                <thead>
                    <tr>
                        <th class="pdf-w-60">{{ $labels['description'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($inlandItems as $item)
                        <tr>
                            <td>
                                <span class="pdf-cell-dir-auto">{{ $item->name }}</span>
                                @if ($item->description)
                                    <br><span class="pdf-text-muted pdf-cell-dir-auto">{{ $item->description }}</span>
                                @endif
                            </td>
                            <td class="pdf-text-end pdf-amount-cell">{{ number_format((float) $item->amount, 2) }}</td>
                            <td class="pdf-text-end pdf-cell-dir-auto">{{ $item->currency_code ?: 'USD' }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" class="pdf-text-muted">—</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        {{-- 5. Customs & other charges --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_customs'] }}</p>
            <table class="pdf-table pdf-table--flush-top">
                <thead>
                    <tr>
                        <th class="pdf-w-60">{{ $labels['description'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                        <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($customsItems as $item)
                        <tr>
                            <td>
                                <span class="pdf-cell-dir-auto">{{ $item->name }}</span>
                                @if ($item->description)
                                    <br><span class="pdf-text-muted pdf-cell-dir-auto">{{ $item->description }}</span>
                                @endif
                            </td>
                            <td class="pdf-text-end pdf-amount-cell">{{ number_format((float) $item->amount, 2) }}</td>
                            <td class="pdf-text-end pdf-cell-dir-auto">{{ $item->currency_code ?: 'USD' }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" class="pdf-text-muted">—</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        {{-- 6. Handling fees --}}
        @if ($handlingItems->isNotEmpty())
            <div class="pdf-section">
                <p class="pdf-section__heading">{{ $labels['section_handling_fees'] }}</p>
                <table class="pdf-table pdf-table--flush-top">
                    <thead>
                        <tr>
                            <th class="pdf-w-60">{{ $labels['description'] }}</th>
                            <th class="pdf-w-20 pdf-text-end">{{ $labels['amount'] }}</th>
                            <th class="pdf-w-20 pdf-text-end">{{ $labels['currency'] }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($handlingItems as $item)
                            <tr>
                                <td>
                                    <span class="pdf-cell-dir-auto">{{ $item->name }}</span>
                                    @if ($item->description)
                                        <br><span class="pdf-text-muted pdf-cell-dir-auto">{{ $item->description }}</span>
                                    @endif
                                </td>
                                <td class="pdf-text-end pdf-amount-cell">{{ number_format((float) $item->amount, 2) }}</td>
                                <td class="pdf-text-end pdf-cell-dir-auto">{{ $item->currency_code ?: 'USD' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        {{-- 7. Totals --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_totals'] }}</p>
            <table class="pdf-table pdf-table--flush-top">
                <thead>
                    <tr>
                        <th class="pdf-w-60">{{ $labels['description'] }}</th>
                        <th class="pdf-w-40 pdf-text-end">{{ $labels['amount'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @if ($pdfShowSectionBreakdown)
                        @if ($oceanItems->isNotEmpty())
                            @foreach ($oceanTotalsByCurrency as $cur => $amt)
                                <tr>
                                    <td>{{ $labels['section_ocean_freight'] }} ({{ $cur }})</td>
                                    <td class="pdf-text-end pdf-amount-cell">{{ number_format($amt, 2) }} {{ $cur }}</td>
                                </tr>
                            @endforeach
                        @endif
                        @if ($inlandItems->isNotEmpty())
                            @foreach ($inlandTotalsByCurrency as $cur => $amt)
                                <tr>
                                    <td>{{ $labels['section_inland_transport'] }} ({{ $cur }})</td>
                                    <td class="pdf-text-end pdf-amount-cell">{{ number_format($amt, 2) }} {{ $cur }}</td>
                                </tr>
                            @endforeach
                        @endif
                        @if ($customsItems->isNotEmpty())
                            @foreach ($customsTotalsByCurrency as $cur => $amt)
                                <tr>
                                    <td>{{ $labels['section_customs'] }} ({{ $cur }})</td>
                                    <td class="pdf-text-end pdf-amount-cell">{{ number_format($amt, 2) }} {{ $cur }}</td>
                                </tr>
                            @endforeach
                        @endif
                        @if ($handlingItems->isNotEmpty())
                            @foreach ($handlingTotalsByCurrency as $cur => $amt)
                                <tr>
                                    <td>{{ $labels['section_handling_fees'] }} ({{ $cur }})</td>
                                    <td class="pdf-text-end pdf-amount-cell">{{ number_format($amt, 2) }} {{ $cur }}</td>
                                </tr>
                            @endforeach
                        @endif
                    @endif
                    @foreach ($grandTotalsByCurrency as $cur => $amt)
                        <tr>
                            <td class="pdf-label-strong">{{ $labels['grand_total'] }} ({{ $cur }})</td>
                            <td class="pdf-text-end pdf-label-strong pdf-amount-cell">{{ number_format($amt, 2) }} {{ $cur }}</td>
                        </tr>
                    @endforeach
                    @if (count($grandTotalsByCurrency) === 0)
                        <tr>
                            <td colspan="2" class="pdf-text-muted">—</td>
                        </tr>
                    @endif
                </tbody>
            </table>
        </div>

        {{-- 8. Notes --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_notes'] }}</p>
            <div class="pdf-notes">
                @if (filled($quote->official_receipts_note))
                    <div class="pdf-notes-block__title">{{ $labels['official_receipts_title'] }}</div>
                    <div class="pdf-text-muted pdf-cell-dir-auto" style="margin-bottom:10px;">{!! nl2br(e($quote->official_receipts_note)) !!}</div>
                @endif
                @if (filled($quote->notes))
                    <div class="pdf-cell-dir-auto">{!! nl2br(e($quote->notes)) !!}</div>
                @elseif (! filled($quote->official_receipts_note))
                    <span class="pdf-text-muted">—</span>
                @endif
            </div>
        </div>

        {{-- 9. Terms & conditions --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_terms'] }}</p>
            <div class="pdf-notes pdf-quote-terms">{!! $labels['terms_html'] !!}</div>
        </div>

        {{-- 10. Prepared by --}}
        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['section_prepared_by'] }}</p>
            <div class="pdf-notes">
                @if ($quote->salesUser)
                    <div><span class="pdf-label-strong">{{ $labels['sales'] }}:</span> <span class="pdf-cell-dir-auto">{{ $quote->salesUser->name }}</span></div>
                @else
                    <span class="pdf-text-muted">—</span>
                @endif
                <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['date'] }}:</span> {{ $quote->created_at ? $pdfFmtDate($quote->created_at) : '—' }}</div>
            </div>
        </div>
    </div>
@endsection
