{{-- Minimalist PDF theme for mPDF: literal colors only, no var(); avoid heavy borders. --}}
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

    * { box-sizing: border-box; }

    .pdf-root {
        margin: 0;
        padding: 0;
        font-family: 'Inter', 'Poppins', 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5px;
        line-height: 1.5;
        color: #444444;
        background-color: #ffffff;
    }

    html[dir="rtl"] body.pdf-root {
        font-family: 'Inter', 'Poppins', 'DejaVu Sans', 'Amiri', 'Tahoma', sans-serif;
    }

    .pdf-container {
        position: relative;
        min-height: 100%;
        padding: 0;
        overflow: hidden;
        background-color: #ffffff;
    }

    .pdf-decor {
        background-color: #ffffff;
    }

    .pdf-wave-wrap {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 0;
        overflow: hidden;
    }

    .pdf-wave-svg {
        display: block;
    }

    .pdf-wave-svg--tl {
        position: absolute;
        top: -8px;
        left: -24px;
        width: 320px;
        height: 130px;
    }

    .pdf-wave-svg--br {
        position: absolute;
        bottom: -16px;
        right: -32px;
        width: 340px;
        height: 150px;
    }

    .pdf-main {
        padding: 8px 16px 12px;
    }

    .pdf-main--layer {
        position: relative;
        z-index: 1;
    }

    .pdf-header {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 18px;
        background-color: #ffffff;
        border-bottom: 1px solid #EEEEEE;
    }

    .pdf-header.pdf-header--custom {
        margin-bottom: 18px;
        border-bottom: none;
    }

    .pdf-header td {
        border: none;
        vertical-align: middle;
        padding: 10px 4px 14px 0;
        color: #333333;
    }

    .pdf-header__logo-cell {
        width: 88px;
        vertical-align: middle;
        padding-right: 12px;
    }

    .pdf-header__logo-img {
        height: 44px;
        width: auto;
        max-width: 84px;
        display: block;
    }

    .pdf-header__logo-fallback {
        width: 56px;
        height: 36px;
        background-color: #FFF5EB;
        border: 1px solid #FF8C00;
        text-align: center;
        line-height: 34px;
        font-size: 10px;
        font-weight: 700;
        color: #FF8C00;
    }

    .pdf-header__brand-line {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #222222;
    }

    .pdf-header__brand-sep {
        color: #FF8C00;
        font-weight: 400;
        padding: 0 0.3em;
    }

    .pdf-header__brand-tag {
        font-size: 9px;
        font-weight: 500;
        color: #888888;
        letter-spacing: 0.02em;
    }

    .pdf-header__title-wrap {
        width: 36%;
        text-align: right;
        vertical-align: middle;
    }

    [dir="rtl"] .pdf-header__title-wrap {
        text-align: left;
    }

    .pdf-header__title {
        font-size: 12px;
        font-weight: 700;
        color: #333333;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .pdf-header__subtitle {
        font-size: 9px;
        font-weight: 500;
        color: #888888;
        margin-top: 4px;
        letter-spacing: 0.04em;
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
        border-collapse: separate;
        border-spacing: 8px;
        margin: 4px 0 0 0;
        background-color: transparent;
        border: none;
    }

    .pdf-meta-panel td {
        border: 1px solid #EEEEEE;
        padding: 10px 12px;
        vertical-align: top;
        width: 50%;
        font-size: 10px;
        color: #444444;
        background-color: #F9F9F9;
    }

    .pdf-meta-label {
        display: block;
        font-size: 8px;
        font-weight: 600;
        color: #999999;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 4px;
    }

    .pdf-meta-strong {
        font-weight: 600;
        color: #555555;
        font-size: 9px;
    }

    .pdf-meta-val {
        color: #333333;
    }

    .pdf-capsule {
        display: inline-block;
        margin-top: 2px;
        padding: 5px 14px;
        font-size: 11px;
        font-weight: 700;
        color: #333333;
        background-color: #ffffff;
        border: 1px solid #EEEEEE;
        border-radius: 20px;
    }

    .pdf-capsule--accent {
        background-color: #FFF5EB;
        border-color: #FFD4A8;
        color: #CC6600;
    }

    .pdf-section {
        margin: 0 0 16px;
    }

    .pdf-section__title {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #333333;
        background-color: #FFF8F0;
        margin: 0 0 0 0;
        padding: 9px 14px;
        border-left: 4px solid #FF8C00;
        border-radius: 6px;
    }

    [dir="rtl"] .pdf-section__title {
        border-left: none;
        border-right: 4px solid #FF8C00;
    }

    .pdf-grid {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .pdf-grid th,
    .pdf-grid td {
        border: none;
        border-bottom: 1px solid #EEEEEE;
        padding: 10px 8px;
        vertical-align: top;
    }

    .pdf-grid th {
        background-color: #FAFAFA;
        font-size: 8.5px;
        font-weight: 700;
        color: #888888;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-bottom: 2px solid #EEEEEE;
    }

    [dir="rtl"] .pdf-grid th {
        text-align: right;
    }

    .pdf-grid td {
        font-size: 10px;
        color: #444444;
        background-color: #ffffff;
    }

    .pdf-grid tbody tr:nth-child(even) td {
        background-color: #F9F9F9;
    }

    .pdf-grid--flush-top {
        margin-top: 0;
    }

    .pdf-label-strong {
        font-weight: 600;
        color: #333333;
    }

    .pdf-muted {
        color: #999999;
    }

    .pdf-block-text {
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .pdf-notes-block {
        border: 1px solid #EEEEEE;
        background-color: #FCFCFC;
        padding: 12px 14px;
        font-size: 10px;
        line-height: 1.55;
        color: #444444;
        border-radius: 6px;
    }

    .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 18px;
    }

    .pdf-table th,
    .pdf-table td {
        border: none;
        border-bottom: 1px solid #EEEEEE;
        padding: 11px 10px;
        vertical-align: top;
    }

    .pdf-table th {
        background-color: #FF8C00;
        color: #ffffff;
        font-size: 9px;
        font-weight: 700;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: none;
    }

    [dir="rtl"] .pdf-table th {
        text-align: right;
    }

    .pdf-table--zebra tbody tr:nth-child(even) td {
        background-color: #F9F9F9;
    }

    .pdf-table tbody td {
        background-color: #ffffff;
        color: #444444;
    }

    .pdf-text-end {
        text-align: right;
    }

    [dir="rtl"] .pdf-text-end {
        text-align: left;
    }

    .pdf-invoice-shell {
        border: 1px solid #EEEEEE;
        padding: 24px;
        background-color: #ffffff;
        border-radius: 8px;
    }

    .pdf-invoice-header-table {
        width: 100%;
        margin-bottom: 24px;
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
        font-size: 18px;
        font-weight: 700;
        color: #222222;
        margin-bottom: 4px;
    }

    .pdf-invoice-meta {
        width: 50%;
        text-align: right;
    }

    .pdf-invoice-meta > div {
        margin-bottom: 10px;
    }

    [dir="rtl"] .pdf-invoice-meta {
        text-align: left;
    }

    .pdf-invoice-doc-title {
        font-size: 28px;
        font-weight: 700;
        color: #FF8C00;
        margin-bottom: 10px;
        letter-spacing: 0.03em;
    }

    .pdf-party-table {
        width: 100%;
        margin-bottom: 22px;
        border-collapse: collapse;
    }

    .pdf-party-table td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-party-box {
        width: 100%;
        border: 1px solid #EEEEEE;
        padding: 16px;
        background-color: #F9F9F9;
        border-radius: 8px;
    }

    .pdf-party-label {
        font-size: 8px;
        color: #999999;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 8px;
    }

    .pdf-party-name {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #222222;
    }

    .pdf-totals-wrap {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
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
        padding: 6px 0;
        border: none;
        border-bottom: 1px solid #EEEEEE;
        font-size: 10px;
        color: #555555;
    }

    .pdf-total-box {
        margin-top: 12px;
        padding: 12px 22px;
        background-color: #FF8C00;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        border-radius: 28px;
    }

    .pdf-total-box td {
        color: #ffffff;
        border: none;
        padding: 0;
    }

    table.pdf-total-box {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
    }

    .pdf-notes-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #EEEEEE;
    }

    .pdf-notes-section__title {
        font-weight: 700;
        margin-bottom: 8px;
        color: #999999;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .pdf-footer {
        margin-top: 8px;
        padding: 16px 16px 14px;
        background-color: #ffffff;
        border-top: 1px solid #EEEEEE;
        font-size: 9px;
        color: #666666;
    }

    .pdf-footer--layer {
        position: relative;
        z-index: 1;
    }

    .pdf-footer__heading {
        font-weight: 700;
        color: #222222;
        margin: 0 0 12px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .pdf-footer__row {
        margin: 0 0 8px 0;
        vertical-align: middle;
    }

    .pdf-footer__row-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 6px 0;
    }

    .pdf-footer__row-table td {
        border: none;
        padding: 4px 0;
        vertical-align: middle;
        font-size: 9.5px;
        color: #444444;
    }

    .pdf-footer__icon-cell {
        width: 28px;
        padding-right: 8px;
        vertical-align: middle;
    }

    [dir="rtl"] .pdf-footer__icon-cell {
        padding-right: 0;
        padding-left: 8px;
    }

    .pdf-footer__generated {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid #EEEEEE;
        font-size: 8px;
        color: #AAAAAA;
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
        color: #666666;
        font-style: italic;
    }

    .pdf-item-desc-sub {
        font-size: 8.5px;
        color: #999999;
        margin-top: 2px;
    }
</style>
