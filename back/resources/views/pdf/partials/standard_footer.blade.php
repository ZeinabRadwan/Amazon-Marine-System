@php
    $loc = $lang ?? 'en';
    $c = trans('pdf.common', [], $loc);
@endphp
<p class="pdf-footer__heading">{{ $c['contact_heading'] }}</p>
<p><span class="pdf-footer__key">{{ $c['phone'] }}:</span> {{ $c['phone_value'] }}</p>
<p><span class="pdf-footer__key">{{ $c['email'] }}:</span> {{ $c['email_value'] }}</p>
<p><span class="pdf-footer__key">{{ $c['address'] }}:</span> {{ $c['address_value'] }}</p>
<p><span class="pdf-footer__key">{{ $c['website'] }}:</span> {{ $c['website_value'] }}</p>
@if(!empty($showGenerated) && $showGenerated)
    <p class="pdf-footer__generated">{{ __('pdf.common.generated_footer', ['datetime' => now()->format('Y-m-d H:i:s')], $loc) }}</p>
@endif
