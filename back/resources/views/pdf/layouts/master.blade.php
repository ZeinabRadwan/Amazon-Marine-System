@php
    $pdfLang = isset($lang) && in_array($lang, ['ar', 'en'], true) ? $lang : (str_starts_with((string) app()->getLocale(), 'ar') ? 'ar' : 'en');
    $pdfDir = $pdfLang === 'ar' ? 'rtl' : 'ltr';
@endphp
<!DOCTYPE html>
<html lang="{{ $pdfLang }}" dir="{{ $pdfDir }}">
<head>
    <meta charset="UTF-8">
    <title>@yield('pdf_title', 'Document')</title>
    @include('pdf.assets.theme')
    @stack('pdf_head')
</head>
<body class="pdf-body">
    {{-- Corner gradients removed: mPDF paints fixed radial fades as a pale wash over the top header image. --}}
    @if($pdfHeaderBanner = \App\Support\PdfLogo::headerImgSrc())
        <div class="pdf-page-header">
            <img class="pdf-page-header__img" src="{{ $pdfHeaderBanner }}" alt="">
        </div>
    @endif
    <div class="pdf-container">
        @yield('content')
    </div>
    @stack('pdf_footer_fullbleed')
</body>
</html>
