{{-- Modern minimalist invoice (orange / charcoal / soft grey); works with pdf/theme-styles + RTL --}}
<style>
    @font-face {
        font-family: 'Amiri';
        src: url('{{ resource_path('fonts/Amiri-Regular.ttf') }}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }

    body.pdf-invoice {
        font-family: 'DejaVu Sans', 'Amiri', Helvetica, Arial, sans-serif;
        font-size: 10.5px;
        color: #333333;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .pdf-invoice .inv-shell {
        position: relative;
        max-width: 100%;
        padding: 8px 4px 28px;
        background: #ffffff;
    }

    .pdf-invoice .inv-deco-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 4px;
    }
    .pdf-invoice .inv-deco-table td {
        vertical-align: top;
        border: none;
        padding: 0;
        height: 52px;
    }
    .pdf-invoice .inv-deco-tl { width: 45%; }
    .pdf-invoice .inv-deco-br { width: 55%; text-align: right; vertical-align: bottom; }

    .pdf-invoice .inv-header {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 18px;
    }
    .pdf-invoice .inv-header td {
        vertical-align: top;
        border: none;
        padding: 0 8px 0 0;
    }
    .pdf-invoice .inv-header-brand { width: 52%; }
    .pdf-invoice .inv-header-invoice { width: 48%; text-align: right; }

    .pdf-invoice .inv-logo-row { margin-bottom: 8px; }
    .pdf-invoice .inv-logo-circle {
        display: inline-block;
        width: 46px;
        height: 46px;
        line-height: 46px;
        text-align: center;
        border-radius: 50%;
        background: #ff8c00;
        color: #ffffff;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }
    .pdf-invoice .inv-co-block { display: inline-block; vertical-align: middle; margin-left: 10px; }
    html[dir="rtl"] .pdf-invoice .inv-co-block { margin-left: 0; margin-right: 10px; }

    .pdf-invoice .inv-co-name {
        font-size: 16px;
        font-weight: 700;
        color: #333333;
        letter-spacing: 0.04em;
    }
    .pdf-invoice .inv-co-tag {
        font-size: 9.5px;
        color: #666;
        margin-top: 2px;
    }
    .pdf-invoice .inv-contact-strip {
        margin-top: 10px;
        font-size: 8.5px;
        color: #555;
        line-height: 1.6;
    }
    .pdf-invoice .inv-contact-strip .inv-ci {
        display: block;
    }
    .pdf-invoice .inv-contact-strip .inv-ci-dot {
        color: #ff8c00;
        font-weight: 700;
        margin-right: 4px;
    }
    html[dir="rtl"] .pdf-invoice .inv-contact-strip .inv-ci-dot {
        margin-right: 0;
        margin-left: 4px;
    }

    .pdf-invoice .inv-title-main {
        font-size: 28px;
        font-weight: 800;
        color: #222222;
        letter-spacing: 0.12em;
        line-height: 1.1;
        margin: 0 0 10px;
    }
    .pdf-invoice .inv-meta-line {
        font-size: 10px;
        color: #444;
        margin: 3px 0;
    }
    .pdf-invoice .inv-meta-line strong {
        color: #333333;
        font-weight: 700;
    }

    .pdf-invoice .inv-bill-panel {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 20px;
        background: #ff8c00;
        border-radius: 10px;
        overflow: hidden;
    }
    .pdf-invoice .inv-bill-panel td {
        padding: 16px 18px;
        border: none;
        color: #ffffff;
        vertical-align: top;
    }
    .pdf-invoice .inv-bill-label {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        opacity: 0.95;
        margin-bottom: 6px;
    }
    .pdf-invoice .inv-bill-name {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
    }
    .pdf-invoice .inv-bill-sub {
        font-size: 10px;
        opacity: 0.95;
        margin-top: 6px;
        line-height: 1.45;
    }

    .pdf-invoice .inv-items {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 22px;
    }
    .pdf-invoice .inv-items thead th {
        background: #ff8c00;
        color: #ffffff;
        text-align: left;
        padding: 11px 10px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border: none;
    }
    .pdf-invoice .inv-items tbody td {
        padding: 10px;
        border-bottom: 1px solid #e8e8e8;
        vertical-align: top;
        font-size: 10px;
        color: #333333;
    }
    .pdf-invoice .inv-items tbody tr.inv-row-alt td {
        background: #f2f2f2;
    }
    .pdf-invoice .inv-items .inv-num { text-align: right; white-space: nowrap; }
    .pdf-invoice .inv-item-sub {
        font-size: 9px;
        color: #777;
        margin-top: 3px;
    }

    .pdf-invoice .inv-mid {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 18px;
    }
    .pdf-invoice .inv-mid td {
        vertical-align: top;
        border: none;
        padding: 0;
    }
    .pdf-invoice .inv-mid-left {
        width: 50%;
        padding-right: 12px;
    }
    html[dir="rtl"] .pdf-invoice .inv-mid-left {
        padding-right: 0;
        padding-left: 12px;
    }
    .pdf-invoice .inv-mid-right { width: 50%; padding-left: 12px; }
    html[dir="rtl"] .pdf-invoice .inv-mid-right {
        padding-left: 0;
        padding-right: 12px;
    }

    .pdf-invoice .inv-side-card {
        background: #fafafa;
        border: 1px solid #ececec;
        border-radius: 10px;
        padding: 14px 16px;
        min-height: 120px;
    }
    .pdf-invoice .inv-side-card h4 {
        margin: 0 0 8px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #ff8c00;
    }
    .pdf-invoice .inv-side-card p {
        margin: 0 0 12px;
        font-size: 9px;
        color: #555;
        line-height: 1.5;
    }
    .pdf-invoice .inv-side-card p:last-child { margin-bottom: 0; }

    .pdf-invoice .inv-totals-wrap {
        background: #ffffff;
        border: 1px solid #eee;
        border-radius: 10px;
        padding: 12px 14px 14px;
    }
    .pdf-invoice .inv-totals-mini {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 12px;
    }
    .pdf-invoice .inv-totals-mini td {
        padding: 5px 0;
        border: none;
        font-size: 10px;
        color: #444;
    }
    .pdf-invoice .inv-totals-mini .inv-num {
        text-align: right;
        font-weight: 600;
        color: #333333;
    }

    .pdf-invoice .inv-grand-box {
        background: #ff8c00;
        color: #ffffff;
        border-radius: 12px;
        padding: 14px 16px;
        text-align: center;
    }
    .pdf-invoice .inv-grand-label {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        opacity: 0.95;
        margin-bottom: 6px;
    }
    .pdf-invoice .inv-grand-amt {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.02em;
    }

    .pdf-invoice .inv-notes {
        margin: 0 0 18px;
        padding: 12px 14px;
        background: #fafafa;
        border-radius: 8px;
        border: 1px dashed #ddd;
    }
    .pdf-invoice .inv-notes-title {
        font-weight: 800;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #888;
        margin-bottom: 6px;
    }

    .pdf-invoice .inv-bottom {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0 0;
    }
    .pdf-invoice .inv-bottom td {
        vertical-align: bottom;
        border: none;
        padding: 8px 0 0;
    }
    .pdf-invoice .inv-sig-block { text-align: right; width: 42%; }
    html[dir="rtl"] .pdf-invoice .inv-sig-block { text-align: left; }
    .pdf-invoice .inv-sig-line {
        border-bottom: 1px solid #bbb;
        margin-bottom: 6px;
        min-height: 28px;
    }
    .pdf-invoice .inv-sig-label {
        font-size: 9px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .pdf-invoice .inv-footer-meta {
        margin-top: 16px;
        padding-top: 10px;
        border-top: 1px solid #eee;
        font-size: 8.5px;
        color: #999;
        text-align: center;
    }

    html[dir="rtl"] .pdf-invoice .inv-header-invoice { text-align: left; }
    html[dir="rtl"] .pdf-invoice .inv-header-brand { text-align: right; }
    html[dir="rtl"] .pdf-invoice .inv-items thead th { text-align: right; }
    html[dir="rtl"] .pdf-invoice .inv-items .inv-num { text-align: left; }
    html[dir="rtl"] .pdf-invoice .inv-totals-mini .inv-num { text-align: left; }
    html[dir="rtl"] .pdf-invoice .inv-deco-tl { text-align: right; }
    html[dir="rtl"] .pdf-invoice .inv-deco-br { text-align: left; }
</style>
