{{-- Unified PDF theme (mPDF). Design: primary #FF8C00, secondary #F2F2F2, text #333. Fonts: DejaVu Sans (mPDF); Amiri optional for Arabic when embedded. --}}
@php
    $amiriPath = resource_path('fonts/Amiri-Regular.ttf');
    $amiriUrl = is_file($amiriPath) ? 'file://'.str_replace('\\', '/', $amiriPath) : '';
@endphp
<style>
    @if($amiriUrl !== '')
    @font-face {
        font-family: 'Amiri';
        src: url('{{ $amiriUrl }}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    @endif

    :root {
        --pdf-primary: #FF8C00;
        --pdf-primary-dark: #e67e00;
        --pdf-secondary: #F2F2F2;
        --pdf-text: #333333;
        --pdf-border: #dddddd;
        --pdf-white: #ffffff;
        --pdf-muted: #666666;
    }

    * { box-sizing: border-box; }

    .pdf-root {
        margin: 0;
        padding: 0;
        font-family: 'DejaVu Sans', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5px;
        line-height: 1.45;
        color: var(--pdf-text);
        background: var(--pdf-white);
    }

    html[dir="rtl"] body.pdf-root {
        font-family: 'DejaVu Sans', 'Amiri', 'Tahoma', sans-serif;
    }

    .pdf-container {
        position: relative;
        min-height: 100%;
        padding: 0;
        overflow: hidden;
    }

    .pdf-decor {
        background-color: var(--pdf-white);
        background-image:
            radial-gradient(ellipse 140% 90% at 0% 0%, rgba(255, 140, 0, 0.14) 0%, transparent 55%),
            radial-gradient(ellipse 120% 80% at 100% 100%, rgba(255, 140, 0, 0.11) 0%, transparent 52%);
    }

    .pdf-main {
        padding: 0 12px 8px;
    }

    .pdf-header {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 14px;
        background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
        border-bottom: 3px solid var(--pdf-primary);
    }

    .pdf-header.pdf-header--custom {
        margin-bottom: 14px;
        background: transparent;
        border-bottom: none;
    }

    .pdf-header td {
        border: none;
        vertical-align: middle;
        padding: 12px 14px;
        color: var(--pdf-white);
    }

    .pdf-header__logo-cell {
        width: 88px;
        vertical-align: middle;
    }

    .pdf-header__logo-img {
        height: 44px;
        width: auto;
        max-width: 84px;
        display: block;
    }

    .pdf-header__logo-fallback {
        width: 64px;
        height: 40px;
        background: var(--pdf-white);
        border: 2px solid var(--pdf-primary);
        text-align: center;
        line-height: 36px;
        font-size: 11px;
        font-weight: 700;
        color: var(--pdf-primary);
    }

    .pdf-header__brand-line {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--pdf-white);
    }

    .pdf-header__brand-sep {
        color: var(--pdf-primary);
        font-weight: 400;
        padding: 0 0.35em;
    }

    .pdf-header__brand-tag {
        font-size: 9.5px;
        font-weight: 400;
        color: #e5e5e5;
    }

    .pdf-header__title-wrap {
        width: 34%;
        text-align: end;
    }

    [dir="rtl"] .pdf-header__title-wrap {
        text-align: start;
    }

    .pdf-header__title {
        font-size: 13px;
        font-weight: 700;
        color: var(--pdf-white);
        letter-spacing: 0.04em;
    }

    .pdf-header__subtitle {
        font-size: 10px;
        font-weight: 600;
        color: #f0f0f0;
        margin-top: 3px;
    }

    .pdf-header-inner {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-header-inner td {
        padding: 0;
        border: none;
    }

    .pdf-meta-panel {
        width: 100%;
        border-collapse: collapse;
        background: #3a3a3a;
        border: 1px solid var(--pdf-primary);
    }

    .pdf-meta-panel td {
        border: none;
        padding: 8px 12px;
        vertical-align: top;
        width: 50%;
        font-size: 10px;
        color: var(--pdf-white);
    }

    .pdf-meta-panel tr + tr td {
        border-top: 1px solid #555555;
    }

    .pdf-meta-panel td + td {
        border-inline-start: 1px solid #555555;
    }

    .pdf-meta-icon {
        display: inline-block;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        background: var(--pdf-primary);
        color: var(--pdf-white);
        font-size: 8px;
        font-weight: 700;
        margin-inline-end: 8px;
        vertical-align: middle;
    }

    .pdf-meta-strong {
        font-weight: 600;
        color: var(--pdf-white);
    }

    .pdf-meta-val {
        color: #eeeeee;
    }

    .pdf-section {
        margin: 0 0 12px;
    }

    .pdf-section__title {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--pdf-white);
        background: var(--pdf-primary);
        margin: 0;
        padding: 7px 10px;
        border-inline-start: 4px solid #2a2a2a;
    }

    .pdf-grid {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .pdf-grid th,
    .pdf-grid td {
        border: 1px solid #444444;
        padding: 7px 8px;
        vertical-align: top;
    }

    .pdf-grid th {
        background: var(--pdf-secondary);
        font-size: 9px;
        font-weight: 700;
        color: var(--pdf-text);
        text-align: start;
    }

    .pdf-grid td {
        font-size: 10px;
        color: var(--pdf-text);
        background: var(--pdf-white);
    }

    .pdf-grid--flush-top {
        margin-top: -1px;
    }

    .pdf-label-strong {
        font-weight: 600;
        color: var(--pdf-text);
    }

    .pdf-muted {
        color: var(--pdf-muted);
    }

    .pdf-block-text {
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .pdf-notes-block {
        border: 1px solid #444444;
        border-top: none;
        background: var(--pdf-secondary);
        padding: 8px 10px;
        font-size: 10px;
        line-height: 1.5;
        color: var(--pdf-text);
    }

    .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 16px;
    }

    .pdf-table th,
    .pdf-table td {
        border: 1px solid var(--pdf-border);
        padding: 8px 10px;
        vertical-align: top;
    }

    .pdf-table th {
        background: var(--pdf-secondary);
        font-size: 9.5px;
        font-weight: 700;
        color: var(--pdf-text);
        text-align: start;
    }

    .pdf-table--zebra tbody tr:nth-child(even) td {
        background: #fafafa;
    }

    .pdf-table tbody td {
        background: var(--pdf-white);
    }

    .pdf-text-end {
        text-align: end;
    }

    [dir="rtl"] .pdf-text-end {
        text-align: start;
    }

    .pdf-invoice-shell {
        border: 1px solid var(--pdf-border);
        padding: 22px;
        background: var(--pdf-white);
    }

    .pdf-invoice-header-table {
        width: 100%;
        margin-bottom: 22px;
        border-collapse: collapse;
    }

    .pdf-invoice-header-table td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-invoice-company {
        width: 50%;
    }

    .pdf-invoice-company-name {
        font-size: 17px;
        font-weight: 700;
        color: var(--pdf-text);
        margin-bottom: 4px;
    }

    .pdf-invoice-meta {
        width: 50%;
        text-align: end;
    }

    [dir="rtl"] .pdf-invoice-meta {
        text-align: start;
    }

    .pdf-invoice-doc-title {
        font-size: 26px;
        font-weight: 700;
        color: var(--pdf-primary);
        margin-bottom: 8px;
        letter-spacing: 0.02em;
    }

    .pdf-party-table {
        width: 100%;
        margin-bottom: 20px;
        border-collapse: collapse;
    }

    .pdf-party-table td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-party-box {
        width: 100%;
        border: 1px solid var(--pdf-border);
        padding: 14px;
        background: var(--pdf-secondary);
    }

    .pdf-party-label {
        font-size: 9px;
        color: var(--pdf-muted);
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 6px;
    }

    .pdf-party-name {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 4px;
        color: var(--pdf-text);
    }

    .pdf-totals-wrap {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
    }

    .pdf-totals-wrap td {
        border: none;
        vertical-align: top;
        padding: 0;
    }

    .pdf-totals-inner {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-totals-inner td {
        padding: 5px 0;
        border: none;
    }

    .pdf-total-box {
        margin-top: 10px;
        padding: 12px 14px;
        background: var(--pdf-primary);
        color: var(--pdf-white);
        border-radius: 8px;
        font-size: 15px;
        font-weight: 700;
    }

    .pdf-total-box td {
        color: var(--pdf-white);
        border: none;
        padding: 0;
    }

    table.pdf-total-box {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
    }

    .pdf-notes-section {
        margin-top: 22px;
        padding-top: 14px;
        border-top: 1px dashed var(--pdf-border);
    }

    .pdf-notes-section__title {
        font-weight: 700;
        margin-bottom: 6px;
        color: var(--pdf-muted);
        font-size: 10px;
        text-transform: uppercase;
    }

    .pdf-footer {
        margin-top: 14px;
        padding: 12px 14px;
        background: var(--pdf-secondary);
        border-top: 3px solid var(--pdf-primary);
        font-size: 9px;
        color: var(--pdf-muted);
    }

    .pdf-footer__heading {
        font-weight: 700;
        color: var(--pdf-text);
        margin: 0 0 6px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .pdf-footer p {
        margin: 3px 0;
    }

    .pdf-footer__key {
        font-weight: 600;
        color: var(--pdf-text);
    }

    .pdf-footer__generated {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid var(--pdf-border);
        font-size: 8.5px;
        color: #888888;
    }

    .pdf-col-20 { width: 20%; }
    .pdf-col-22 { width: 22%; }
    .pdf-col-25 { width: 25%; }
    .pdf-col-32 { width: 32%; }
    .pdf-col-33 { width: 33.33%; }
    .pdf-col-37 { width: 37.5%; }
    .pdf-col-40 { width: 40%; }
    .pdf-col-60 { width: 60%; }
    .pdf-col-68 { width: 68%; }

    .pdf-italic-muted {
        color: var(--pdf-text);
        font-style: italic;
    }

    .pdf-item-desc-sub {
        font-size: 9px;
        color: var(--pdf-muted);
    }

</style>
