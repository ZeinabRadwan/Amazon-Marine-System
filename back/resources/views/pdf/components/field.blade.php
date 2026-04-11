@php
    $highlight = !empty($highlight);
@endphp
<div class="pdf-field">
    @if(isset($label) && $label !== '')
        <div class="pdf-label">{{ $label }}</div>
    @endif
    <div class="pdf-value {{ $highlight ? 'pdf-highlight-box' : '' }}">{{ $value }}</div>
</div>
