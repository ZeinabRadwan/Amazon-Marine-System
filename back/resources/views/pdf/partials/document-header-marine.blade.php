{{-- Shared dark header + meta strip for Shipment / SD PDFs (mPDF-safe: literal colors, table layout). --}}
@php
    $documentSubtitle = $documentSubtitle ?? null;
    $metaCells = $metaCells ?? [];
@endphp
<table class="pdf-header" cellpadding="0" cellspacing="0" border="0">
    <tr>
        <td colspan="3" class="pdf-header__row pdf-header__row--brand">
            <table class="pdf-header-inner" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                    <td class="pdf-header__logo-cell">
                        @if(!empty($logoSrc))
                            <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                        @else
                            <div class="pdf-header__logo-fallback">{{ $mhPlaceholder ?? 'MH' }}</div>
                        @endif
                    </td>
                    <td class="pdf-header__brand-cell">
                        <span class="pdf-header__brand-line">{{ $brand }}</span><span class="pdf-header__brand-sep">|</span><span class="pdf-header__brand-tag"> {{ $tagline }}</span>
                    </td>
                    <td class="pdf-header__title-wrap">
                        <div class="pdf-header__title">{{ $documentTitle }}</div>
                        @if(filled($documentSubtitle))
                            <div class="pdf-header__subtitle">{{ $documentSubtitle }}</div>
                        @endif
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td colspan="3" class="pdf-header__row pdf-header__row--meta">
            <table class="pdf-header-meta" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                    @foreach(array_slice($metaCells, 0, 2) as $cell)
                        <td class="pdf-header-meta__cell" width="50%">
                            @include('pdf.components.field', [
                                'label' => $cell['label'] ?? '',
                                'value' => $cell['value'] ?? '—',
                                'highlight' => !empty($cell['highlight']),
                            ])
                        </td>
                    @endforeach
                </tr>
                <tr>
                    @foreach(array_slice($metaCells, 2, 2) as $cell)
                        <td class="pdf-header-meta__cell" width="50%">
                            @include('pdf.components.field', [
                                'label' => $cell['label'] ?? '',
                                'value' => $cell['value'] ?? '—',
                                'highlight' => !empty($cell['highlight']),
                            ])
                        </td>
                    @endforeach
                </tr>
            </table>
        </td>
    </tr>
</table>
