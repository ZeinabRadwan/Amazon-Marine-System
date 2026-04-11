@php
    $highlight = !empty($highlight);
    $isDark = !empty($dark);
@endphp
<div class="pdf-field {{ $isDark ? 'pdf-field--dark' : 'pdf-field--light' }}">
    @if(isset($label) && $label !== '')
        <div class="pdf-label">{{ $label }}</div>
    @endif
    <div class="pdf-value {{ $highlight ? 'pdf-highlight-box' : '' }}">{{ $value }}</div>
</div>
