{{-- Shared PDF base; hex literals only — mPDF cannot use CSS var() in many properties (e.g. borders). --}}
<style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
        font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
        font-size: 10.5px;
        color: #0f172a;
        margin: 0;
        padding: 0;
        line-height: 1.45;
        background: #ffffff;
    }
    html[dir="rtl"], html[dir="rtl"] body {
        direction: rtl;
        text-align: right;
    }
    html[dir="ltr"], html[dir="ltr"] body {
        direction: ltr;
        text-align: left;
    }
</style>
