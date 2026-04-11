@php
    $loc = $lang ?? 'en';
    $c = trans('pdf.common', [], $loc);
@endphp
<p class="pdf-footer__heading">{{ $c['contact_heading'] }}</p>
<div class="pdf-footer__row"><span class="pdf-label">{{ $c['phone'] }}</span> <span class="pdf-value">{{ $c['phone_value'] }}</span></div>
<div class="pdf-footer__row"><span class="pdf-label">{{ $c['email'] }}</span> <span class="pdf-value">{{ $c['email_value'] }}</span></div>
<div class="pdf-footer__row"><span class="pdf-label">{{ $c['address'] }}</span> <span class="pdf-value">{{ $c['address_value'] }}</span></div>
<div class="pdf-footer__row"><span class="pdf-label">{{ $c['website'] }}</span> <span class="pdf-value">{{ $c['website_value'] }}</span></div>
@if(!empty($showGenerated) && $showGenerated)
    <p class="pdf-footer__generated">{{ __('pdf.common.generated_footer', ['datetime' => now()->format('Y-m-d H:i:s')], $loc) }}</p>
@endif
