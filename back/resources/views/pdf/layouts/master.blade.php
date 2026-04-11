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
        <main class="pdf-main">
            @yield('pdf_content')
        </main>
        <footer class="pdf-footer">
            @hasSection('pdf_footer')
                @yield('pdf_footer')
            @elseif(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                @include('pdf.partials.standard_footer', ['lang' => $lang])
            @endif
        </footer>
    </div>
</body>
</html>
