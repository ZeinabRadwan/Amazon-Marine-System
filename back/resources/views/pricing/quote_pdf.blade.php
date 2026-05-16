@extends('pdf.layouts.master')

@section('pdf_title')
    {{ $labels['doc_title_en'] }} · {{ $quote->quote_no }}
@endsection

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
        @include('pdf.partials.quotation_pdf_skin')
    </style>
@endpush

@section('content')
    @php
        $client = $quote->client;
        $companyPhone = (string) ($companyProfile['phone'] ?? '');
        $companyEmail = (string) ($companyProfile['email'] ?? '');
        $companyAddr = (string) ($companyProfile['address'] ?? '');
        $formatBreakdown = $formatBreakdown ?? static fn (array $m): string => '—';
        $currencyOrder = ['USD', 'EGP', 'EUR'];
        $routeMetas = [];
        if ($showCarrier) {
            $routeMetas[] = ['val' => $quote->shipping_line ?: '—', 'lbl' => $labels['carrier']];
        }
        $routeMetas[] = ['val' => $quote->transit_time ?: '—', 'lbl' => $labels['transit_time']];
        $routeMetas[] = ['val' => $containerDisplay, 'lbl' => $labels['containers']];
    @endphp

    <div class="pdf-wrapper pdf-inv-html pdf-sd-doc pdf-quote-doc" dir="ltr" lang="{{ $lang }}">
        <header class="pdf-header pdf-header--branded pdf-header--sd">
            <table class="pdf-header__table" width="100%">
                <tr>
                    <td class="pdf-header__logo" width="18%">
                        @if (! empty($pdfLogoSrc))
                            <img class="pdf-header__logo-img" src="{{ $pdfLogoSrc }}" alt="">
                        @else
                            <div class="pdf-header__logo-fallback">AMS</div>
                        @endif
                    </td>
                    <td class="pdf-header__brand-cell" width="42%">
                        <div class="pdf-header__brand-stack">
                            <div class="pdf-header__brand-line"><strong>{{ $labels['brand'] }}</strong></div>
                            <div class="pdf-header__brand-tag">{{ $labels['brand_tag'] }}</div>
                            <span class="pdf-header__brand-contact">{{ $labels['brand_contact'] }}</span>
                        </div>
                    </td>
                    <td class="pdf-header__doc" width="40%">
                        <p class="pdf-header__title pdf-inv-header-title">
                            <span class="pdf-inv-header-title-en">{{ $labels['doc_title_en'] }}</span>
                            <span class="pdf-inv-header-title-ar">{{ $labels['doc_title_ar'] }}</span>
                        </p>
                        <div class="pdf-quote-header-meta">
                            <div class="pdf-quote-header-meta__row">
                                <span class="pdf-quote-header-meta__label">{{ $labels['exchange_rate'] }}</span>
                                <span class="pdf-quote-header-meta__val">{{ $exchangeRateLabel }}</span>
                            </div>
                            <div class="pdf-quote-header-meta__row">
                                <span class="pdf-quote-header-meta__label">{{ $labels['quotation_id'] }}</span>
                                <span class="pdf-quote-header-meta__val pdf-inv-meta-val-mono">{{ $quote->quote_no }}</span>
                            </div>
                        </div>
                        @if ($quote->quick_mode)
                            <div class="pdf-sd-header-badges">
                                <span class="pdf-sd-badge pdf-sd-badge--quote">{{ $labels['quick_quotation_badge'] }}</span>
                            </div>
                        @endif
                    </td>
                </tr>
            </table>
        </header>

        {{-- Metadata: Issue Date | Valid Until | Quotation Number --}}
        <div class="pdf-inv-panel-wrap">
            <table class="pdf-inv-meta-row pdf-inv-meta-row--quote" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td class="pdf-inv-meta-cell" width="33%">
                        <div class="pdf-inv-meta-en">{{ $labels['issued_date'] }}</div>
                        <div class="pdf-inv-meta-ar">{{ $labels['issued_date_ar'] ?? $labels['issued_date'] }}</div>
                        <div class="pdf-inv-meta-val">{{ $issueDateFormatted }}</div>
                    </td>
                    <td class="pdf-inv-meta-sep"></td>
                    <td class="pdf-inv-meta-cell" width="33%">
                        <div class="pdf-inv-meta-en">{{ $labels['valid_until'] }}</div>
                        <div class="pdf-inv-meta-ar">{{ $labels['valid_until_ar'] }}</div>
                        <div class="pdf-inv-meta-val">{{ $validUntilFormatted }}</div>
                    </td>
                    <td class="pdf-inv-meta-sep"></td>
                    <td class="pdf-inv-meta-cell" width="33%">
                        <div class="pdf-inv-meta-en">{{ $labels['quotation_id'] }}</div>
                        <div class="pdf-inv-meta-ar">{{ $labels['quotation_id_ar'] }}</div>
                        <div class="pdf-inv-meta-val pdf-inv-meta-val-mono">{{ $quote->quote_no }}</div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- From / Billed To --}}
        <div class="pdf-inv-panel-wrap">
            <table class="pdf-inv-parties" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td width="49%">
                        <div class="pdf-inv-party-role">{{ $labels['issued_by'] }}</div>
                        <div class="pdf-inv-party-role-ar">{{ $labels['issued_by_ar'] }}</div>
                        <div class="pdf-inv-party-name">{{ $companyDisplayName !== '' ? $companyDisplayName : '—' }}</div>
                        <div class="pdf-inv-party-detail">
                            @if ($companyAddr !== '')
                                <span>{!! nl2br(e($companyAddr)) !!}</span><br>
                            @endif
                            @if ($companyPhone !== '')
                                <strong>{{ $labels['phone'] }}:</strong> {{ $companyPhone }}<br>
                            @endif
                            @if ($companyEmail !== '')
                                <strong>{{ $labels['email'] }}:</strong> {{ $companyEmail }}
                            @endif
                        </div>
                    </td>
                    <td class="pdf-inv-party-div"></td>
                    <td width="49%" class="pdf-inv-party-right">
                        <div class="pdf-inv-party-role">{{ $labels['billed_to'] }}</div>
                        <div class="pdf-inv-party-role-ar">{{ $labels['billed_to_ar'] }}</div>
                        <div class="pdf-inv-party-name">{{ $client?->name ?? '—' }}</div>
                        @if ($client?->company_name)
                            <div class="pdf-inv-party-company">{{ $client->company_name }}</div>
                        @endif
                        <div class="pdf-inv-party-detail">
                            @if ($client?->address)
                                <span>{!! nl2br(e($client->address)) !!}</span><br>
                            @endif
                            @if ($client?->phone)
                                <span>{{ $client->phone }}</span>
                            @endif
                            @if ($client?->email)
                                @if ($client?->phone)<br>@endif
                                <span>{{ $client->email }}</span>
                            @endif
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- Shipping details: POL / POD + metas --}}
        <div class="pdf-inv-panel-wrap">
            <table class="pdf-inv-route-tpl-bar" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td class="pdf-inv-route-tpl-ports-cell" valign="middle">
                        <table class="pdf-inv-route-tpl-ports" width="100%">
                            <tr>
                                <td class="pdf-inv-route-tpl-port" valign="middle">
                                    <div class="pdf-inv-route-tpl-port-name">{{ $quote->pol ?: '—' }}</div>
                                    <div class="pdf-inv-route-tpl-port-lbl">{{ $labels['pol'] }}</div>
                                </td>
                                <td class="pdf-inv-route-tpl-arrow" valign="middle">→</td>
                                <td class="pdf-inv-route-tpl-port pdf-inv-route-tpl-port--end" valign="middle">
                                    <div class="pdf-inv-route-tpl-port-name">{{ $quote->pod ?: '—' }}</div>
                                    <div class="pdf-inv-route-tpl-port-lbl">{{ $labels['pod'] }}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="pdf-inv-route-tpl-metas-cell" valign="middle">
                        <table class="pdf-inv-route-tpl-metas" width="100%">
                            <tr>
                                @foreach ($routeMetas as $idx => $meta)
                                    <td class="pdf-inv-route-tpl-rmeta{{ $idx > 0 ? ' pdf-inv-route-tpl-rmeta--split' : '' }}" valign="middle">
                                        <div class="pdf-inv-route-tpl-rmeta-val">{{ $meta['val'] }}</div>
                                        <div class="pdf-inv-route-tpl-rmeta-lbl">{{ $meta['lbl'] }}</div>
                                    </td>
                                @endforeach
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        {{-- Available Sailing (orange highlight) --}}
        @if ($sailingDisplay !== '—')
            <div class="pdf-quote-sailing-banner">
                <div class="pdf-quote-sailing-banner__titles">
                    <span class="pdf-quote-sailing-banner__title-en">{{ $labels['available_sailing_en'] }}</span>
                    <span class="pdf-quote-sailing-banner__title-ar">{{ $labels['available_sailing_ar'] }}</span>
                </div>
                <div class="pdf-quote-sailing-banner__value">{{ $sailingDisplay }}</div>
            </div>
        @endif

        @php
            $sections = [
                ['key' => 'ocean', 'items' => $oceanItems, 'totals' => $oceanTotalsByCurrency, 'en' => $labels['section_ocean_freight'], 'ar' => 'الشحن البحري'],
                ['key' => 'inland', 'items' => $inlandItems, 'totals' => $inlandTotalsByCurrency, 'en' => $labels['section_inland_transport'], 'ar' => 'النقل الداخلي'],
                ['key' => 'customs', 'items' => $customsItems, 'totals' => $customsTotalsByCurrency, 'en' => $labels['section_customs'], 'ar' => 'التخليص الجمركي'],
            ];
        @endphp

        @foreach ($sections as $section)
            @if ($section['items']->isNotEmpty())
                <div class="pdf-inv-section-card">
                    <table class="pdf-inv-sec-head" width="100%">
                        <tr>
                            <td class="pdf-inv-sec-title-stack">
                                <div class="pdf-inv-sec-title-en">{{ $section['en'] }}</div>
                                <div class="pdf-inv-sec-title-ar">{{ $section['ar'] }}</div>
                            </td>
                            <td class="pdf-inv-sec-total" style="width:38%;">{{ $formatBreakdown($section['totals']) }}</td>
                        </tr>
                    </table>
                    <table class="pdf-inv-table" width="100%">
                        <thead>
                            <tr>
                                <th class="pdf-inv-col-item">{{ $labels['description'] }}</th>
                                <th class="pdf-inv-col-amt pdf-inv-th-center">{{ $labels['amount'] }}</th>
                                <th class="pdf-inv-col-cur pdf-inv-th-center">{{ $labels['currency'] }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($section['items'] as $item)
                                <tr>
                                    <td class="pdf-inv-col-item">
                                        <span>{{ $item->name }}</span>
                                    </td>
                                    <td class="pdf-inv-col-amt pdf-inv-td-center">{{ number_format((float) $item->amount, 2) }}</td>
                                    <td class="pdf-inv-col-cur pdf-inv-td-center">{{ strtoupper($item->currency_code ?: 'USD') }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        @endforeach

        {{-- Handling fees (final pricing section before grand total) --}}
        @if ($handlingItems->isNotEmpty())
            <div class="pdf-inv-section-card pdf-inv-section-card--handling">
                <table class="pdf-inv-sec-head" width="100%">
                    <tr>
                        <td class="pdf-inv-sec-title-stack">
                            <div class="pdf-inv-sec-title-en">{{ $labels['section_handling_fees_en'] }}</div>
                            <div class="pdf-inv-sec-title-ar">{{ $labels['section_handling_fees_ar'] }}</div>
                        </td>
                        <td class="pdf-inv-sec-total" style="width:38%;">{{ $formatBreakdown($handlingTotalsByCurrency) }}</td>
                    </tr>
                </table>
                <table class="pdf-inv-table" width="100%">
                    <thead>
                        <tr>
                            <th class="pdf-inv-col-item">{{ $labels['description'] }}</th>
                            <th class="pdf-inv-col-amt pdf-inv-th-center">{{ $labels['amount'] }}</th>
                            <th class="pdf-inv-col-cur pdf-inv-th-center">{{ $labels['currency'] }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($handlingItems as $item)
                            <tr>
                                <td class="pdf-inv-col-item">{{ $item->name }}</td>
                                <td class="pdf-inv-col-amt pdf-inv-td-center">{{ number_format((float) $item->amount, 2) }}</td>
                                <td class="pdf-inv-col-cur pdf-inv-td-center">{{ strtoupper($item->currency_code ?: 'USD') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        {{-- Grand total --}}
        <div class="pdf-inv-grand-wrap">
            <table class="pdf-inv-grand" width="100%">
                <tr>
                    <td width="34%">
                        <div class="pdf-inv-grand-title">{{ $labels['grand_total'] }}</div>
                        <div class="pdf-inv-grand-title-ar">الإجمالي الكلي</div>
                    </td>
                    <td width="66%">
                        <table class="pdf-inv-grand-breakdown" width="100%">
                            @foreach ($currencyOrder as $curCode)
                                @php $amt = (float) ($grandTotalsByCurrency[$curCode] ?? 0); @endphp
                                @if (abs($amt) > 1e-9)
                                    <tr class="pdf-inv-grand-cur">
                                        <td>{{ $labels['total'] }} {{ $curCode }}</td>
                                        <td class="pdf-inv-gtr-val">{{ number_format($amt, 2) }} {{ $curCode }}</td>
                                    </tr>
                                @endif
                            @endforeach
                            @if (count($grandTotalsByCurrency) === 0)
                                <tr><td colspan="2">—</td></tr>
                            @endif
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        @if (filled($quote->official_receipts_note) || filled($quote->notes))
            <div class="pdf-inv-notes">
                <div class="pdf-inv-notes__title">{{ $labels['section_notes'] }}</div>
                @if (filled($quote->official_receipts_note))
                    <div class="pdf-notes-block__title">{{ $labels['official_receipts_title'] }}</div>
                    <div style="margin-bottom:8px;">{!! nl2br(e($quote->official_receipts_note)) !!}</div>
                @endif
                @if (filled($quote->notes))
                    <div>{!! nl2br(e($quote->notes)) !!}</div>
                @endif
            </div>
        @endif

        <div class="pdf-inv-terms-wrap">
            <div class="pdf-inv-terms-title">{{ $labels['section_terms'] }}</div>
            <div class="pdf-quote-terms">{!! $labels['terms_html'] !!}</div>
        </div>

        @if ($quote->salesUser)
            <div class="pdf-inv-notes pdf-mt-sm">
                <span class="pdf-label-strong">{{ $labels['sales'] }}:</span>
                {{ $quote->salesUser->name }}
                ·
                <span class="pdf-label-strong">{{ $labels['date'] }}:</span>
                {{ $issueDateFormatted }}
            </div>
        @endif
    </div>
@endsection
