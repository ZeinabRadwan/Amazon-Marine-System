{{-- Shared PDF tokens + direction; include before document-specific styles. --}}
<style>
    :root {
        --pdf-brand: #1f2a60;
        --pdf-brand-soft: #243056;
        --pdf-accent: #f97316;
        --pdf-text: #0f172a;
        --pdf-muted: #94a3b8;
        --pdf-surface: #eef1f6;
        --pdf-surface-alt: #f1f5f9;
        --pdf-white: #ffffff;
        --pdf-grid-border: #1f2a60;
        --pdf-meta-divider: #364785;
        --pdf-font-size: 10.5px;
        --pdf-font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
        --pdf-invoice-primary: #1f2a60;
        --pdf-invoice-primary-soft: #f8fafc;
        --pdf-invoice-border: #e5e7eb;
        --pdf-invoice-orange: #ff8c00;
        --pdf-invoice-orange-deep: #f57c00;
        --pdf-invoice-charcoal: #333333;
        --pdf-invoice-stripe: #f2f2f2;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
        font-family: var(--pdf-font-family);
        font-size: var(--pdf-font-size);
        color: var(--pdf-text);
        margin: 0;
        padding: 0;
        line-height: 1.45;
        background: var(--pdf-white);
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
