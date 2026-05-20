{{-- Line items table (quotation PDF v3) --}}
@php
    $showReeferDeferredPower = !empty($showReeferDeferredPower);
    $showOwsDeferred = !empty($showOwsDeferred);
    $owsDeferredLines = $owsDeferredLines ?? [];
    $labels = $labels ?? [];
    $detailsFallback = $detailsFallback ?? '—';
    $formatLineAmount = static function ($item): string {
        $cur = strtoupper((string) ($item->currency_code ?: 'USD'));
        $amt = number_format((float) $item->amount, 2);

        return $amt.' '.$cur;
    };
    $sectionTotalAr = match ($sectionEn ?? '') {
        'Ocean Freight' => 'إجمالي الشحن البحري',
        'Inland Transport' => 'إجمالي النقل الداخلي',
        'Customs Clearance' => 'إجمالي التخليص الجمركي',
        'Handling Fees' => 'إجمالي رسوم الخدمة',
        default => '',
    };
@endphp
<table class="pdf-quote-v3-table" width="100%" cellspacing="0" cellpadding="0" border="0">
    <thead>
        <tr>
            <th width="46%">{{ $labels['charge_col'] ?? 'Charge / البند' }}</th>
            <th class="qtv3-th-center" width="30%">{{ $labels['details_col'] ?? 'Details' }}</th>
            <th class="qtv3-th-right" width="24%">{{ $labels['amount_col'] ?? 'Amount' }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($items as $idx => $item)
            @php
                $details = trim((string) ($item->description ?? ''));
                if ($details === '') {
                    $details = $detailsFallback;
                }
            @endphp
            <tr class="{{ $idx % 2 === 1 ? 'qtv3-row-alt' : '' }}">
                <td>
                    <div class="pdf-quote-v3-charge-en">{{ $item->name }}</div>
                </td>
                <td class="pdf-quote-v3-td-center">{{ $details }}</td>
                <td class="pdf-quote-v3-td-right">{{ $formatLineAmount($item) }}</td>
            </tr>
        @endforeach
        <tr class="qtv3-subtotal">
            <td colspan="2">
                <strong>{{ $sectionEn }} Total</strong>
                @if ($sectionTotalAr !== '')
                    <span class="pdf-quote-v3-sub-ar">/ {{ $sectionTotalAr }}</span>
                @endif
            </td>
            <td class="pdf-quote-v3-td-right qtv3-td-right">{{ $formatBreakdown($totals) }}</td>
        </tr>
        @if (!empty($showReeferDeferredPower))
            <tr class="pdf-quote-reefer-deferred-footnote-row">
                <td colspan="3" class="pdf-quote-reefer-deferred-footnote-cell">
                    <div class="pdf-quote-reefer-deferred-footnote__line">
                        <span class="pdf-quote-reefer-deferred-footnote__plus">+</span>
                        <em class="pdf-quote-reefer-deferred-footnote__power" lang="en">Power:</em>
                        @if (!empty($reeferPowerPerDay['amount']))
                            <span class="pdf-quote-reefer-deferred-footnote__rate" lang="en">
                                {{ rtrim(rtrim(number_format((float) $reeferPowerPerDay['amount'], 2, '.', ''), '0'), '.') }}
                                {{ strtoupper($reeferPowerPerDay['currency'] ?? 'USD') }}/day
                            </span>
                        @endif
                    </div>
                    @if (!empty($reeferFreePowerDaysLabel))
                        <div class="pdf-quote-reefer-deferred-footnote__line pdf-quote-reefer-deferred-footnote__line--free" lang="en">
                            {{ $reeferFreePowerDaysLabel }}
                        </div>
                    @endif
                </td>
            </tr>
        @endif
        @if (!empty($showOwsDeferred) && !empty($owsDeferredLines))
            @foreach ($owsDeferredLines as $owsDetail)
                <tr class="pdf-quote-reefer-deferred-footnote-row pdf-quote-ows-deferred-footnote-row">
                    <td colspan="3" class="pdf-quote-reefer-deferred-footnote-cell">
                        <div class="pdf-quote-reefer-deferred-footnote__line">
                            <span class="pdf-quote-reefer-deferred-footnote__plus">+</span>
                            <em class="pdf-quote-ows-deferred-footnote__label" lang="en">OWS:</em>
                            @if ($owsDetail !== '')
                                <span class="pdf-quote-reefer-deferred-footnote__rate" lang="en">{{ $owsDetail }}</span>
                            @endif
                        </div>
                    </td>
                </tr>
            @endforeach
        @endif
    </tbody>
</table>
