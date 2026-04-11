@php
    $loc = $lang ?? 'en';
    $c = trans('pdf.common', [], $loc);
@endphp
<p class="pdf-footer__heading">{{ $c['contact_heading'] }}</p>
<table class="pdf-footer__row-table" cellpadding="0" cellspacing="0" border="0">
    <tr class="pdf-footer__row">
        <td class="pdf-footer__icon-cell">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </td>
        <td>{{ $c['phone_value'] }}</td>
    </tr>
    <tr class="pdf-footer__row">
        <td class="pdf-footer__icon-cell">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </td>
        <td>{{ $c['email_value'] }}</td>
    </tr>
    <tr class="pdf-footer__row">
        <td class="pdf-footer__icon-cell">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </td>
        <td>{{ $c['address_value'] }}</td>
    </tr>
    <tr class="pdf-footer__row">
        <td class="pdf-footer__icon-cell">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </td>
        <td>{{ $c['website_value'] }}</td>
    </tr>
</table>
@if(!empty($showGenerated) && $showGenerated)
    <p class="pdf-footer__generated">{{ __('pdf.common.generated_footer', ['datetime' => now()->format('Y-m-d H:i:s')], $loc) }}</p>
@endif
