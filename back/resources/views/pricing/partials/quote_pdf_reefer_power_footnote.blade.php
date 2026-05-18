<div class="pdf-quote-reefer-deferred-footnote" role="note">
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
</div>
