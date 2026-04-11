@php
    $lang = $lang ?? 'en';
    $dir = $lang === 'ar' ? 'rtl' : 'ltr';
    $htmlLang = $lang === 'ar' ? 'ar' : 'en';
    $pdfPageTitle = $pdfPageTitle ?? '';
@endphp
<!DOCTYPE html>
<html lang="{{ $htmlLang }}" dir="{{ $dir }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $pdfPageTitle }}</title>
    @include('pdf.assets.theme')
    @stack('pdf_head')
</head>
<body class="pdf-root">
    <div class="pdf-container pdf-decor">
        <div class="pdf-main">
            @yield('pdf_content')
        </div>
        <div class="pdf-footer" role="contentinfo">
            @hasSection('pdf_footer')
                @yield('pdf_footer')
            @elseif(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                @include('pdf.partials.standard_footer', ['lang' => $lang])
            @endif
        </div>
    </div>
</body>
</html>
